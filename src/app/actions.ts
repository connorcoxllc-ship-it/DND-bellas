"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  registerUser,
  verifyLogin,
  setSession,
  clearSession,
  getCurrentUser,
} from "@/lib/auth";
import {
  createCampaign,
  joinCampaign,
  createCharacter,
  saveCharacter,
  deleteCharacter,
  updateCampaignData,
  saveUserPrefs,
} from "@/lib/queries";
import type { CharacterData } from "@/lib/dnd/character";
import type { CampaignData, UserPrefs } from "@/lib/dnd/dashboard";

export type ActionState = { error?: string; ok?: boolean } | null;

export async function registerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "");
  const res = await registerUser(email, password, displayName);
  if (!res.ok) return { error: res.error };
  await setSession(res.userId);
  redirect("/dashboard");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const res = await verifyLogin(email, password);
  if (!res.ok) return { error: res.error };
  await setSession(res.userId);
  redirect("/dashboard");
}

export async function logoutAction() {
  clearSession();
  redirect("/login");
}

export async function createCampaignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") || "");
  await createCampaign(user.id, name);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function joinCampaignAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const code = String(formData.get("code") || "");
  const res = await joinCampaign(user.id, code);
  if (!res.ok) return { error: res.error };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function createCharacterAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const name = String(formData.get("name") || "New Adventurer");
  const campaignId = String(formData.get("campaignId") || "") || null;
  const id = await createCharacter(user.id, name, campaignId);
  redirect(`/character/${id}`);
}

export async function saveCharacterAction(
  characterId: string,
  data: CharacterData,
  campaignId: string | null
) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const res = await saveCharacter(user.id, characterId, data, campaignId);
  if (res.ok) revalidatePath(`/character/${characterId}`);
  return res;
}

export async function deleteCharacterAction(characterId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await deleteCharacter(user.id, characterId);
  redirect("/dashboard");
}

export async function saveCampaignDataAction(campaignId: string, data: CampaignData) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const res = await updateCampaignData(user.id, campaignId, data);
  if (res.ok) revalidatePath(`/campaign/${campaignId}`);
  return res;
}

export async function saveUserPrefsAction(prefs: UserPrefs) {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  await saveUserPrefs(user.id, prefs);
  revalidatePath("/dashboard");
  return { ok: true };
}
