import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ABILITIES, AbilityKey, CLASSES, SKILLS } from "@/lib/dnd/data";
import { abilityModifier } from "@/lib/dnd/compute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ABILITY_BY_ID: Record<number, AbilityKey> = { 1: "str", 2: "dex", 3: "con", 4: "int", 5: "wis", 6: "cha" };
const ABILITY_SLUG: Record<AbilityKey, string> = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };
const ALIGNMENTS_BY_ID: Record<number, string> = {
  1: "Lawful Good", 2: "Neutral Good", 3: "Chaotic Good", 4: "Lawful Neutral",
  5: "True Neutral", 6: "Chaotic Neutral", 7: "Lawful Evil", 8: "Neutral Evil", 9: "Chaotic Evil",
};

const slugToSkillKey = (slug: string) => slug.replace(/-(.)/g, (_, c: string) => c.toUpperCase());

function mod(group: any, type: string, predicate: (subType: string) => boolean): { total: number; subs: string[] } {
  let total = 0;
  const subs: string[] = [];
  for (const key of ["race", "class", "background", "item", "feat", "condition"]) {
    for (const m of group?.[key] || []) {
      if (m.type === type && typeof m.subType === "string" && predicate(m.subType)) {
        total += m.fixedValue ?? m.value ?? 0;
        subs.push(m.subType);
      }
    }
  }
  return { total, subs };
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = String(body.url || "");
  const m = raw.match(/(\d{3,})/);
  if (!m) return NextResponse.json({ error: "Couldn't find a character ID in that link." }, { status: 400 });
  const id = m[1];

  let json: any;
  try {
    const res = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${id}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `D&D Beyond returned ${res.status}. Make sure the character's privacy is set to Public.` }, { status: 502 });
    }
    json = await res.json();
  } catch {
    return NextResponse.json({ error: "Couldn't reach D&D Beyond. Try again in a moment." }, { status: 502 });
  }

  const c = json?.data;
  if (!c) return NextResponse.json({ error: "No character data returned. Is the character set to Public?" }, { status: 404 });

  const mods = c.modifiers || {};

  // Ability scores: base + manual bonus + override + modifier bonuses.
  const abilities: Record<AbilityKey, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  for (const idStr of Object.keys(ABILITY_BY_ID)) {
    const id6 = Number(idStr);
    const key = ABILITY_BY_ID[id6];
    const base = c.stats?.find((s: any) => s.id === id6)?.value ?? 10;
    const bonus = c.bonusStats?.find((s: any) => s.id === id6)?.value ?? 0;
    const override = c.overrideStats?.find((s: any) => s.id === id6)?.value ?? null;
    const fromMods = mod(mods, "bonus", (st) => st === `${ABILITY_SLUG[key]}-score`).total;
    abilities[key] = override ?? base + bonus + fromMods;
  }

  // Classes
  const classes = (c.classes || []).map((cl: any) => ({
    name: cl.definition?.name || "Fighter",
    level: cl.level || 1,
    subclass: cl.subclassDefinition?.name || undefined,
  }));
  const totalLevel = classes.reduce((s: number, cl: any) => s + cl.level, 0) || 1;
  const hitDice = (c.classes || [])
    .map((cl: any) => `${cl.level}d${cl.definition?.hitDice || 8}`)
    .join(" + ") || `${totalLevel}d8`;

  // HP
  const conMod = abilityModifier(abilities.con);
  const maxHp = c.overrideHitPoints ?? ((c.baseHitPoints ?? 8) + (c.bonusHitPoints ?? 0) + conMod * totalLevel);
  const currentHp = Math.max(0, maxHp - (c.removedHitPoints || 0));

  // Proficiencies
  const skillProficiencies: string[] = [];
  const skillExpertise: string[] = [];
  const savingThrowProficiencies: AbilityKey[] = [];
  const skillKeys = new Set(SKILLS.map((s) => s.key));
  for (const key of ["race", "class", "background", "item", "feat"]) {
    for (const mm of mods?.[key] || []) {
      if (typeof mm.subType !== "string") continue;
      if (mm.type === "proficiency" || mm.type === "expertise") {
        const sk = slugToSkillKey(mm.subType);
        if (skillKeys.has(sk)) {
          if (mm.type === "expertise") { if (!skillExpertise.includes(sk)) skillExpertise.push(sk); }
          else if (!skillProficiencies.includes(sk)) skillProficiencies.push(sk);
        } else {
          const saveMatch = mm.subType.match(/^(strength|dexterity|constitution|intelligence|wisdom|charisma)-saving-throws$/);
          if (saveMatch) {
            const ak = (Object.keys(ABILITY_SLUG) as AbilityKey[]).find((k) => ABILITY_SLUG[k] === saveMatch[1]);
            if (ak && !savingThrowProficiencies.includes(ak)) savingThrowProficiencies.push(ak);
          }
        }
      }
    }
  }

  // Spellcasting ability from the first caster class (via our class table).
  const castingClass = classes.find((cl: any) => CLASSES[cl.name]?.spellcastingAbility);
  const spellcastingAbility = castingClass ? CLASSES[castingClass.name].spellcastingAbility : null;

  // Racial trait names + class feature names (names only — factual labels).
  const features: { id: string; name: string; source?: string }[] = [];
  for (const t of c.race?.racialTraits || []) {
    const nm = t.definition?.name;
    if (nm) features.push({ id: `r_${features.length}`, name: nm, source: `${c.race?.fullName || "Race"} trait` });
  }

  const speed = c.race?.weightSpeeds?.normal?.walk ?? 30;

  const data = {
    name: c.name || "Imported Character",
    race: c.race?.fullName || c.race?.baseRaceName || "",
    classes: classes.length ? classes : [{ name: "Fighter", level: 1 }],
    background: c.background?.definition?.name || "",
    alignment: ALIGNMENTS_BY_ID[c.alignmentId] || "True Neutral",
    xp: c.currentXp || 0,
    useXp: (c.currentXp || 0) > 0,
    manualLevel: totalLevel,
    abilities,
    savingThrowProficiencies,
    skillProficiencies,
    skillExpertise,
    armorClass: 10 + abilityModifier(abilities.dex),
    speed,
    maxHp,
    currentHp,
    tempHp: c.temporaryHitPoints || 0,
    hitDice,
    spellcastingAbility,
    features,
    avatarImageUrl: c.decorations?.avatarUrl || c.avatarUrl || "",
    backstory: typeof c.notes?.backstory === "string" ? c.notes.backstory : "",
  };

  return NextResponse.json({ data, name: data.name, level: totalLevel });
}
