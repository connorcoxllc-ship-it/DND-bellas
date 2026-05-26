import postgres from "postgres";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  "";

declare global {
  // eslint-disable-next-line no-var
  var _sql: ReturnType<typeof postgres> | undefined;
  // eslint-disable-next-line no-var
  var _schemaReady: Promise<void> | undefined;
}

function createClient() {
  if (!connectionString) {
    throw new Error(
      "No database connection string found. Set POSTGRES_URL (Vercel Postgres) or DATABASE_URL."
    );
  }
  return postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    ssl: connectionString.includes("sslmode=disable") ? false : "require",
    prepare: false,
  });
}

function getClient(): ReturnType<typeof postgres> {
  if (!global._sql) global._sql = createClient();
  return global._sql;
}

// Lazy proxy: the real connection is only created on first query, so importing
// this module (e.g. during `next build` page-data collection) never requires a
// live database.
export const sql = new Proxy(function () {} as unknown as ReturnType<typeof postgres>, {
  apply(_target, _thisArg, args: unknown[]) {
    // Tagged-template call: sql`...`
    return (getClient() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});

// Idempotent schema creation. Runs once per server instance so the app "just
// works" after connecting a database, with no manual migration step.
async function migrate(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      display_name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS campaigns (
      id text PRIMARY KEY,
      name text NOT NULL,
      join_code text UNIQUE NOT NULL,
      owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS campaign_members (
      campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'player',
      joined_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (campaign_id, user_id)
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS characters (
      id text PRIMARY KEY,
      owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_id text REFERENCES campaigns(id) ON DELETE SET NULL,
      name text NOT NULL,
      data jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_characters_owner ON characters(owner_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_characters_campaign ON characters(campaign_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_members_user ON campaign_members(user_id);`;
}

export function ensureSchema(): Promise<void> {
  if (!global._schemaReady) {
    global._schemaReady = migrate().catch((e) => {
      // Reset so a later request can retry after a transient failure.
      global._schemaReady = undefined;
      throw e;
    });
  }
  return global._schemaReady;
}
