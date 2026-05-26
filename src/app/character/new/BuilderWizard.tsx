"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { createBuiltCharacterAction } from "../../actions";
import {
  defaultCharacter,
  emptySpellSlots,
  type CharacterData,
} from "@/lib/dnd/character";
import {
  ABILITIES,
  AbilityKey,
  SKILLS,
  CLASS_NAMES,
  CLASSES,
  CLASS_PROFICIENCIES,
  RACE_NAMES,
  RACES,
  BACKGROUND_NAMES,
  BACKGROUNDS,
  ALIGNMENTS,
  STANDARD_ARRAY,
  POINT_BUY_COST,
  POINT_BUY_BUDGET,
} from "@/lib/dnd/data";
import { abilityModifier, formatMod, recommendedSpellSlots, earnedClassFeatures } from "@/lib/dnd/compute";

type Method = "standard" | "pointbuy" | "manual" | "roll";
const STEPS = ["Class", "Species", "Background", "Abilities", "Equipment", "Details", "Review"];

const ZERO: Record<AbilityKey, number> = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

export default function BuilderWizard({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // selections
  const [name, setName] = useState("");
  const [classOf, setClassOf] = useState("Fighter");
  const [level, setLevel] = useState(1);
  const [subclass, setSubclass] = useState("");
  const [raceName, setRaceName] = useState("Human");
  const [flexAssign, setFlexAssign] = useState<AbilityKey[]>([]);
  const [backgroundName, setBackgroundName] = useState("Folk Hero");
  const [method, setMethod] = useState<Method>("standard");
  const [base, setBase] = useState<Record<AbilityKey, number>>({ ...ZERO, str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 });
  const [extraSkills, setExtraSkills] = useState<string[]>([]);
  const [alignment, setAlignment] = useState("True Neutral");
  const [portraitUrl, setPortraitUrl] = useState("");
  const [personality, setPersonality] = useState("");
  const [ideals, setIdeals] = useState("");
  const [bonds, setBonds] = useState("");
  const [flaws, setFlaws] = useState("");
  const [backstory, setBackstory] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const race = RACES[raceName];
  const bg = BACKGROUNDS[backgroundName];
  const cls = CLASSES[classOf];

  const racialBonus = useMemo(() => {
    const b: Record<AbilityKey, number> = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    if (race) {
      for (const [k, v] of Object.entries(race.abilityBonuses)) b[k as AbilityKey] += v || 0;
      if (race.flexBonus) for (const k of flexAssign) b[k] += race.flexBonus.amount;
    }
    return b;
  }, [race, flexAssign]);

  const totals = useMemo(() => {
    const t: Record<AbilityKey, number> = { ...base };
    for (const a of ABILITIES) t[a.key] = base[a.key] + racialBonus[a.key];
    return t;
  }, [base, racialBonus]);

  const pointsUsed = ABILITIES.reduce((s, a) => s + (POINT_BUY_COST[base[a.key]] ?? 99), 0);
  const stdUsedCounts = useMemo(() => {
    const m: Record<number, number> = {};
    for (const a of ABILITIES) m[base[a.key]] = (m[base[a.key]] || 0) + 1;
    return m;
  }, [base]);

  function applySuggestedStory() {
    if (!bg) return;
    setPersonality(bg.suggested.personality);
    setIdeals(bg.suggested.ideal);
    setBonds(bg.suggested.bond);
    setFlaws(bg.suggested.flaw);
  }

  function rollAbilities() {
    const roll = () => {
      const d = [0, 0, 0, 0].map(() => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
      return d[0] + d[1] + d[2];
    };
    setBase({ str: roll(), dex: roll(), con: roll(), int: roll(), wis: roll(), cha: roll() });
  }

  function assemble(): CharacterData {
    const c = defaultCharacter(name || "New Adventurer");
    const hd = cls?.hitDie || 8;
    const conMod = abilityModifier(totals.con);
    let hp = hd + conMod;
    for (let l = 2; l <= level; l++) hp += Math.floor(hd / 2) + 1 + conMod;

    const { slots, pact } = recommendedSpellSlots({ ...c, classes: [{ name: classOf, level }] });
    const spellSlots = emptySpellSlots();
    for (let i = 0; i < 9; i++) spellSlots[i + 1] = { max: slots[i], used: 0 };
    if (pact) spellSlots[pact.level] = { max: (spellSlots[pact.level]?.max || 0) + pact.slots, used: 0 };

    const classFeatures = earnedClassFeatures({ ...c, classes: [{ name: classOf, level }] })
      .flatMap((cf) => cf.features.map((f) => ({ id: nanoid(), name: f.name, source: `${cf.className} ${f.level}` })));
    const raceTraits = (race?.traits || []).map((t) => ({ id: nanoid(), name: t, source: `${raceName} trait` }));
    const bgFeature = bg ? [{ id: nanoid(), name: bg.feature, source: `${backgroundName} background` }] : [];

    const profs = CLASS_PROFICIENCIES[classOf];
    const languages = Array.from(new Set(race?.languages || [])).join(", ") + (bg && bg.languages ? ` (+${bg.languages} of choice)` : "");

    return {
      ...c,
      name: name || "New Adventurer",
      race: raceName,
      alignment,
      classes: [{ name: classOf, level, subclass: subclass || undefined }],
      manualLevel: level,
      useXp: false,
      abilities: totals,
      savingThrowProficiencies: cls ? [...cls.savingThrows] : [],
      skillProficiencies: Array.from(new Set([...(bg?.skills || []), ...extraSkills])),
      hitDice: `${level}d${hd}`,
      maxHp: Math.max(1, hp),
      currentHp: Math.max(1, hp),
      speed: race?.speed || 30,
      armorClass: 10 + abilityModifier(totals.dex),
      spellcastingAbility: cls?.spellcastingAbility || null,
      spellSlots,
      armorProficiencies: profs?.armor || "",
      weaponProficiencies: profs?.weapons || "",
      toolProficiencies: [profs?.tools, bg?.tools].filter((x) => x && x !== "None").join("; "),
      languages,
      features: [...classFeatures, ...raceTraits, ...bgFeature],
      equipment: (bg?.equipment || []).map((e) => ({ id: nanoid(), name: e, quantity: 1 })),
      personality, ideals, bonds, flaws, backstory,
      avatarImageUrl: portraitUrl,
    };
  }

  async function finish() {
    setBusy(true);
    const res = await createBuiltCharacterAction(assemble(), campaignId);
    if (res.ok) router.push(`/character/${res.id}`);
    else { setBusy(false); alert(res.error || "Failed to create character."); }
  }

  const canNext =
    (step !== 0 || !!classOf) &&
    (step !== 3 || (method !== "pointbuy" || pointsUsed <= POINT_BUY_BUDGET));

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl text-gold">Character Builder</h1>

      {/* Stepper */}
      <div className="flex flex-wrap gap-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(i)}
            className={`rounded px-2 py-1 text-xs ${i === step ? "bg-gold/25 text-gold" : i < step ? "bg-black/30 text-parchment/70" : "bg-black/20 text-parchment/40"}`}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <section className="panel min-h-[320px] p-5">
        {step === 0 && (
          <Step title="Choose your Class">
            <p className="mb-3 text-sm text-parchment/60">Your class defines your hit die, saving throws, proficiencies, spellcasting and features — all auto-applied.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CLASS_NAMES.map((n) => (
                <button key={n} onClick={() => setClassOf(n)} className={`rounded border p-2 text-left text-sm ${classOf === n ? "border-gold bg-gold/15" : "border-gold/20 bg-black/20 hover:border-gold/50"}`}>
                  <div className="font-display text-parchment">{n}</div>
                  <div className="text-[11px] text-parchment/50">d{CLASSES[n].hitDie} · {CLASSES[n].caster === "none" ? "martial" : `${CLASSES[n].caster} caster`}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm"><span className="label">Starting level</span>
                <input type="number" min={1} max={20} className="inp w-20" value={level} onChange={(e) => setLevel(Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 1)))} />
              </label>
              <label className="flex items-center gap-2 text-sm"><span className="label">Subclass (optional)</span>
                <input className="inp w-44" placeholder="e.g. Champion" value={subclass} onChange={(e) => setSubclass(e.target.value)} />
              </label>
            </div>
            {cls && (
              <div className="mt-3 rounded border border-gold/20 bg-black/20 p-2 text-xs text-parchment/70">
                Saving throws: {cls.savingThrows.map((s) => ABILITIES.find((a) => a.key === s)?.label).join(", ")} · Hit die d{cls.hitDie}
                {cls.spellcastingAbility ? ` · Spellcasting: ${ABILITIES.find((a) => a.key === cls.spellcastingAbility)?.label}` : ""}
              </div>
            )}
          </Step>
        )}

        {step === 1 && (
          <Step title="Choose your Species">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RACE_NAMES.map((n) => (
                <button key={n} onClick={() => { setRaceName(n); setFlexAssign([]); }} className={`rounded border p-2 text-left text-sm ${raceName === n ? "border-gold bg-gold/15" : "border-gold/20 bg-black/20 hover:border-gold/50"}`}>
                  <div className="font-display text-parchment">{n}</div>
                  <div className="text-[11px] text-parchment/50">{Object.entries(RACES[n].abilityBonuses).map(([k, v]) => `${k.toUpperCase()}+${v}`).join(" ")} · {RACES[n].speed}ft</div>
                </button>
              ))}
            </div>
            {race && (
              <div className="mt-3 rounded border border-gold/20 bg-black/20 p-3 text-sm">
                <div className="text-parchment/80">Traits: {race.traits.length ? race.traits.join(", ") : "—"}</div>
                <div className="text-parchment/60">Languages: {race.languages.join(", ")}</div>
                {race.flexBonus && (
                  <div className="mt-2">
                    <div className="label mb-1">Choose {race.flexBonus.count} abilities to get +{race.flexBonus.amount}</div>
                    <div className="flex flex-wrap gap-1">
                      {ABILITIES.map((a) => {
                        const on = flexAssign.includes(a.key);
                        return (
                          <button key={a.key} className={`chip ${on ? "bg-gold/25 text-gold" : ""}`} onClick={() => {
                            if (on) setFlexAssign(flexAssign.filter((x) => x !== a.key));
                            else if (flexAssign.length < race.flexBonus!.count) setFlexAssign([...flexAssign, a.key]);
                          }}>{a.label}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Step>
        )}

        {step === 2 && (
          <Step title="Choose your Background">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {BACKGROUND_NAMES.map((n) => (
                <button key={n} onClick={() => setBackgroundName(n)} className={`rounded border p-2 text-left text-sm ${backgroundName === n ? "border-gold bg-gold/15" : "border-gold/20 bg-black/20 hover:border-gold/50"}`}>
                  <div className="font-display text-parchment">{n}</div>
                  <div className="text-[11px] text-parchment/50">{BACKGROUNDS[n].skills.map((s) => SKILLS.find((x) => x.key === s)?.label).join(", ")}</div>
                </button>
              ))}
            </div>
            {bg && (
              <div className="mt-3 rounded border border-gold/20 bg-black/20 p-3 text-sm text-parchment/70">
                Feature: <span className="text-gold">{bg.feature}</span> · Skills: {bg.skills.map((s) => SKILLS.find((x) => x.key === s)?.label).join(", ")}
                {bg.tools ? ` · Tools: ${bg.tools}` : ""}
              </div>
            )}
          </Step>
        )}

        {step === 3 && (
          <Step title="Set your Ability Scores">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(["standard", "pointbuy", "manual", "roll"] as Method[]).map((m) => (
                <button key={m} onClick={() => { setMethod(m); if (m === "standard") setBase({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }); if (m === "pointbuy") setBase({ ...ZERO }); if (m === "roll") rollAbilities(); }} className={`btn ${method === m ? "bg-gold/25 text-gold" : ""}`}>
                  {m === "standard" ? "Standard Array" : m === "pointbuy" ? "Point Buy" : m === "manual" ? "Manual" : "Roll 4d6"}
                </button>
              ))}
              {method === "roll" && <button className="btn" onClick={rollAbilities}>🎲 Re-roll</button>}
              {method === "pointbuy" && <span className={`text-sm ${pointsUsed > POINT_BUY_BUDGET ? "text-red-400" : "text-parchment/70"}`}>{POINT_BUY_BUDGET - pointsUsed} points left</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ABILITIES.map((a) => (
                <div key={a.key} className="stat-box">
                  <div className="label">{a.label}</div>
                  {method === "standard" ? (
                    <select className="inp" value={base[a.key]} onChange={(e) => setBase({ ...base, [a.key]: parseInt(e.target.value, 10) })}>
                      {STANDARD_ARRAY.map((v) => (
                        <option key={v} value={v} disabled={v !== base[a.key] && (stdUsedCounts[v] || 0) >= 1}>{v}</option>
                      ))}
                    </select>
                  ) : method === "pointbuy" ? (
                    <div className="flex items-center gap-2">
                      <button className="btn px-2" onClick={() => setBase({ ...base, [a.key]: Math.max(8, base[a.key] - 1) })}>−</button>
                      <span className="font-display text-2xl text-parchment">{base[a.key]}</span>
                      <button className="btn px-2" onClick={() => { const nv = base[a.key] + 1; if (nv <= 15 && pointsUsed - (POINT_BUY_COST[base[a.key]] || 0) + (POINT_BUY_COST[nv] || 99) <= POINT_BUY_BUDGET) setBase({ ...base, [a.key]: nv }); }}>+</button>
                    </div>
                  ) : (
                    <input type="number" className="w-16 bg-transparent text-center font-display text-2xl text-parchment outline-none" value={base[a.key]} onChange={(e) => setBase({ ...base, [a.key]: Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 0)) })} />
                  )}
                  <div className="mt-1 text-[11px] text-parchment/60">
                    {racialBonus[a.key] ? `+${racialBonus[a.key]} race → ` : ""}
                    <span className="text-gold">{totals[a.key]} ({formatMod(abilityModifier(totals[a.key]))})</span>
                  </div>
                </div>
              ))}
            </div>
          </Step>
        )}

        {step === 4 && (
          <Step title="Skills & Equipment">
            <div className="mb-4">
              <div className="label mb-1">Skill proficiencies {cls ? `(${CLASS_PROFICIENCIES[classOf]?.skillsNote || ""})` : ""}</div>
              <p className="mb-2 text-xs text-parchment/50">Background grants {bg?.skills.map((s) => SKILLS.find((x) => x.key === s)?.label).join(" & ")} automatically. Pick any extras your class allows:</p>
              <div className="flex flex-wrap gap-1">
                {SKILLS.map((s) => {
                  const fromBg = bg?.skills.includes(s.key);
                  const on = extraSkills.includes(s.key) || fromBg;
                  return (
                    <button key={s.key} disabled={fromBg} className={`chip ${on ? "bg-gold/25 text-gold" : ""} ${fromBg ? "opacity-70" : ""}`} onClick={() => setExtraSkills(extraSkills.includes(s.key) ? extraSkills.filter((x) => x !== s.key) : [...extraSkills, s.key])}>
                      {s.label}{fromBg ? " ✓" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="label mb-1">Starting equipment (from background)</div>
              <ul className="list-inside list-disc text-sm text-parchment/70">
                {(bg?.equipment || []).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
              <p className="mt-2 text-xs text-parchment/40">You can add class starting gear and SRD weapons on the sheet after creating.</p>
            </div>
          </Step>
        )}

        {step === 5 && (
          <Step title="Name, Lore & Portrait">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm"><span className="label">Character name</span><input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Melena" /></label>
              <label className="text-sm"><span className="label">Alignment</span><select className="inp" value={alignment} onChange={(e) => setAlignment(e.target.value)}>{ALIGNMENTS.map((a) => <option key={a}>{a}</option>)}</select></label>
              <label className="text-sm sm:col-span-2"><span className="label">Portrait image URL (optional)</span><input className="inp" value={portraitUrl} onChange={(e) => setPortraitUrl(e.target.value)} placeholder="https://…" /></label>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="label">Personality & lore</span>
              <button className="btn" onClick={applySuggestedStory}>✨ Use {backgroundName} suggestions</button>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <textarea className="inp" rows={2} placeholder="Personality traits" value={personality} onChange={(e) => setPersonality(e.target.value)} />
              <textarea className="inp" rows={2} placeholder="Ideals" value={ideals} onChange={(e) => setIdeals(e.target.value)} />
              <textarea className="inp" rows={2} placeholder="Bonds" value={bonds} onChange={(e) => setBonds(e.target.value)} />
              <textarea className="inp" rows={2} placeholder="Flaws" value={flaws} onChange={(e) => setFlaws(e.target.value)} />
            </div>
            <textarea className="inp mt-2" rows={4} placeholder="Backstory" value={backstory} onChange={(e) => setBackstory(e.target.value)} />
          </Step>
        )}

        {step === 6 && (
          <Step title="Review & Create">
            <div className="space-y-2 text-sm">
              <Row k="Name" v={name || "(unnamed)"} />
              <Row k="Class" v={`${classOf} ${level}${subclass ? ` (${subclass})` : ""}`} />
              <Row k="Species" v={raceName} />
              <Row k="Background" v={backgroundName} />
              <Row k="Abilities" v={ABILITIES.map((a) => `${a.label.slice(0, 3)} ${totals[a.key]}`).join("  ")} />
              <Row k="Hit Points" v={`${assemble().maxHp}`} />
              <Row k="Armor Class" v={`${10 + abilityModifier(totals.dex)}`} />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="label">Add to campaign</span>
              <select className="inp max-w-xs" value={campaignId ?? ""} onChange={(e) => setCampaignId(e.target.value || null)}>
                <option value="">Private (not shared)</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button className="btn-primary mt-4" disabled={busy} onClick={finish}>{busy ? "Creating…" : "⚔ Create character"}</button>
          </Step>
        )}
      </section>

      {/* Nav */}
      <div className="flex justify-between">
        <button className="btn" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>← Back</button>
        {step < STEPS.length - 1 ? (
          <button className="btn-primary" disabled={!canNext} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next →</button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-xl text-gold">{title}</h2>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-gold/10 py-1">
      <span className="text-parchment/60">{k}</span>
      <span className="text-parchment">{v}</span>
    </div>
  );
}
