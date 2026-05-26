import "server-only";
import { nanoid } from "nanoid";
import { sql, ensureSchema } from "./db";
import { CharacterData, defaultCharacter, normalizeCharacter } from "./dnd/character";

export interface CampaignRow {
  id: string;
  name: string;
  join_code: string;
  owner_id: string;
  role: string;
}

export interface CharacterRow {
  id: string;
  owner_id: string;
  campaign_id: string | null;
  name: string;
  data: CharacterData;
  updated_at: string;
  owner_name?: string;
}

function shortCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

export async function listCampaignsForUser(userId: string): Promise<CampaignRow[]> {
  await ensureSchema();
  return sql<CampaignRow[]>`
    SELECT c.id, c.name, c.join_code, c.owner_id, m.role
    FROM campaigns c
    JOIN campaign_members m ON m.campaign_id = c.id
    WHERE m.user_id = ${userId}
    ORDER BY c.created_at ASC
  `;
}

export async function createCampaign(userId: string, name: string): Promise<CampaignRow> {
  await ensureSchema();
  const id = nanoid();
  let code = shortCode();
  // Ensure uniqueness of the join code.
  for (let i = 0; i < 5; i++) {
    const clash = await sql`SELECT 1 FROM campaigns WHERE join_code = ${code} LIMIT 1`;
    if (clash.length === 0) break;
    code = shortCode();
  }
  await sql`
    INSERT INTO campaigns (id, name, join_code, owner_id)
    VALUES (${id}, ${name.trim() || "Untitled Campaign"}, ${code}, ${userId})
  `;
  await sql`
    INSERT INTO campaign_members (campaign_id, user_id, role)
    VALUES (${id}, ${userId}, 'dm')
  `;
  return { id, name: name.trim() || "Untitled Campaign", join_code: code, owner_id: userId, role: "dm" };
}

export async function joinCampaign(
  userId: string,
  code: string
): Promise<{ ok: true; campaign: CampaignRow } | { ok: false; error: string }> {
  await ensureSchema();
  const rows = await sql<{ id: string; name: string; join_code: string; owner_id: string }[]>`
    SELECT id, name, join_code, owner_id FROM campaigns WHERE join_code = ${code.trim().toUpperCase()} LIMIT 1
  `;
  if (rows.length === 0) return { ok: false, error: "No campaign found with that code." };
  const c = rows[0];
  await sql`
    INSERT INTO campaign_members (campaign_id, user_id, role)
    VALUES (${c.id}, ${userId}, 'player')
    ON CONFLICT (campaign_id, user_id) DO NOTHING
  `;
  return { ok: true, campaign: { ...c, role: c.owner_id === userId ? "dm" : "player" } };
}

export async function isMember(userId: string, campaignId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM campaign_members WHERE campaign_id = ${campaignId} AND user_id = ${userId} LIMIT 1
  `;
  return rows.length > 0;
}

export interface CampaignMemberInfo {
  user_id: string;
  display_name: string;
  role: string;
}

export async function listCampaignMembers(campaignId: string): Promise<CampaignMemberInfo[]> {
  return sql<CampaignMemberInfo[]>`
    SELECT m.user_id, u.display_name, m.role
    FROM campaign_members m
    JOIN users u ON u.id = m.user_id
    WHERE m.campaign_id = ${campaignId}
    ORDER BY m.role DESC, u.display_name ASC
  `;
}

// All characters the user is allowed to see: their own + any in campaigns they
// belong to.
export async function listVisibleCharacters(userId: string): Promise<CharacterRow[]> {
  await ensureSchema();
  const rows = await sql<CharacterRow[]>`
    SELECT DISTINCT ch.id, ch.owner_id, ch.campaign_id, ch.name, ch.data, ch.updated_at,
           u.display_name AS owner_name
    FROM characters ch
    JOIN users u ON u.id = ch.owner_id
    LEFT JOIN campaign_members m ON m.campaign_id = ch.campaign_id
    WHERE ch.owner_id = ${userId}
       OR m.user_id = ${userId}
    ORDER BY ch.updated_at DESC
  `;
  return rows.map((r) => ({ ...r, data: normalizeCharacter(r.data) }));
}

export async function getCharacter(
  userId: string,
  characterId: string
): Promise<{ row: CharacterRow; canEdit: boolean } | null> {
  await ensureSchema();
  const rows = await sql<CharacterRow[]>`
    SELECT ch.id, ch.owner_id, ch.campaign_id, ch.name, ch.data, ch.updated_at,
           u.display_name AS owner_name
    FROM characters ch
    JOIN users u ON u.id = ch.owner_id
    WHERE ch.id = ${characterId}
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  const row = rows[0];
  const canEdit = row.owner_id === userId;
  const visible = canEdit || (row.campaign_id ? await isMember(userId, row.campaign_id) : false);
  if (!visible) return null;
  return { row: { ...row, data: normalizeCharacter(row.data) }, canEdit };
}

export async function createCharacter(
  userId: string,
  name: string,
  campaignId: string | null
): Promise<string> {
  await ensureSchema();
  const id = nanoid();
  const data = defaultCharacter(name || "New Adventurer");
  data.name = name || "New Adventurer";
  if (campaignId) {
    const member = await isMember(userId, campaignId);
    if (!member) campaignId = null;
  }
  await sql`
    INSERT INTO characters (id, owner_id, campaign_id, name, data)
    VALUES (${id}, ${userId}, ${campaignId}, ${data.name}, ${sql.json(data as any)})
  `;
  return id;
}

export async function saveCharacter(
  userId: string,
  characterId: string,
  data: CharacterData,
  campaignId: string | null
): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  const owned = await sql`SELECT owner_id FROM characters WHERE id = ${characterId} LIMIT 1`;
  if (owned.length === 0) return { ok: false, error: "Character not found." };
  if ((owned[0] as any).owner_id !== userId) {
    return { ok: false, error: "You can only edit your own character." };
  }
  if (campaignId) {
    const member = await isMember(userId, campaignId);
    if (!member) campaignId = null;
  }
  await sql`
    UPDATE characters
    SET data = ${sql.json(data as any)}, name = ${data.name}, campaign_id = ${campaignId}, updated_at = now()
    WHERE id = ${characterId}
  `;
  return { ok: true };
}

export async function deleteCharacter(userId: string, characterId: string): Promise<boolean> {
  await ensureSchema();
  const res = await sql`DELETE FROM characters WHERE id = ${characterId} AND owner_id = ${userId}`;
  return res.count > 0;
}
