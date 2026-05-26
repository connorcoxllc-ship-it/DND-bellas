import type { AbilityKey } from "./data";

export interface CharacterClassEntry {
  name: string;
  level: number;
  subclass?: string;
}

export interface AttackEntry {
  id: string;
  name: string;
  bonus: string; // free text e.g. "+5"
  damage: string; // e.g. "1d8+3 slashing"
  notes?: string;
}

export interface SpellEntry {
  id: string;
  name: string;
  level: number; // 0 = cantrip
  prepared: boolean;
  notes?: string;
}

export interface SpellSlotLevel {
  max: number;
  used: number;
}

export interface FeatureEntry {
  id: string;
  name: string;
  source?: string; // class/race/feat/source book
  description?: string;
}

export interface ItemEntry {
  id: string;
  name: string;
  quantity: number;
  notes?: string;
}

export interface CharacterData {
  // Identity
  name: string;
  race: string;
  classes: CharacterClassEntry[];
  background: string;
  alignment: string;
  xp: number;
  // Use XP table to derive level, or set level manually if not tracking XP.
  useXp: boolean;
  manualLevel: number;

  // Ability scores (base values)
  abilities: Record<AbilityKey, number>;

  // Proficiencies
  savingThrowProficiencies: AbilityKey[];
  skillProficiencies: string[];
  skillExpertise: string[];
  proficiencyBonusOverride?: number | null;

  // Combat
  armorClass: number;
  initiativeOverride?: number | null;
  speed: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  hitDice: string; // e.g. "5d8"
  deathSaves: { successes: number; failures: number };
  inspiration: boolean;
  conditions: string[];

  // Attacks & spells
  attacks: AttackEntry[];
  spellcastingAbility?: AbilityKey | null;
  spellSaveDcOverride?: number | null;
  spellAttackOverride?: number | null;
  spellSlots: Record<number, SpellSlotLevel>; // 1..9
  spells: SpellEntry[];

  // Story & inventory
  features: FeatureEntry[];
  proficienciesAndLanguages: string;
  armorProficiencies: string;
  weaponProficiencies: string;
  toolProficiencies: string;
  languages: string;
  equipment: ItemEntry[];
  personality: string;
  ideals: string;
  bonds: string;
  flaws: string;
  backstory: string;
  notes: string;

  // Appearance
  appearance: string;
  avatarColor: string;
}

export function emptySpellSlots(): Record<number, SpellSlotLevel> {
  const s: Record<number, SpellSlotLevel> = {};
  for (let i = 1; i <= 9; i++) s[i] = { max: 0, used: 0 };
  return s;
}

export function defaultCharacter(name = "New Adventurer"): CharacterData {
  return {
    name,
    race: "",
    classes: [{ name: "Fighter", level: 1 }],
    background: "",
    alignment: "True Neutral",
    xp: 0,
    useXp: false,
    manualLevel: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrowProficiencies: [],
    skillProficiencies: [],
    skillExpertise: [],
    proficiencyBonusOverride: null,
    armorClass: 10,
    initiativeOverride: null,
    speed: 30,
    maxHp: 10,
    currentHp: 10,
    tempHp: 0,
    hitDice: "1d10",
    deathSaves: { successes: 0, failures: 0 },
    inspiration: false,
    conditions: [],
    attacks: [],
    spellcastingAbility: null,
    spellSaveDcOverride: null,
    spellAttackOverride: null,
    spellSlots: emptySpellSlots(),
    spells: [],
    features: [],
    proficienciesAndLanguages: "",
    armorProficiencies: "",
    weaponProficiencies: "",
    toolProficiencies: "",
    languages: "",
    equipment: [],
    personality: "",
    ideals: "",
    bonds: "",
    flaws: "",
    backstory: "",
    notes: "",
    appearance: "",
    avatarColor: "#7b2d26",
  };
}

// Merge a stored (possibly partial / older) character with defaults so the UI
// never crashes on missing fields.
export function normalizeCharacter(input: Partial<CharacterData> | null | undefined): CharacterData {
  const base = defaultCharacter();
  if (!input) return base;
  const merged: CharacterData = {
    ...base,
    ...input,
    abilities: { ...base.abilities, ...(input.abilities || {}) },
    deathSaves: { ...base.deathSaves, ...(input.deathSaves || {}) },
    spellSlots: { ...emptySpellSlots(), ...(input.spellSlots || {}) },
    classes:
      input.classes && input.classes.length > 0 ? input.classes : base.classes,
    savingThrowProficiencies: input.savingThrowProficiencies || [],
    skillProficiencies: input.skillProficiencies || [],
    skillExpertise: input.skillExpertise || [],
    conditions: input.conditions || [],
    attacks: input.attacks || [],
    spells: input.spells || [],
    features: input.features || [],
    equipment: input.equipment || [],
  };
  return merged;
}
