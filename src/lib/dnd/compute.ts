import {
  ABILITIES,
  AbilityKey,
  SKILLS,
  CLASSES,
  CLASS_PROFICIENCIES,
  ClassProficiencies,
  proficiencyBonusForLevel,
  levelForXp,
  xpToNextLevel,
  FULL_CASTER_SLOTS,
  HALF_CASTER_SLOTS,
  PACT_MAGIC,
  ASI_LEVELS,
} from "./data";
import type { CharacterData } from "./character";

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

export function totalLevel(c: CharacterData): number {
  if (c.useXp) return levelForXp(c.xp);
  const fromClasses = c.classes.reduce((s, cl) => s + (cl.level || 0), 0);
  if (fromClasses > 0) return fromClasses;
  return c.manualLevel || 1;
}

export function proficiencyBonus(c: CharacterData): number {
  if (c.proficiencyBonusOverride && c.proficiencyBonusOverride > 0) {
    return c.proficiencyBonusOverride;
  }
  return proficiencyBonusForLevel(totalLevel(c));
}

export function savingThrow(c: CharacterData, ability: AbilityKey): number {
  const mod = abilityModifier(c.abilities[ability]);
  const prof = c.savingThrowProficiencies.includes(ability)
    ? proficiencyBonus(c)
    : 0;
  return mod + prof;
}

export function skillBonus(
  c: CharacterData,
  skillKey: string,
  ability: AbilityKey
): number {
  const mod = abilityModifier(c.abilities[ability]);
  let prof = 0;
  if (c.skillExpertise.includes(skillKey)) prof = proficiencyBonus(c) * 2;
  else if (c.skillProficiencies.includes(skillKey)) prof = proficiencyBonus(c);
  return mod + prof;
}

export function passivePerception(c: CharacterData): number {
  const perc = SKILLS.find((s) => s.key === "perception")!;
  return 10 + skillBonus(c, "perception", perc.ability);
}

export function initiative(c: CharacterData): number {
  if (c.initiativeOverride !== null && c.initiativeOverride !== undefined) {
    return c.initiativeOverride;
  }
  return abilityModifier(c.abilities.dex);
}

export function spellSaveDc(c: CharacterData): number | null {
  if (c.spellSaveDcOverride) return c.spellSaveDcOverride;
  if (!c.spellcastingAbility) return null;
  return 8 + proficiencyBonus(c) + abilityModifier(c.abilities[c.spellcastingAbility]);
}

export function spellAttackBonus(c: CharacterData): number | null {
  if (c.spellAttackOverride) return c.spellAttackOverride;
  if (!c.spellcastingAbility) return null;
  return proficiencyBonus(c) + abilityModifier(c.abilities[c.spellcastingAbility]);
}

export interface LevelGuidance {
  level: number;
  nextLevel: number | null;
  xpNeeded: number | null;
  asiSoon: boolean;
  upcoming: { className: string; atLevel: number; features: string[] }[];
  suggestions: string[];
}

// Build "what's next" guidance: XP to next level + the class features the
// character will unlock at their next level in each of their classes.
export function levelGuidance(c: CharacterData): LevelGuidance {
  const lvl = totalLevel(c);
  const next = lvl < 20 ? lvl + 1 : null;
  let xpNeeded: number | null = null;
  if (c.useXp) {
    const r = xpToNextLevel(c.xp);
    xpNeeded = r ? r.needed : null;
  }

  const upcoming: LevelGuidance["upcoming"] = [];
  for (const cl of c.classes) {
    const info = CLASSES[cl.name];
    if (!info) continue;
    const nextClassLevel = (cl.level || 0) + 1;
    if (nextClassLevel > 20) continue;
    const feats = info.features[nextClassLevel];
    if (feats && feats.length) {
      upcoming.push({
        className: cl.name,
        atLevel: nextClassLevel,
        features: feats,
      });
    }
  }

  const suggestions: string[] = [];
  // ASI reminder
  for (const cl of c.classes) {
    const info = CLASSES[cl.name];
    const nextClassLevel = (cl.level || 0) + 1;
    if (info && ASI_LEVELS.includes(nextClassLevel)) {
      suggestions.push(
        `Your ${cl.name} reaches level ${nextClassLevel} next — an Ability Score Improvement or feat. Consider boosting ${info.primaryAbility
          .map((a) => ABILITIES.find((x) => x.key === a)?.label)
          .join("/")} or taking a feat.`
      );
    }
  }

  // HP increase guidance
  if (next) {
    const conMod = abilityModifier(c.abilities.con);
    suggestions.push(
      `On level up, roll (or take the average of) your class hit die and add your Constitution modifier (${formatMod(
        conMod
      )}) to your max HP.`
    );
  }

  // Spell slot growth
  const fullCasterLevels = c.classes
    .filter((cl) => CLASSES[cl.name]?.caster === "full")
    .reduce((s, cl) => s + cl.level, 0);
  if (fullCasterLevels > 0 && fullCasterLevels < 20) {
    const nowSlots = FULL_CASTER_SLOTS[fullCasterLevels] || [];
    const nextSlots = FULL_CASTER_SLOTS[fullCasterLevels + 1] || [];
    const gained: string[] = [];
    for (let i = 0; i < 9; i++) {
      const diff = (nextSlots[i] || 0) - (nowSlots[i] || 0);
      if (diff > 0) gained.push(`${diff}× level-${i + 1} slot${diff > 1 ? "s" : ""}`);
    }
    if (gained.length) {
      suggestions.push(`As a full caster you will gain: ${gained.join(", ")}.`);
    }
  }

  const asiSoon = c.classes.some((cl) =>
    ASI_LEVELS.includes((cl.level || 0) + 1)
  );

  return {
    level: lvl,
    nextLevel: next,
    xpNeeded,
    asiSoon,
    upcoming,
    suggestions,
  };
}

// Suggest recommended full-caster spell slots for the current level (used as a
// helper button; the player can still set slots manually).
export function recommendedFullCasterSlots(c: CharacterData): number[] {
  const fullCasterLevels = c.classes
    .filter((cl) => CLASSES[cl.name]?.caster === "full")
    .reduce((s, cl) => s + cl.level, 0);
  return FULL_CASTER_SLOTS[fullCasterLevels] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
}

// Recommended spell slots tying in each class: combines full/half/third casters
// via the 5e multiclass rule, and returns Warlock pact magic separately.
export function recommendedSpellSlots(c: CharacterData): {
  slots: number[];
  pact: { slots: number; level: number } | null;
} {
  let effective = 0;
  let pactLevels = 0;
  for (const cl of c.classes) {
    const info = CLASSES[cl.name];
    if (!info) continue;
    if (info.caster === "full") effective += cl.level;
    else if (info.caster === "half") effective += Math.floor(cl.level / 2);
    else if (info.caster === "third") effective += Math.floor(cl.level / 3);
    else if (info.caster === "pact") pactLevels += cl.level;
  }
  // Single half-caster characters use the dedicated half-caster table so a
  // level-2 Paladin/Ranger correctly shows a 1st-level slot.
  const onlyHalf =
    c.classes.length === 1 && CLASSES[c.classes[0].name]?.caster === "half";
  let slots = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (onlyHalf) {
    const half = HALF_CASTER_SLOTS[Math.min(20, c.classes[0].level)] || [];
    slots = [...half, 0, 0, 0, 0].slice(0, 9);
  } else if (effective > 0) {
    slots = FULL_CASTER_SLOTS[Math.min(20, effective)] || slots;
  }
  const pact = pactLevels > 0 ? PACT_MAGIC[Math.min(20, pactLevels)] : null;
  return { slots, pact };
}

export interface ClassDefaults {
  hitDice: string;
  savingThrowProficiencies: AbilityKey[];
  spellcastingAbility: AbilityKey | null;
  proficiencies: ClassProficiencies | null;
}

// What a class+level "ties in" — used by the Apply Class Defaults button.
export function classDefaults(c: CharacterData): ClassDefaults {
  const primary = c.classes[0];
  const info = primary ? CLASSES[primary.name] : undefined;
  const hitDiceParts = c.classes
    .filter((cl) => CLASSES[cl.name])
    .map((cl) => `${cl.level}d${CLASSES[cl.name].hitDie}`);
  // Saving throws come from the first class (5e: only your starting class
  // grants saving-throw proficiencies).
  const saves = info ? [...info.savingThrows] : [];
  const castingClass = c.classes.find((cl) => CLASSES[cl.name]?.spellcastingAbility);
  const spellAbility = castingClass
    ? CLASSES[castingClass.name].spellcastingAbility || null
    : null;
  return {
    hitDice: hitDiceParts.join(" + ") || "1d8",
    savingThrowProficiencies: saves,
    spellcastingAbility: spellAbility,
    proficiencies: info ? CLASS_PROFICIENCIES[info.name] || null : null,
  };
}

// All class features the character has earned, per class, up to their current
// level — auto-populated in the Features & Traits tab.
export function earnedClassFeatures(
  c: CharacterData
): { className: string; level: number; features: { level: number; name: string }[] }[] {
  return c.classes
    .map((cl) => {
      const info = CLASSES[cl.name];
      if (!info) return null;
      const features: { level: number; name: string }[] = [];
      for (let lvl = 1; lvl <= cl.level; lvl++) {
        for (const f of info.features[lvl] || []) features.push({ level: lvl, name: f });
      }
      return { className: cl.name, level: cl.level, features };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}
