import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { getCurrentUser } from "@/lib/auth";
import { ABILITIES, AbilityKey } from "@/lib/dnd/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort extraction of a character from an uploaded sheet PDF. Reads
// AcroForm fields (reliable for the fillable WotC sheet) and falls back to
// raw-text heuristics (for D&D Beyond's styled export). Whatever it can't
// determine is simply left for the user to fill in on the editable sheet.

function num(v: string | undefined | null): number | undefined {
  if (!v) return undefined;
  const m = String(v).match(/-?\d+/);
  return m ? parseInt(m[0], 10) : undefined;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());

  const fields: Record<string, string> = {};
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const acro = pdf.getForm();
    for (const f of acro.getFields()) {
      const name = f.getName();
      const type = f.constructor.name;
      try {
        if (type === "PDFTextField") {
          const t = (f as any).getText?.();
          if (t) fields[name] = String(t);
        } else if (type === "PDFCheckBox") {
          fields[name] = (f as any).isChecked?.() ? "1" : "0";
        }
      } catch { /* ignore individual field errors */ }
    }
  } catch { /* not a form PDF */ }

  let text = "";
  try {
    const parsed = await pdfParse(bytes);
    text = parsed.text || "";
  } catch { /* text extraction failed */ }

  // Helper: first matching form field by candidate names (case-insensitive,
  // also matches when the field name merely contains the candidate).
  const fieldKeys = Object.keys(fields);
  const pick = (...candidates: string[]): string | undefined => {
    for (const c of candidates) {
      const exact = fieldKeys.find((k) => k.toLowerCase() === c.toLowerCase());
      if (exact && fields[exact]) return fields[exact];
    }
    for (const c of candidates) {
      const part = fieldKeys.find((k) => k.toLowerCase().includes(c.toLowerCase()));
      if (part && fields[part]) return fields[part];
    }
    return undefined;
  };

  const data: Record<string, unknown> = {};
  const detected: string[] = [];

  const name = pick("CharacterName", "Character Name");
  if (name) { data.name = name.trim(); detected.push("name"); }

  const classLevel = pick("ClassLevel", "Class", "Class & Level");
  if (classLevel) {
    const m = classLevel.match(/([A-Za-z]+)\s*(\d+)?/);
    if (m) {
      data.classes = [{ name: m[1], level: m[2] ? parseInt(m[2], 10) : 1 }];
      detected.push("class/level");
    }
  }

  const race = pick("Race", "Race ", "Species");
  if (race) { data.race = race.trim(); detected.push("race"); }
  const bg = pick("Background");
  if (bg) { data.background = bg.trim(); detected.push("background"); }
  const align = pick("Alignment");
  if (align) { data.alignment = align.trim(); detected.push("alignment"); }
  const xp = num(pick("XP", "Experience Points"));
  if (xp !== undefined) { data.xp = xp; data.useXp = true; detected.push("xp"); }

  // Ability scores — form fields first, then text patterns.
  const abilities: Partial<Record<AbilityKey, number>> = {};
  const abilityFieldNames: Record<AbilityKey, string[]> = {
    str: ["STR", "Strength", "STRscore"],
    dex: ["DEX", "Dexterity", "DEXscore"],
    con: ["CON", "Constitution", "CONscore"],
    int: ["INT", "Intelligence", "INTscore"],
    wis: ["WIS", "Wisdom", "WISscore"],
    cha: ["CHA", "Charisma", "CHAscore"],
  };
  for (const a of ABILITIES) {
    let v = num(pick(...abilityFieldNames[a.key]));
    if (v === undefined && text) {
      const re = new RegExp(`${a.label}\\s*\\n?\\s*(\\d{1,2})`, "i");
      const m = text.match(re);
      if (m) v = parseInt(m[1], 10);
    }
    if (v !== undefined && v >= 1 && v <= 30) abilities[a.key] = v;
  }
  if (Object.keys(abilities).length) { data.abilities = abilities; detected.push("ability scores"); }

  const ac = num(pick("AC", "Armor Class"));
  if (ac !== undefined) { data.armorClass = ac; detected.push("AC"); }
  const speed = num(pick("Speed"));
  if (speed !== undefined) { data.speed = speed; detected.push("speed"); }
  const maxHp = num(pick("HPMax", "Hit Point Maximum", "Max HP"));
  if (maxHp !== undefined) { data.maxHp = maxHp; data.currentHp = maxHp; detected.push("HP"); }
  const hd = pick("HDTotal", "HD", "Hit Dice", "Total");
  if (hd) { data.hitDice = hd.trim(); detected.push("hit dice"); }

  return NextResponse.json({ data, detected });
}
