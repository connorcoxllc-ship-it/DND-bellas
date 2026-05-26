// Integration tests for the database layer. Runs against POSTGRES_URL.
// Mirrors the SQL used by src/lib/db.ts, src/lib/auth.ts and src/lib/queries.ts.
import postgres from "postgres";
import bcrypt from "bcryptjs";

const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("POSTGRES_URL not set");
  process.exit(1);
}
const sql = postgres(url, { prepare: false, ssl: url.includes("sslmode=disable") ? false : undefined });

const nid = (() => { let n = 0; return (p) => `${p}_${++n}_${Date.now()}`; })();
let pass = 0, fail = 0;
function check(name, cond) { if (cond) { pass++; console.log("  ok:", name); } else { fail++; console.log("  FAIL:", name); } }

async function migrate() {
  await sql`CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL, display_name text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS campaigns (id text PRIMARY KEY, name text NOT NULL, join_code text UNIQUE NOT NULL, owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS campaign_members (campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'player', joined_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (campaign_id, user_id))`;
  await sql`CREATE TABLE IF NOT EXISTS characters (id text PRIMARY KEY, owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, campaign_id text REFERENCES campaigns(id) ON DELETE SET NULL, name text NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`;
}
async function registerUser(email, password, displayName) {
  const normEmail = email.trim().toLowerCase();
  if ((await sql`SELECT id FROM users WHERE email = ${normEmail} LIMIT 1`).length > 0) return { ok: false };
  const id = nid("u");
  await sql`INSERT INTO users (id, email, password_hash, display_name) VALUES (${id}, ${normEmail}, ${await bcrypt.hash(password, 10)}, ${displayName.trim()})`;
  return { ok: true, userId: id };
}
async function verifyLogin(email, password) {
  const rows = await sql`SELECT id, password_hash FROM users WHERE email = ${email.trim().toLowerCase()} LIMIT 1`;
  if (rows.length === 0) return { ok: false };
  return { ok: await bcrypt.compare(password, rows[0].password_hash), userId: rows[0].id };
}
async function createCampaign(userId, name) {
  const id = nid("c"); const code = nid("CODE").toUpperCase();
  await sql`INSERT INTO campaigns (id, name, join_code, owner_id) VALUES (${id}, ${name}, ${code}, ${userId})`;
  await sql`INSERT INTO campaign_members (campaign_id, user_id, role) VALUES (${id}, ${userId}, 'dm')`;
  return { id, code };
}
async function joinCampaign(userId, code) {
  const rows = await sql`SELECT id FROM campaigns WHERE join_code = ${code} LIMIT 1`;
  if (rows.length === 0) return { ok: false };
  await sql`INSERT INTO campaign_members (campaign_id, user_id, role) VALUES (${rows[0].id}, ${userId}, 'player') ON CONFLICT (campaign_id, user_id) DO NOTHING`;
  return { ok: true };
}
async function createCharacter(userId, name, campaignId) {
  const id = nid("ch");
  await sql`INSERT INTO characters (id, owner_id, campaign_id, name, data) VALUES (${id}, ${userId}, ${campaignId}, ${name}, ${sql.json({ name, classes: [{ name: "Fighter", level: 3 }] })})`;
  return id;
}
async function listVisibleCharacters(userId) {
  return sql`SELECT DISTINCT ch.id, ch.name, ch.data, u.display_name AS owner_name FROM characters ch JOIN users u ON u.id = ch.owner_id LEFT JOIN campaign_members m ON m.campaign_id = ch.campaign_id WHERE ch.owner_id = ${userId} OR m.user_id = ${userId} ORDER BY ch.name`;
}

try {
  await sql`DROP TABLE IF EXISTS characters, campaign_members, campaigns, users CASCADE`;
  await migrate();
  check("schema created", true);

  const a = await registerUser("Alice@Test.com", "secret1", "Alice");
  check("register", a.ok);
  check("duplicate email rejected", !(await registerUser("alice@test.com", "x", "A2")).ok);
  const b = await registerUser("bob@test.com", "secret2", "Bob");
  const c = await registerUser("carol@test.com", "secret3", "Carol");
  check("login good", (await verifyLogin("alice@test.com", "secret1")).ok);
  check("login bad", !(await verifyLogin("alice@test.com", "nope")).ok);

  const camp = await createCampaign(a.userId, "Lost Mine");
  check("join by code", (await joinCampaign(b.userId, camp.code)).ok);
  check("bad code", !(await joinCampaign(c.userId, "NOPE")).ok);

  const aliraId = await createCharacter(a.userId, "Alira", camp.id);
  await createCharacter(b.userId, "Borin", camp.id);
  await createCharacter(c.userId, "Cora", null);

  check("jsonb round-trip", (await sql`SELECT data FROM characters WHERE id=${aliraId}`)[0].data.classes[0].level === 3);
  check("alice sees party", JSON.stringify((await listVisibleCharacters(a.userId)).map((x) => x.name)) === JSON.stringify(["Alira", "Borin"]));
  check("bob sees party", JSON.stringify((await listVisibleCharacters(b.userId)).map((x) => x.name)) === JSON.stringify(["Alira", "Borin"]));
  check("carol sees only private own", JSON.stringify((await listVisibleCharacters(c.userId)).map((x) => x.name)) === JSON.stringify(["Cora"]));
  check("owner_name join", (await listVisibleCharacters(b.userId)).every((x) => x.owner_name));
} catch (e) {
  console.error("ERROR", e);
  fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await sql.end();
  process.exit(fail ? 1 : 0);
}
