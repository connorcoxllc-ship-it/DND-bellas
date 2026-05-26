// Core D&D 5e reference data used for calculations and level-up guidance.
// This is intentionally editable/overridable in the sheet so content from any
// source (Xanathar's, Tasha's, homebrew, etc.) can be entered manually.

export const ABILITIES = [
  { key: "str", label: "Strength" },
  { key: "dex", label: "Dexterity" },
  { key: "con", label: "Constitution" },
  { key: "int", label: "Intelligence" },
  { key: "wis", label: "Wisdom" },
  { key: "cha", label: "Charisma" },
] as const;

export type AbilityKey = (typeof ABILITIES)[number]["key"];

// skill -> governing ability
export const SKILLS: { key: string; label: string; ability: AbilityKey }[] = [
  { key: "acrobatics", label: "Acrobatics", ability: "dex" },
  { key: "animalHandling", label: "Animal Handling", ability: "wis" },
  { key: "arcana", label: "Arcana", ability: "int" },
  { key: "athletics", label: "Athletics", ability: "str" },
  { key: "deception", label: "Deception", ability: "cha" },
  { key: "history", label: "History", ability: "int" },
  { key: "insight", label: "Insight", ability: "wis" },
  { key: "intimidation", label: "Intimidation", ability: "cha" },
  { key: "investigation", label: "Investigation", ability: "int" },
  { key: "medicine", label: "Medicine", ability: "wis" },
  { key: "nature", label: "Nature", ability: "int" },
  { key: "perception", label: "Perception", ability: "wis" },
  { key: "performance", label: "Performance", ability: "cha" },
  { key: "persuasion", label: "Persuasion", ability: "cha" },
  { key: "religion", label: "Religion", ability: "int" },
  { key: "sleightOfHand", label: "Sleight of Hand", ability: "dex" },
  { key: "stealth", label: "Stealth", ability: "dex" },
  { key: "survival", label: "Survival", ability: "wis" },
];

// XP required to REACH each level (index = level).
export const XP_THRESHOLDS = [
  0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000,
  120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

export function proficiencyBonusForLevel(level: number): number {
  if (level < 1) return 2;
  return Math.floor((Math.max(1, Math.min(20, level)) - 1) / 4) + 2;
}

export function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) lvl = i;
  }
  return lvl;
}

export function xpToNextLevel(xp: number): { nextLevel: number; needed: number } | null {
  const current = levelForXp(xp);
  if (current >= 20) return null;
  const next = current + 1;
  return { nextLevel: next, needed: XP_THRESHOLDS[next] - xp };
}

// Full-caster spell slots by character level (standard 5e table, levels 1-20).
// slots[level] = [l1, l2, l3, l4, l5, l6, l7, l8, l9]
export const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1: [2, 0, 0, 0, 0, 0, 0, 0, 0],
  2: [3, 0, 0, 0, 0, 0, 0, 0, 0],
  3: [4, 2, 0, 0, 0, 0, 0, 0, 0],
  4: [4, 3, 0, 0, 0, 0, 0, 0, 0],
  5: [4, 3, 2, 0, 0, 0, 0, 0, 0],
  6: [4, 3, 3, 0, 0, 0, 0, 0, 0],
  7: [4, 3, 3, 1, 0, 0, 0, 0, 0],
  8: [4, 3, 3, 2, 0, 0, 0, 0, 0],
  9: [4, 3, 3, 3, 1, 0, 0, 0, 0],
  10: [4, 3, 3, 3, 2, 0, 0, 0, 0],
  11: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  12: [4, 3, 3, 3, 2, 1, 0, 0, 0],
  13: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  14: [4, 3, 3, 3, 2, 1, 1, 0, 0],
  15: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  16: [4, 3, 3, 3, 2, 1, 1, 1, 0],
  17: [4, 3, 3, 3, 2, 1, 1, 1, 1],
  18: [4, 3, 3, 3, 3, 1, 1, 1, 1],
  19: [4, 3, 3, 3, 3, 2, 1, 1, 1],
  20: [4, 3, 3, 3, 3, 2, 2, 1, 1],
};

// Half-caster spell slots (Paladin, Ranger, Artificer) by class level.
export const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1: [0, 0, 0, 0, 0],
  2: [2, 0, 0, 0, 0],
  3: [3, 0, 0, 0, 0],
  4: [3, 0, 0, 0, 0],
  5: [4, 2, 0, 0, 0],
  6: [4, 2, 0, 0, 0],
  7: [4, 3, 0, 0, 0],
  8: [4, 3, 0, 0, 0],
  9: [4, 3, 2, 0, 0],
  10: [4, 3, 2, 0, 0],
  11: [4, 3, 3, 0, 0],
  12: [4, 3, 3, 0, 0],
  13: [4, 3, 3, 1, 0],
  14: [4, 3, 3, 1, 0],
  15: [4, 3, 3, 2, 0],
  16: [4, 3, 3, 2, 0],
  17: [4, 3, 3, 3, 1],
  18: [4, 3, 3, 3, 1],
  19: [4, 3, 3, 3, 2],
  20: [4, 3, 3, 3, 2],
};

// Warlock Pact Magic: number of slots and the level those slots are cast at.
export const PACT_MAGIC: Record<number, { slots: number; level: number }> = {
  1: { slots: 1, level: 1 },
  2: { slots: 2, level: 1 },
  3: { slots: 2, level: 2 },
  4: { slots: 2, level: 2 },
  5: { slots: 2, level: 3 },
  6: { slots: 2, level: 3 },
  7: { slots: 2, level: 4 },
  8: { slots: 2, level: 4 },
  9: { slots: 2, level: 5 },
  10: { slots: 2, level: 5 },
  11: { slots: 3, level: 5 },
  12: { slots: 3, level: 5 },
  13: { slots: 3, level: 5 },
  14: { slots: 3, level: 5 },
  15: { slots: 3, level: 5 },
  16: { slots: 3, level: 5 },
  17: { slots: 4, level: 5 },
  18: { slots: 4, level: 5 },
  19: { slots: 4, level: 5 },
  20: { slots: 4, level: 5 },
};

export type CasterType = "full" | "half" | "third" | "pact" | "none";

// Proficiencies granted by each class at level 1 (SRD). Used to auto-fill the
// "Proficiencies & Training" block when you apply class defaults.
export interface ClassProficiencies {
  armor: string;
  weapons: string;
  tools: string;
  skillsNote: string;
}

export const CLASS_PROFICIENCIES: Record<string, ClassProficiencies> = {
  Barbarian: { armor: "Light & medium armor, shields", weapons: "Simple & martial weapons", tools: "None", skillsNote: "Choose 2: Animal Handling, Athletics, Intimidation, Nature, Perception, Survival" },
  Bard: { armor: "Light armor", weapons: "Simple weapons, hand crossbows, longswords, rapiers, shortswords", tools: "Three musical instruments", skillsNote: "Choose any 3 skills" },
  Cleric: { armor: "Light & medium armor, shields", weapons: "Simple weapons", tools: "None", skillsNote: "Choose 2: History, Insight, Medicine, Persuasion, Religion" },
  Druid: { armor: "Light & medium armor, shields (no metal)", weapons: "Clubs, daggers, darts, javelins, maces, quarterstaffs, scimitars, sickles, slings, spears", tools: "Herbalism kit", skillsNote: "Choose 2: Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, Survival" },
  Fighter: { armor: "All armor, shields", weapons: "Simple & martial weapons", tools: "None", skillsNote: "Choose 2: Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, Survival" },
  Monk: { armor: "None", weapons: "Simple weapons, shortswords", tools: "One artisan's tools or musical instrument", skillsNote: "Choose 2: Acrobatics, Athletics, History, Insight, Religion, Stealth" },
  Paladin: { armor: "All armor, shields", weapons: "Simple & martial weapons", tools: "None", skillsNote: "Choose 2: Athletics, Insight, Intimidation, Medicine, Persuasion, Religion" },
  Ranger: { armor: "Light & medium armor, shields", weapons: "Simple & martial weapons", tools: "None", skillsNote: "Choose 3: Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, Survival" },
  Rogue: { armor: "Light armor", weapons: "Simple weapons, hand crossbows, longswords, rapiers, shortswords", tools: "Thieves' tools", skillsNote: "Choose 4: Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, Stealth" },
  Sorcerer: { armor: "None", weapons: "Daggers, darts, slings, quarterstaffs, light crossbows", tools: "None", skillsNote: "Choose 2: Arcana, Deception, Insight, Intimidation, Persuasion, Religion" },
  Warlock: { armor: "Light armor", weapons: "Simple weapons", tools: "None", skillsNote: "Choose 2: Arcana, Deception, History, Intimidation, Investigation, Nature, Religion" },
  Wizard: { armor: "None", weapons: "Daggers, darts, slings, quarterstaffs, light crossbows", tools: "None", skillsNote: "Choose 2: Arcana, History, Insight, Investigation, Medicine, Religion" },
  Artificer: { armor: "Light & medium armor, shields", weapons: "Simple weapons", tools: "Thieves' tools, tinker's tools, one artisan's tools", skillsNote: "Choose 2: Arcana, History, Investigation, Medicine, Nature, Perception, Sleight of Hand" },
};

export interface ClassInfo {
  name: string;
  hitDie: number; // d6=6, d8=8 etc
  primaryAbility: AbilityKey[];
  savingThrows: AbilityKey[];
  caster: CasterType;
  spellcastingAbility?: AbilityKey;
  // What you gain at each class level (summary; subclass features are manual).
  features: Record<number, string[]>;
}

// Levels at which most characters gain an Ability Score Improvement / feat.
export const ASI_LEVELS = [4, 8, 12, 16, 19];

export const CLASSES: Record<string, ClassInfo> = {
  Barbarian: {
    name: "Barbarian",
    hitDie: 12,
    primaryAbility: ["str"],
    savingThrows: ["str", "con"],
    caster: "none",
    features: {
      1: ["Rage", "Unarmored Defense"],
      2: ["Reckless Attack", "Danger Sense"],
      3: ["Primal Path (subclass)", "Primal Knowledge"],
      4: ["Ability Score Improvement"],
      5: ["Extra Attack", "Fast Movement"],
      6: ["Path feature"],
      7: ["Feral Instinct", "Instinctive Pounce"],
      8: ["Ability Score Improvement"],
      9: ["Brutal Critical (1 die)"],
      11: ["Relentless Rage"],
      12: ["Ability Score Improvement"],
      15: ["Persistent Rage"],
      16: ["Ability Score Improvement"],
      18: ["Indomitable Might"],
      19: ["Ability Score Improvement"],
      20: ["Primal Champion"],
    },
  },
  Bard: {
    name: "Bard",
    hitDie: 8,
    primaryAbility: ["cha"],
    savingThrows: ["dex", "cha"],
    caster: "full",
    spellcastingAbility: "cha",
    features: {
      1: ["Spellcasting", "Bardic Inspiration (d6)"],
      2: ["Jack of All Trades", "Song of Rest (d6)"],
      3: ["Bard College (subclass)", "Expertise"],
      4: ["Ability Score Improvement"],
      5: ["Bardic Inspiration (d8)", "Font of Inspiration"],
      6: ["Countercharm", "College feature"],
      8: ["Ability Score Improvement"],
      10: ["Bardic Inspiration (d10)", "Expertise", "Magical Secrets"],
      12: ["Ability Score Improvement"],
      14: ["Magical Secrets", "College feature"],
      15: ["Bardic Inspiration (d12)"],
      16: ["Ability Score Improvement"],
      18: ["Magical Secrets"],
      19: ["Ability Score Improvement"],
      20: ["Superior Inspiration"],
    },
  },
  Cleric: {
    name: "Cleric",
    hitDie: 8,
    primaryAbility: ["wis"],
    savingThrows: ["wis", "cha"],
    caster: "full",
    spellcastingAbility: "wis",
    features: {
      1: ["Spellcasting", "Divine Domain (subclass)"],
      2: ["Channel Divinity (1/rest)", "Domain feature"],
      4: ["Ability Score Improvement"],
      5: ["Destroy Undead (CR 1/2)"],
      6: ["Channel Divinity (2/rest)", "Domain feature"],
      8: ["Ability Score Improvement", "Destroy Undead (CR 1)", "Domain feature"],
      10: ["Divine Intervention"],
      11: ["Destroy Undead (CR 2)"],
      12: ["Ability Score Improvement"],
      14: ["Destroy Undead (CR 3)"],
      16: ["Ability Score Improvement"],
      17: ["Destroy Undead (CR 4)", "Domain feature"],
      18: ["Channel Divinity (3/rest)"],
      19: ["Ability Score Improvement"],
      20: ["Divine Intervention Improvement"],
    },
  },
  Druid: {
    name: "Druid",
    hitDie: 8,
    primaryAbility: ["wis"],
    savingThrows: ["int", "wis"],
    caster: "full",
    spellcastingAbility: "wis",
    features: {
      1: ["Druidic", "Spellcasting"],
      2: ["Wild Shape", "Druid Circle (subclass)"],
      4: ["Ability Score Improvement", "Wild Shape Improvement"],
      6: ["Circle feature"],
      8: ["Ability Score Improvement", "Wild Shape Improvement"],
      10: ["Circle feature"],
      12: ["Ability Score Improvement"],
      14: ["Circle feature"],
      16: ["Ability Score Improvement"],
      18: ["Timeless Body", "Beast Spells"],
      19: ["Ability Score Improvement"],
      20: ["Archdruid"],
    },
  },
  Fighter: {
    name: "Fighter",
    hitDie: 10,
    primaryAbility: ["str", "dex"],
    savingThrows: ["str", "con"],
    caster: "none",
    features: {
      1: ["Fighting Style", "Second Wind"],
      2: ["Action Surge (one use)"],
      3: ["Martial Archetype (subclass)"],
      4: ["Ability Score Improvement"],
      5: ["Extra Attack"],
      6: ["Ability Score Improvement"],
      7: ["Archetype feature"],
      8: ["Ability Score Improvement"],
      9: ["Indomitable (one use)"],
      10: ["Archetype feature"],
      11: ["Extra Attack (2)"],
      12: ["Ability Score Improvement"],
      13: ["Indomitable (two uses)"],
      14: ["Ability Score Improvement"],
      15: ["Archetype feature"],
      16: ["Ability Score Improvement"],
      17: ["Action Surge (two uses)", "Indomitable (three uses)"],
      18: ["Archetype feature"],
      19: ["Ability Score Improvement"],
      20: ["Extra Attack (3)"],
    },
  },
  Monk: {
    name: "Monk",
    hitDie: 8,
    primaryAbility: ["dex", "wis"],
    savingThrows: ["str", "dex"],
    caster: "none",
    features: {
      1: ["Unarmored Defense", "Martial Arts"],
      2: ["Ki", "Unarmored Movement"],
      3: ["Monastic Tradition (subclass)", "Deflect Missiles"],
      4: ["Ability Score Improvement", "Slow Fall"],
      5: ["Extra Attack", "Stunning Strike"],
      6: ["Ki-Empowered Strikes", "Tradition feature"],
      7: ["Evasion", "Stillness of Mind"],
      8: ["Ability Score Improvement"],
      10: ["Purity of Body"],
      11: ["Tradition feature"],
      12: ["Ability Score Improvement"],
      13: ["Tongue of the Sun and Moon"],
      14: ["Diamond Soul"],
      15: ["Timeless Body"],
      16: ["Ability Score Improvement"],
      17: ["Tradition feature"],
      18: ["Empty Body"],
      19: ["Ability Score Improvement"],
      20: ["Perfect Self"],
    },
  },
  Paladin: {
    name: "Paladin",
    hitDie: 10,
    primaryAbility: ["str", "cha"],
    savingThrows: ["wis", "cha"],
    caster: "half",
    spellcastingAbility: "cha",
    features: {
      1: ["Divine Sense", "Lay on Hands"],
      2: ["Fighting Style", "Spellcasting", "Divine Smite"],
      3: ["Divine Health", "Sacred Oath (subclass)"],
      4: ["Ability Score Improvement"],
      5: ["Extra Attack"],
      6: ["Aura of Protection"],
      7: ["Oath feature"],
      8: ["Ability Score Improvement"],
      10: ["Aura of Courage"],
      11: ["Improved Divine Smite"],
      12: ["Ability Score Improvement"],
      14: ["Cleansing Touch"],
      15: ["Oath feature"],
      16: ["Ability Score Improvement"],
      18: ["Aura improvements"],
      19: ["Ability Score Improvement"],
      20: ["Oath feature (capstone)"],
    },
  },
  Ranger: {
    name: "Ranger",
    hitDie: 10,
    primaryAbility: ["dex", "wis"],
    savingThrows: ["str", "dex"],
    caster: "half",
    spellcastingAbility: "wis",
    features: {
      1: ["Favored Enemy", "Natural Explorer"],
      2: ["Fighting Style", "Spellcasting"],
      3: ["Ranger Archetype (subclass)", "Primeval Awareness"],
      4: ["Ability Score Improvement"],
      5: ["Extra Attack"],
      6: ["Favored Enemy & Explorer improvements"],
      7: ["Archetype feature"],
      8: ["Ability Score Improvement", "Land's Stride"],
      10: ["Hide in Plain Sight"],
      11: ["Archetype feature"],
      12: ["Ability Score Improvement"],
      14: ["Vanish"],
      15: ["Archetype feature"],
      16: ["Ability Score Improvement"],
      18: ["Feral Senses"],
      19: ["Ability Score Improvement"],
      20: ["Foe Slayer"],
    },
  },
  Rogue: {
    name: "Rogue",
    hitDie: 8,
    primaryAbility: ["dex"],
    savingThrows: ["dex", "int"],
    caster: "none",
    features: {
      1: ["Expertise", "Sneak Attack", "Thieves' Cant"],
      2: ["Cunning Action"],
      3: ["Roguish Archetype (subclass)", "Steady Aim"],
      4: ["Ability Score Improvement"],
      5: ["Uncanny Dodge"],
      6: ["Expertise"],
      7: ["Evasion"],
      8: ["Ability Score Improvement"],
      9: ["Archetype feature"],
      10: ["Ability Score Improvement"],
      11: ["Reliable Talent"],
      13: ["Archetype feature"],
      14: ["Blindsense"],
      15: ["Slippery Mind"],
      16: ["Ability Score Improvement"],
      17: ["Archetype feature"],
      18: ["Elusive"],
      19: ["Ability Score Improvement"],
      20: ["Stroke of Luck"],
    },
  },
  Sorcerer: {
    name: "Sorcerer",
    hitDie: 6,
    primaryAbility: ["cha"],
    savingThrows: ["con", "cha"],
    caster: "full",
    spellcastingAbility: "cha",
    features: {
      1: ["Spellcasting", "Sorcerous Origin (subclass)"],
      2: ["Font of Magic (Sorcery Points)"],
      3: ["Metamagic"],
      4: ["Ability Score Improvement"],
      6: ["Origin feature"],
      8: ["Ability Score Improvement"],
      10: ["Metamagic"],
      12: ["Ability Score Improvement"],
      14: ["Origin feature"],
      16: ["Ability Score Improvement"],
      17: ["Metamagic"],
      18: ["Origin feature"],
      19: ["Ability Score Improvement"],
      20: ["Sorcerous Restoration"],
    },
  },
  Warlock: {
    name: "Warlock",
    hitDie: 8,
    primaryAbility: ["cha"],
    savingThrows: ["wis", "cha"],
    caster: "pact",
    spellcastingAbility: "cha",
    features: {
      1: ["Otherworldly Patron (subclass)", "Pact Magic"],
      2: ["Eldritch Invocations"],
      3: ["Pact Boon"],
      4: ["Ability Score Improvement"],
      6: ["Patron feature"],
      8: ["Ability Score Improvement"],
      10: ["Patron feature"],
      11: ["Mystic Arcanum (6th level)"],
      12: ["Ability Score Improvement"],
      13: ["Mystic Arcanum (7th level)"],
      15: ["Mystic Arcanum (8th level)"],
      16: ["Ability Score Improvement"],
      17: ["Mystic Arcanum (9th level)"],
      19: ["Ability Score Improvement"],
      20: ["Eldritch Master"],
    },
  },
  Wizard: {
    name: "Wizard",
    hitDie: 6,
    primaryAbility: ["int"],
    savingThrows: ["int", "wis"],
    caster: "full",
    spellcastingAbility: "int",
    features: {
      1: ["Spellcasting", "Arcane Recovery"],
      2: ["Arcane Tradition (subclass)"],
      4: ["Ability Score Improvement"],
      6: ["Tradition feature"],
      8: ["Ability Score Improvement"],
      10: ["Tradition feature"],
      12: ["Ability Score Improvement"],
      14: ["Tradition feature"],
      16: ["Ability Score Improvement"],
      18: ["Spell Mastery"],
      19: ["Ability Score Improvement"],
      20: ["Signature Spells"],
    },
  },
  Artificer: {
    name: "Artificer",
    hitDie: 8,
    primaryAbility: ["int"],
    savingThrows: ["con", "int"],
    caster: "half",
    spellcastingAbility: "int",
    features: {
      1: ["Magical Tinkering", "Spellcasting"],
      2: ["Infuse Item"],
      3: ["Artificer Specialist (subclass)", "The Right Tool for the Job"],
      4: ["Ability Score Improvement"],
      5: ["Specialist feature"],
      6: ["Tool Expertise"],
      7: ["Flash of Genius"],
      8: ["Ability Score Improvement"],
      9: ["Specialist feature"],
      10: ["Magic Item Adept"],
      11: ["Spell-Storing Item"],
      12: ["Ability Score Improvement"],
      14: ["Magic Item Savant"],
      15: ["Specialist feature"],
      16: ["Ability Score Improvement"],
      18: ["Magic Item Master"],
      19: ["Ability Score Improvement"],
      20: ["Soul of Artifice"],
    },
  },
};

export const CLASS_NAMES = Object.keys(CLASSES);

export const COMMON_RACES = [
  "Human",
  "Elf",
  "Dwarf",
  "Halfling",
  "Dragonborn",
  "Gnome",
  "Half-Elf",
  "Half-Orc",
  "Tiefling",
  "Aasimar",
  "Goliath",
  "Tabaxi",
  "Firbolg",
  "Genasi",
  "Other",
];

export const ALIGNMENTS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil",
  "Unaligned",
];
