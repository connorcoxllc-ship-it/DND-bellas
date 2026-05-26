// Types and helpers for customizable campaign homepages and personal
// dashboard preferences.

export interface CampaignPanel {
  id: string;
  title: string;
  body: string;
}

export interface Combatant {
  id: string;
  name: string;
  init: number;
  hp?: number;
  ac?: number;
}

export interface CampaignData {
  bannerColor: string;
  description: string;
  panels: CampaignPanel[];
  initiative: { round: number; turn: number; combatants: Combatant[] };
}

export function defaultCampaignData(): CampaignData {
  return {
    bannerColor: "#7b2d26",
    description: "",
    panels: [],
    initiative: { round: 1, turn: 0, combatants: [] },
  };
}

export function normalizeCampaignData(input: Partial<CampaignData> | null | undefined): CampaignData {
  const base = defaultCampaignData();
  if (!input) return base;
  return {
    bannerColor: input.bannerColor || base.bannerColor,
    description: input.description ?? "",
    panels: Array.isArray(input.panels) ? input.panels : [],
    initiative: {
      round: input.initiative?.round ?? 1,
      turn: input.initiative?.turn ?? 0,
      combatants: Array.isArray(input.initiative?.combatants) ? input.initiative!.combatants : [],
    },
  };
}

export type DashSection = "campaigns" | "myCharacters" | "party" | "widgets";

export const ALL_SECTIONS: { key: DashSection; label: string }[] = [
  { key: "myCharacters", label: "Your Characters" },
  { key: "party", label: "The Party" },
  { key: "campaigns", label: "Your Campaigns" },
  { key: "widgets", label: "Your Widgets" },
];

export interface DashWidget {
  id: string;
  type: "note" | "links";
  title: string;
  body?: string;
  links?: { label: string; url: string }[];
}

export interface UserPrefs {
  accent: string;
  order: DashSection[];
  hidden: DashSection[];
  widgets: DashWidget[];
}

export function defaultPrefs(): UserPrefs {
  return {
    accent: "#8b5cf6",
    order: ["myCharacters", "party", "campaigns", "widgets"],
    hidden: [],
    widgets: [],
  };
}

export function normalizePrefs(input: Partial<UserPrefs> | null | undefined): UserPrefs {
  const base = defaultPrefs();
  if (!input) return base;
  // Ensure every section appears exactly once in order.
  const known = base.order;
  const order = (input.order || []).filter((s): s is DashSection => known.includes(s));
  for (const s of known) if (!order.includes(s)) order.push(s);
  return {
    accent: input.accent || base.accent,
    order,
    hidden: (input.hidden || []).filter((s): s is DashSection => known.includes(s)),
    widgets: Array.isArray(input.widgets) ? input.widgets : [],
  };
}
