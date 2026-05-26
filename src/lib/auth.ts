import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { sql, ensureSchema } from "./db";

const COOKIE_NAME = "dnd_session";
const DAY = 60 * 60 * 24;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
  return new TextEncoder().encode(s);
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function setSession(userId: string): Promise<void> {
  const token = await createSessionToken(userId);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAY * 30,
  });
}

export function clearSession(): void {
  cookies().set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  let uid: string;
  try {
    const { payload } = await jwtVerify(token, secret());
    uid = payload.uid as string;
  } catch {
    return null;
  }
  if (!uid) return null;
  await ensureSchema();
  const rows = await sql<
    { id: string; email: string; display_name: string }[]
  >`SELECT id, email, display_name FROM users WHERE id = ${uid} LIMIT 1`;
  if (rows.length === 0) return null;
  return {
    id: rows[0].id,
    email: rows[0].email,
    displayName: rows[0].display_name,
  };
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  await ensureSchema();
  const normEmail = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normEmail)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  if (!displayName.trim()) {
    return { ok: false, error: "Please enter a display name." };
  }
  const existing = await sql`SELECT id FROM users WHERE email = ${normEmail} LIMIT 1`;
  if (existing.length > 0) {
    return { ok: false, error: "An account with that email already exists." };
  }
  const id = nanoid();
  const hash = await hashPassword(password);
  await sql`
    INSERT INTO users (id, email, password_hash, display_name)
    VALUES (${id}, ${normEmail}, ${hash}, ${displayName.trim()})
  `;
  return { ok: true, userId: id };
}

export async function verifyLogin(
  email: string,
  password: string
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  await ensureSchema();
  const normEmail = email.trim().toLowerCase();
  const rows = await sql<{ id: string; password_hash: string }[]>`
    SELECT id, password_hash FROM users WHERE email = ${normEmail} LIMIT 1
  `;
  if (rows.length === 0) {
    return { ok: false, error: "Invalid email or password." };
  }
  const match = await bcrypt.compare(password, rows[0].password_hash);
  if (!match) {
    return { ok: false, error: "Invalid email or password." };
  }
  return { ok: true, userId: rows[0].id };
}
