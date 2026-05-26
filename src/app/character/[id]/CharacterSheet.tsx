"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { saveCharacterAction, deleteCharacterAction } from "../../actions";
import type {
  CharacterData,
  AttackEntry,
  SpellEntry,
  FeatureEntry,
  ItemEntry,
} from "@/lib/dnd/character";
import { CARD_STAT_OPTIONS } from "@/lib/dnd/character";
import {
  ABILITIES,
  AbilityKey,
  SKILLS,
  CLASS_NAMES,
  CLASSES,
  COMMON_RACES,
  ALIGNMENTS,
  XP_THRESHOLDS,
} from "@/lib/dnd/data";
import {
  abilityModifier,
  formatMod,
  totalLevel,
  proficiencyBonus,
  savingThrow,
  skillBonus,
  passivePerception,
  initiative,
  spellSaveDc,
  spellAttackBonus,
  levelGuidance,
  recommendedSpellSlots,
  classDefaults,
  earnedClassFeatures,
} from "@/lib/dnd/compute";
import DiceRoller, { useDice } from "./DiceRoller";
import SrdPicker from "./SrdPicker";

type SaveState = "idle" | "saving" | "saved" | "error";
type RollFn = (expr: string, label?: string) => unknown;
type Tab = "actions" | "spells" | "inventory" | "features" | "background" | "levelup" | "notes";

interface SectionProps {
  ro: boolean;
  data: CharacterData;
  update: (patch: Partial<CharacterData>) => void;
}

export default function CharacterSheet({
  characterId,
  initialData,
  initialCampaignId,
  canEdit,
  campaigns,
}: {
  characterId: string;
  initialData: CharacterData;
  initialCampaignId: string | null;
  canEdit: boolean;
  campaigns: { id: string; name: string }[];
}) {
  const [data, setData] = useState<CharacterData>(initialData);
  const [campaignId, setCampaignId] = useState<string | null>(initialCampaignId);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [tab, setTab] = useState<Tab>("actions");
  const dice = useDice();
  const firstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!canEdit) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const res = await saveCharacterAction(characterId, data, campaignId);
      setSaveState(res.ok ? "saved" : "error");
      if (res.ok) setTimeout(() => setSaveState("idle"), 1500);
    }, 700);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data, campaignId, canEdit, characterId]);

  const update = useCallback((patch: Partial<CharacterData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const ro = !canEdit;
  const lvl = totalLevel(data);
  const pb = proficiencyBonus(data);
  const guidance = useMemo(() => levelGuidance(data), [data]);

  const classLine =
    data.classes.map((c) => `${c.name}${c.subclass ? ` (${c.subclass})` : ""} ${c.level}`).join(" / ") ||
    "Unclassed";

  function longRest() {
    const slots = { ...data.spellSlots };
    for (const k of Object.keys(slots)) slots[Number(k)] = { ...slots[Number(k)], used: 0 };
    update({
      currentHp: data.maxHp,
      tempHp: 0,
      spellSlots: slots,
      deathSaves: { successes: 0, failures: 0 },
    });
  }
  function shortRest() {
    // Warlocks regain pact slots on a short rest; nudge users to spend hit dice.
    const slots = { ...data.spellSlots };
    const isWarlock = data.classes.some((c) => CLASSES[c.name]?.caster === "pact");
    if (isWarlock) for (const k of Object.keys(slots)) slots[Number(k)] = { ...slots[Number(k)], used: 0 };
    update({ spellSlots: slots });
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex items-center justify-between">
          <SaveBadge state={saveState} />
          <DeleteButton characterId={characterId} name={data.name} />
        </div>
      )}

      {/* Header bar */}
      <section className="panel flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-3">
          {data.avatarImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatarImageUrl} alt="" className="h-14 w-14 rounded-full border-2 object-cover" style={{ borderColor: data.avatarColor }} />
          ) : canEdit ? (
            <input
              type="color"
              value={data.avatarColor}
              onChange={(e) => update({ avatarColor: e.target.value })}
              className="h-14 w-14 cursor-pointer rounded-full border-2 border-gold/50 bg-transparent"
              title="Avatar color"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold/50 font-display text-2xl" style={{ background: data.avatarColor }}>
              {data.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </div>
        <div className="min-w-[200px] flex-1">
          <input
            className="w-full bg-transparent font-display text-3xl text-gold outline-none placeholder:text-gold/30"
            value={data.name}
            disabled={ro}
            placeholder="Character name"
            onChange={(e) => update({ name: e.target.value })}
          />
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-parchment/70">
            <EditableSelect ro={ro} value={data.race} options={COMMON_RACES} freeText placeholder="Race" onChange={(v) => update({ race: v })} bare />
            <span className="text-gold/40">·</span>
            <span className="font-medium text-parchment">{classLine}</span>
            <span className="text-gold/40">·</span>
            <select className="bg-transparent text-parchment/70 outline-none" disabled={ro} value={data.alignment} onChange={(e) => update({ alignment: e.target.value })}>
              {ALIGNMENTS.map((a) => <option key={a} className="bg-ink">{a}</option>)}
            </select>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button className="btn" onClick={shortRest} title="Warlocks regain pact slots">🔥 Short Rest</button>
              <button className="btn" onClick={longRest} title="Restore HP, spell slots, death saves">🌙 Long Rest</button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="label">Campaign</span>
              <select className="inp max-w-[160px] py-0.5" value={campaignId ?? ""} onChange={(e) => setCampaignId(e.target.value || null)}>
                <option value="">Private</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* Class editor */}
      <section className="panel p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="panel-title">Class &amp; Level</h2>
          {!ro && <ApplyDefaultsButton data={data} update={update} />}
        </div>
        <ClassEditor ro={ro} data={data} update={update} />
      </section>

      {/* Ability hexagons */}
      <section className="panel p-3">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ABILITIES.map((a) => {
            const score = data.abilities[a.key];
            const mod = abilityModifier(score);
            return (
              <div key={a.key} className="flex flex-col items-center">
                <div className="label mb-1">{a.label.slice(0, 3)}</div>
                <button
                  className="hex flex h-20 w-[72px] flex-col items-center justify-center border-2 border-gold/50 bg-black/40 transition hover:border-gold"
                  onClick={() => dice.roll(`1d20${modStr(mod)}`, `${a.label} check`)}
                  title={`Roll ${a.label} check`}
                >
                  <span className="font-display text-3xl text-parchment">{formatMod(mod)}</span>
                </button>
                <input
                  type="number"
                  className="-mt-3 w-12 rounded-full border-2 border-gold/50 bg-ink text-center text-sm text-parchment outline-none"
                  value={score}
                  disabled={ro}
                  onChange={(e) => update({ abilities: { ...data.abilities, [a.key]: clampInt(e.target.value, 1, 30) } })}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Vitals row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Vital label="Prof Bonus" value={`+${pb}`} />
        <Vital label="Walking Speed" value={`${data.speed} ft`} editable={!ro} onChange={(v) => update({ speed: clampInt(v, 0, 999) })} raw={data.speed} />
        <div className="stat-box">
          <div className="label">Initiative</div>
          <button className="font-display text-2xl text-gold" onClick={() => dice.roll(`1d20${modStr(initiative(data))}`, "Initiative")}>{formatMod(initiative(data))}</button>
        </div>
        <div className="flex flex-col items-center">
          <div className="shield flex h-[72px] w-16 flex-col items-center justify-center border-2 border-gold/50 bg-black/40 pt-1">
            <span className="text-[9px] uppercase text-gold/70">AC</span>
            <input type="number" className="w-12 bg-transparent text-center font-display text-2xl text-parchment outline-none" value={data.armorClass} disabled={ro} onChange={(e) => update({ armorClass: clampInt(e.target.value, 0, 99) })} />
          </div>
        </div>
        <button
          className={`stat-box ${data.inspiration ? "ring-2 ring-gold" : ""}`}
          disabled={ro}
          onClick={() => update({ inspiration: !data.inspiration })}
          title="Heroic Inspiration"
        >
          <div className="label">Inspiration</div>
          <div className="font-display text-2xl">{data.inspiration ? "★" : "☆"}</div>
        </button>
        <HpBox ro={ro} data={data} update={update} />
      </section>

      {/* Main 3-column grid */}
      <div className="grid gap-3 lg:grid-cols-[230px_220px_1fr]">
        <div className="space-y-3">
          <SavingThrows ro={ro} data={data} update={update} roll={dice.roll} />
          <PassiveSenses data={data} />
          <ProficienciesTraining ro={ro} data={data} update={update} />
        </div>
        <div>
          <Skills ro={ro} data={data} update={update} roll={dice.roll} />
        </div>
        <div className="space-y-3">
          <section className="panel">
            <div className="flex overflow-x-auto border-b border-gold/20 px-2">
              {([
                ["actions", "Actions"],
                ["spells", "Spells"],
                ["inventory", "Inventory"],
                ["features", "Features & Traits"],
                ["background", "Background"],
                ["levelup", "Level Up"],
                ["notes", "Notes"],
              ] as [Tab, string][]).map(([t, lbl]) => (
                <button key={t} className={`tab ${tab === t ? "tab-active" : ""}`} onClick={() => setTab(t)}>
                  {lbl}
                </button>
              ))}
            </div>
            <div className="p-4">
              {tab === "actions" && <Attacks ro={ro} data={data} update={update} roll={dice.roll} />}
              {tab === "spells" && <Spellcasting ro={ro} data={data} update={update} roll={dice.roll} pb={pb} />}
              {tab === "inventory" && <Equipment ro={ro} data={data} update={update} />}
              {tab === "features" && <Features ro={ro} data={data} update={update} />}
              {tab === "background" && <Background ro={ro} data={data} update={update} />}
              {tab === "levelup" && <LevelGuidancePanel guidance={guidance} useXp={data.useXp} xp={data.xp} update={update} ro={ro} lvl={lvl} />}
              {tab === "notes" && (
                <TA ro={ro} label="Notes" value={data.notes} onChange={(v) => update({ notes: v })} rows={10} />
              )}
            </div>
          </section>
        </div>
      </div>

      <DiceRoller {...dice} />
    </div>
  );
}

/* ---------------- header / vitals primitives ---------------- */

function Vital({ label, value, editable, onChange, raw }: { label: string; value: string; editable?: boolean; onChange?: (v: string) => void; raw?: number }) {
  return (
    <div className="stat-box">
      <div className="label">{label}</div>
      {editable && onChange ? (
        <input type="number" className="w-full bg-transparent text-center font-display text-2xl text-parchment outline-none" value={raw} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div className="font-display text-2xl text-gold">{value}</div>
      )}
    </div>
  );
}

function HpBox({ ro, data, update }: SectionProps) {
  const [delta, setDelta] = useState("");
  const apply = (sign: number) => {
    const n = parseInt(delta, 10);
    if (isNaN(n)) return;
    if (sign < 0) {
      // damage soaks temp HP first
      let dmg = n;
      let temp = data.tempHp;
      if (temp > 0) { const absorbed = Math.min(temp, dmg); temp -= absorbed; dmg -= absorbed; }
      update({ tempHp: temp, currentHp: Math.max(0, data.currentHp - dmg) });
    } else {
      update({ currentHp: Math.min(data.maxHp, data.currentHp + n) });
    }
    setDelta("");
  };
  return (
    <div className="stat-box col-span-2 sm:col-span-1">
      <div className="label">Hit Points</div>
      <div className="flex items-baseline gap-1">
        <input type="number" className="w-12 bg-transparent text-right font-display text-2xl text-parchment outline-none" value={data.currentHp} disabled={ro} onChange={(e) => update({ currentHp: clampInt(e.target.value, -99, 9999) })} />
        <span className="text-parchment/50">/</span>
        <input type="number" className="w-12 bg-transparent text-left font-display text-lg text-parchment/70 outline-none" value={data.maxHp} disabled={ro} onChange={(e) => update({ maxHp: clampInt(e.target.value, 0, 9999) })} />
      </div>
      {!ro && (
        <div className="mt-1 flex items-center gap-1">
          <button className="rounded bg-green-700/40 px-1.5 text-xs text-green-300" onClick={() => apply(1)}>＋</button>
          <input className="w-10 rounded bg-black/40 px-1 text-center text-xs text-parchment outline-none" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="0" />
          <button className="rounded bg-red-800/40 px-1.5 text-xs text-red-300" onClick={() => apply(-1)}>－</button>
          <span className="ml-1 text-[10px] text-parchment/50">Temp</span>
          <input type="number" className="w-8 rounded bg-black/40 px-1 text-center text-xs text-parchment outline-none" value={data.tempHp} onChange={(e) => update({ tempHp: clampInt(e.target.value, 0, 999) })} />
        </div>
      )}
      <DeathSaves ro={ro} data={data} update={update} />
    </div>
  );
}

function DeathSaves({ ro, data, update }: SectionProps) {
  if (data.currentHp > 0) return null;
  return (
    <div className="mt-1 flex items-center gap-2 text-xs">
      <Pips ro={ro} label="✓" color="green" count={data.deathSaves.successes} onChange={(n) => update({ deathSaves: { ...data.deathSaves, successes: n } })} />
      <Pips ro={ro} label="✗" color="red" count={data.deathSaves.failures} onChange={(n) => update({ deathSaves: { ...data.deathSaves, failures: n } })} />
    </div>
  );
}

/* ---------------- small primitives ---------------- */

function SaveBadge({ state }: { state: SaveState }) {
  const map: Record<SaveState, { t: string; c: string }> = {
    idle: { t: "All changes saved", c: "text-parchment/40" },
    saving: { t: "Saving…", c: "text-gold" },
    saved: { t: "Saved ✓", c: "text-green-400" },
    error: { t: "Save failed — check connection", c: "text-red-400" },
  };
  return <span className={`text-xs ${map[state].c}`}>{map[state].t}</span>;
}

function EditableSelect({ ro, value, options, onChange, freeText, placeholder, bare }: { ro: boolean; value: string; options: string[]; onChange: (v: string) => void; freeText?: boolean; placeholder?: string; bare?: boolean }) {
  const known = options.includes(value);
  const [custom, setCustom] = useState(!known && value !== "");
  const cls = bare ? "bg-transparent text-parchment outline-none" : "inp";
  if (custom && freeText) {
    return <input className={cls} disabled={ro} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onBlur={() => { if (!value) setCustom(false); }} />;
  }
  return (
    <select className={cls} disabled={ro} value={known ? value : ""} onChange={(e) => { if (e.target.value === "__custom__") { setCustom(true); onChange(""); } else onChange(e.target.value); }}>
      <option value="" className="bg-ink">{placeholder || "—"}</option>
      {options.map((o) => <option key={o} value={o} className="bg-ink">{o}</option>)}
      {freeText && <option value="__custom__" className="bg-ink">Other…</option>}
    </select>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="label">{label}</div>{children}</div>;
}

/* ---------------- saving throws / senses / proficiencies ---------------- */

function SavingThrows({ ro, data, update, roll }: SectionProps & { roll: RollFn }) {
  const toggle = (k: AbilityKey) => {
    const has = data.savingThrowProficiencies.includes(k);
    update({ savingThrowProficiencies: has ? data.savingThrowProficiencies.filter((x) => x !== k) : [...data.savingThrowProficiencies, k] });
  };
  return (
    <section className="panel p-3">
      <h2 className="panel-title mb-2">Saving Throws</h2>
      <ul className="space-y-1">
        {ABILITIES.map((a) => {
          const prof = data.savingThrowProficiencies.includes(a.key);
          const bonus = savingThrow(data, a.key);
          return (
            <li key={a.key} className="flex items-center gap-2 text-sm">
              <button disabled={ro} onClick={() => toggle(a.key)} className={`h-3 w-3 rounded-full border ${prof ? "bg-gold border-gold" : "border-gold/40"}`} />
              <span className="flex-1">{a.label}</span>
              <button className="rounded bg-gold/10 px-2 font-medium text-gold hover:bg-gold/20" onClick={() => roll(`1d20${modStr(bonus)}`, `${a.label} save`)}>{formatMod(bonus)}</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PassiveSenses({ data }: { data: CharacterData }) {
  const wis = abilityModifier(data.abilities.wis);
  const intel = abilityModifier(data.abilities.int);
  const insightBonus = skillBonus(data, "insight", "wis");
  const investBonus = skillBonus(data, "investigation", "int");
  return (
    <section className="panel p-3">
      <h2 className="panel-title mb-2">Passive Senses</h2>
      <ul className="space-y-1 text-sm">
        <li className="flex justify-between"><span>Perception</span><span className="font-display text-gold">{passivePerception(data)}</span></li>
        <li className="flex justify-between"><span>Investigation</span><span className="font-display text-gold">{10 + investBonus}</span></li>
        <li className="flex justify-between"><span>Insight</span><span className="font-display text-gold">{10 + insightBonus}</span></li>
      </ul>
    </section>
  );
}

function ProficienciesTraining({ ro, data, update }: SectionProps) {
  return (
    <section className="panel p-3">
      <h2 className="panel-title mb-2">Proficiencies &amp; Training</h2>
      <div className="space-y-2 text-sm">
        <TrainRow ro={ro} label="Armor" value={data.armorProficiencies} onChange={(v) => update({ armorProficiencies: v })} />
        <TrainRow ro={ro} label="Weapons" value={data.weaponProficiencies} onChange={(v) => update({ weaponProficiencies: v })} />
        <TrainRow ro={ro} label="Tools" value={data.toolProficiencies} onChange={(v) => update({ toolProficiencies: v })} />
        <TrainRow ro={ro} label="Languages" value={data.languages} onChange={(v) => update({ languages: v })} />
      </div>
    </section>
  );
}

function TrainRow({ ro, label, value, onChange }: { ro: boolean; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="label">{label}</div>
      <textarea className="inp" disabled={ro} rows={1} value={value} placeholder="—" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ---------------- skills ---------------- */

function Skills({ ro, data, update, roll }: SectionProps & { roll: RollFn }) {
  const toggleProf = (k: string) => {
    const has = data.skillProficiencies.includes(k);
    update({ skillProficiencies: has ? data.skillProficiencies.filter((x) => x !== k) : [...data.skillProficiencies, k] });
  };
  const toggleExp = (k: string) => {
    const has = data.skillExpertise.includes(k);
    update({ skillExpertise: has ? data.skillExpertise.filter((x) => x !== k) : [...data.skillExpertise, k] });
  };
  return (
    <section className="panel p-3">
      <h2 className="panel-title mb-1">Skills</h2>
      <p className="mb-2 text-[10px] text-parchment/40">● proficient · ◆ expertise</p>
      <ul className="space-y-1">
        {SKILLS.map((s) => {
          const bonus = skillBonus(data, s.key, s.ability);
          const prof = data.skillProficiencies.includes(s.key);
          const exp = data.skillExpertise.includes(s.key);
          return (
            <li key={s.key} className="flex items-center gap-1.5 text-sm">
              <button disabled={ro} onClick={() => toggleProf(s.key)} className={`h-3 w-3 rounded-full border ${prof ? "bg-gold border-gold" : "border-gold/40"}`} title="Proficiency" />
              <button disabled={ro} onClick={() => toggleExp(s.key)} className={`h-3 w-3 rotate-45 border ${exp ? "bg-blood border-blood" : "border-gold/40"}`} title="Expertise" />
              <span className="w-8 text-[10px] uppercase text-parchment/40">{s.ability}</span>
              <span className="flex-1 truncate">{s.label}</span>
              <button className="rounded bg-gold/10 px-2 font-medium text-gold hover:bg-gold/20" onClick={() => roll(`1d20${modStr(bonus)}`, s.label)}>{formatMod(bonus)}</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- class editor + apply defaults ---------------- */

function ClassEditor({ ro, data, update }: SectionProps) {
  const setClass = (i: number, patch: Partial<CharacterData["classes"][number]>) => {
    update({ classes: data.classes.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  };
  const add = () => update({ classes: [...data.classes, { name: "Wizard", level: 1 }] });
  const remove = (i: number) => update({ classes: data.classes.filter((_, idx) => idx !== i) });
  return (
    <div className="space-y-2">
      {data.classes.map((c, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select className="inp max-w-[150px]" disabled={ro} value={CLASS_NAMES.includes(c.name) ? c.name : ""} onChange={(e) => setClass(i, { name: e.target.value })}>
            {!CLASS_NAMES.includes(c.name) && <option value="">{c.name || "—"}</option>}
            {CLASS_NAMES.map((n) => <option key={n}>{n}</option>)}
          </select>
          <input className="inp w-28" disabled={ro} placeholder="Subclass" value={c.subclass || ""} onChange={(e) => setClass(i, { subclass: e.target.value })} />
          <div className="flex items-center gap-1">
            <span className="label">Lvl</span>
            <input type="number" className="inp w-16" disabled={ro} value={c.level} onChange={(e) => setClass(i, { level: clampInt(e.target.value, 1, 20) })} />
          </div>
          {CLASSES[c.name] && <span className="chip">d{CLASSES[c.name].hitDie}</span>}
          {CLASSES[c.name] && CLASSES[c.name].caster !== "none" && <span className="chip">{CLASSES[c.name].caster} caster</span>}
          {!ro && data.classes.length > 1 && <button className="text-red-400 hover:text-red-300" onClick={() => remove(i)}>✕</button>}
        </div>
      ))}
      {!ro && <button className="btn" onClick={add}>+ Multiclass</button>}
    </div>
  );
}

function ApplyDefaultsButton({ data, update }: { data: CharacterData; update: (p: Partial<CharacterData>) => void }) {
  const [done, setDone] = useState(false);
  const apply = () => {
    const d = classDefaults(data);
    update({
      hitDice: d.hitDice,
      savingThrowProficiencies: d.savingThrowProficiencies,
      spellcastingAbility: d.spellcastingAbility,
      armorProficiencies: d.proficiencies?.armor || data.armorProficiencies,
      weaponProficiencies: d.proficiencies?.weapons || data.weaponProficiencies,
      toolProficiencies: d.proficiencies?.tools || data.toolProficiencies,
    });
    setDone(true);
    setTimeout(() => setDone(false), 2000);
  };
  return (
    <button className="btn" onClick={apply} title="Fill saving throws, hit dice, spellcasting & proficiencies from your class">
      {done ? "Applied ✓" : "⚙ Tie in class defaults"}
    </button>
  );
}

/* ---------------- actions / attacks ---------------- */

function Attacks({ ro, data, update, roll }: SectionProps & { roll: RollFn }) {
  const add = () => update({ attacks: [...data.attacks, { id: nanoid(), name: "", bonus: "", damage: "" }] });
  const setA = (id: string, patch: Partial<AttackEntry>) => update({ attacks: data.attacks.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const remove = (id: string) => update({ attacks: data.attacks.filter((a) => a.id !== id) });
  const addFromSrd = (w: { name: string; damage?: string; properties?: string }) =>
    update({ attacks: [...data.attacks, { id: nanoid(), name: w.name, bonus: "", damage: w.damage || "", notes: w.properties }] });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="panel-title">Attacks &amp; Actions</h2>
        {!ro && (
          <div className="flex gap-2">
            <SrdPicker kind="equipment" label="+ SRD weapon" onSelectWeapon={addFromSrd} />
            <button className="btn" onClick={add}>+ Custom</button>
          </div>
        )}
      </div>
      <div className="mb-2 grid grid-cols-[1fr_60px_1fr_auto] gap-2 text-[10px] uppercase text-gold/60">
        <span>Name</span><span className="text-center">Hit/DC</span><span>Damage</span><span></span>
      </div>
      {data.attacks.length === 0 && <Empty text="No attacks yet. Add an SRD weapon or a custom one." />}
      <div className="space-y-2">
        {data.attacks.map((a) => (
          <div key={a.id} className="grid grid-cols-[1fr_60px_1fr_auto] items-center gap-2 text-sm">
            <input className="inp" disabled={ro} placeholder="Name" value={a.name} onChange={(e) => setA(a.id, { name: e.target.value })} />
            <input className="inp text-center" disabled={ro} placeholder="+0" value={a.bonus} onChange={(e) => setA(a.id, { bonus: e.target.value })} />
            <div className="flex gap-1">
              <input className="inp" disabled={ro} placeholder="1d8+3 slashing" value={a.damage} onChange={(e) => setA(a.id, { damage: e.target.value })} />
              <button className="btn px-2" title="Roll damage" onClick={() => { const m = a.damage.match(/\d*d\d+([+-]\d+)?/i); if (m) roll(m[0], a.name || "damage"); }}>🎲</button>
            </div>
            {!ro && <button className="text-red-400 hover:text-red-300" onClick={() => remove(a.id)}>✕</button>}
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-parchment/50">
        <span className="label">Actions in Combat</span>
        <p className="mt-1">Attack · Dash · Disengage · Dodge · Grapple · Help · Hide · Ready · Search · Shove · Use an Object</p>
      </div>
    </div>
  );
}

/* ---------------- spellcasting ---------------- */

function Spellcasting({ ro, data, update, roll, pb }: SectionProps & { roll: RollFn; pb: number }) {
  const dc = spellSaveDc(data);
  const atk = spellAttackBonus(data);
  const addSpell = () => update({ spells: [...data.spells, { id: nanoid(), name: "", level: 1, prepared: false }] });
  const setSpell = (id: string, patch: Partial<SpellEntry>) => update({ spells: data.spells.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeSpell = (id: string) => update({ spells: data.spells.filter((s) => s.id !== id) });
  const setSlot = (lvl: number, patch: Partial<{ max: number; used: number }>) => update({ spellSlots: { ...data.spellSlots, [lvl]: { ...data.spellSlots[lvl], ...patch } } });

  const applyRecommended = () => {
    const { slots, pact } = recommendedSpellSlots(data);
    const next = { ...data.spellSlots };
    for (let i = 0; i < 9; i++) next[i + 1] = { max: slots[i], used: Math.min(data.spellSlots[i + 1]?.used || 0, slots[i]) };
    if (pact) next[pact.level] = { max: (next[pact.level]?.max || 0) + pact.slots, used: 0 };
    update({ spellSlots: next });
  };

  const addFromSrd = (s: { name: string; level: number; school?: string; desc?: string }) =>
    update({ spells: [...data.spells, { id: nanoid(), name: s.name, level: s.level, prepared: false, notes: s.school ? `${s.school}${s.desc ? " — " + s.desc.slice(0, 120) : ""}` : s.desc?.slice(0, 140) }] });

  const spellsByLevel = useMemo(() => {
    const map: Record<number, SpellEntry[]> = {};
    for (const s of data.spells) (map[s.level] ??= []).push(s);
    return map;
  }, [data.spells]);

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Labeled label="Ability">
          <select className="inp" disabled={ro} value={data.spellcastingAbility ?? ""} onChange={(e) => update({ spellcastingAbility: (e.target.value || null) as AbilityKey | null })}>
            <option value="">None</option>
            {ABILITIES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </Labeled>
        <div className="stat-box"><div className="label">Save DC</div><div className="font-display text-2xl text-gold">{dc ?? "—"}</div></div>
        <div className="stat-box"><div className="label">Spell Atk</div><button className="font-display text-2xl text-gold" disabled={atk === null} onClick={() => atk !== null && roll(`1d20${modStr(atk)}`, "Spell attack")}>{atk !== null ? formatMod(atk) : "—"}</button></div>
        {!ro && <button className="btn self-end" onClick={applyRecommended} title="Fill slots from your class & level">⚙ Auto slots</button>}
      </div>

      <div className="mb-4">
        <div className="label mb-1">Spell Slots (click pips to spend/recover)</div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((lvl) => {
            const slot = data.spellSlots[lvl] || { max: 0, used: 0 };
            if (slot.max === 0 && ro) return null;
            return (
              <div key={lvl} className="rounded border border-gold/20 bg-black/20 p-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gold">Lv {lvl}</span>
                  <input type="number" className="w-10 bg-transparent text-right text-parchment outline-none" disabled={ro} value={slot.max} onChange={(e) => setSlot(lvl, { max: clampInt(e.target.value, 0, 9) })} />
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Array.from({ length: slot.max }, (_, i) => (
                    <button key={i} onClick={() => setSlot(lvl, { used: slot.used > i ? i : i + 1 })} className={`h-3.5 w-3.5 rounded-sm border ${i < slot.used ? "bg-blood border-blood" : "bg-transparent border-gold/40"}`} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <span className="label">Spells</span>
        {!ro && (
          <div className="flex gap-2">
            <SrdPicker kind="spells" label="+ SRD spell" onSelectSpell={addFromSrd} />
            <button className="btn" onClick={addSpell}>+ Custom</button>
          </div>
        )}
      </div>
      {data.spells.length === 0 && <Empty text="No spells. Search the SRD or add your own." />}
      <div className="space-y-3">
        {Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b).map((lvl) => (
          <div key={lvl}>
            <div className="label mb-1">{lvl === 0 ? "Cantrips" : `Level ${lvl}`}</div>
            <div className="space-y-1">
              {spellsByLevel[lvl].map((s) => (
                <div key={s.id} className="grid grid-cols-[auto_1fr_64px_1fr_auto] items-center gap-2 text-sm">
                  <input type="checkbox" disabled={ro} checked={s.prepared} onChange={(e) => setSpell(s.id, { prepared: e.target.checked })} className="accent-gold" title="Prepared" />
                  <input className="inp" disabled={ro} placeholder="Spell name" value={s.name} onChange={(e) => setSpell(s.id, { name: e.target.value })} />
                  <select className="inp" disabled={ro} value={s.level} onChange={(e) => setSpell(s.id, { level: parseInt(e.target.value, 10) })}>
                    {Array.from({ length: 10 }, (_, i) => <option key={i} value={i}>{i === 0 ? "Cant." : `Lv ${i}`}</option>)}
                  </select>
                  <input className="inp" disabled={ro} placeholder="notes" value={s.notes || ""} onChange={(e) => setSpell(s.id, { notes: e.target.value })} />
                  {!ro && <button className="text-red-400 hover:text-red-300" onClick={() => removeSpell(s.id)}>✕</button>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- features (auto class + manual) ---------------- */

function Features({ ro, data, update }: SectionProps) {
  const earned = useMemo(() => earnedClassFeatures(data), [data]);
  const add = () => update({ features: [...data.features, { id: nanoid(), name: "", source: "", description: "" }] });
  const setF = (id: string, patch: Partial<FeatureEntry>) => update({ features: data.features.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const remove = (id: string) => update({ features: data.features.filter((f) => f.id !== id) });
  return (
    <div>
      {earned.map((cls) => (
        <div key={cls.className} className="mb-4">
          <div className="label mb-1">{cls.className} features (auto · levels 1–{cls.level})</div>
          <div className="flex flex-wrap gap-1">
            {cls.features.map((f, i) => (
              <span key={i} className="chip" title={`Gained at ${cls.className} level ${f.level}`}>
                {f.name} <span className="text-gold/50">L{f.level}</span>
              </span>
            ))}
            {cls.features.length === 0 && <span className="text-xs text-parchment/40">—</span>}
          </div>
        </div>
      ))}

      <div className="mb-2 flex items-center justify-between border-t border-gold/15 pt-3">
        <span className="label">Custom features, feats &amp; traits</span>
        {!ro && <button className="btn" onClick={add}>+ Add</button>}
      </div>
      {data.features.length === 0 && <Empty text="Add subclass features, feats, or content from any source." />}
      <div className="space-y-2">
        {data.features.map((f) => (
          <div key={f.id} className="rounded border border-gold/20 bg-black/20 p-2">
            <div className="flex items-center gap-2">
              <input className="inp font-display" disabled={ro} placeholder="Feature name" value={f.name} onChange={(e) => setF(f.id, { name: e.target.value })} />
              <input className="inp w-32" disabled={ro} placeholder="Source" value={f.source || ""} onChange={(e) => setF(f.id, { source: e.target.value })} />
              {!ro && <button className="text-red-400 hover:text-red-300" onClick={() => remove(f.id)}>✕</button>}
            </div>
            <textarea className="inp mt-1" disabled={ro} rows={2} placeholder="What it does…" value={f.description || ""} onChange={(e) => setF(f.id, { description: e.target.value })} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- inventory ---------------- */

function Equipment({ ro, data, update }: SectionProps) {
  const add = () => update({ equipment: [...data.equipment, { id: nanoid(), name: "", quantity: 1 }] });
  const setI = (id: string, patch: Partial<ItemEntry>) => update({ equipment: data.equipment.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const remove = (id: string) => update({ equipment: data.equipment.filter((i) => i.id !== id) });
  const addFromSrd = (w: { name: string; damage?: string; properties?: string }) =>
    update({ equipment: [...data.equipment, { id: nanoid(), name: w.name, quantity: 1, notes: [w.damage, w.properties].filter(Boolean).join(" · ") }] });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="panel-title">Inventory</h2>
        {!ro && (
          <div className="flex gap-2">
            <SrdPicker kind="equipment" label="+ SRD item" onSelectWeapon={addFromSrd} />
            <button className="btn" onClick={add}>+ Custom</button>
          </div>
        )}
      </div>
      {data.equipment.length === 0 && <Empty text="Bag is empty." />}
      <div className="space-y-1">
        {data.equipment.map((i) => (
          <div key={i.id} className="grid grid-cols-[56px_1fr_1fr_auto] items-center gap-2 text-sm">
            <input type="number" className="inp text-center" disabled={ro} value={i.quantity} onChange={(e) => setI(i.id, { quantity: clampInt(e.target.value, 0, 9999) })} />
            <input className="inp" disabled={ro} placeholder="Item" value={i.name} onChange={(e) => setI(i.id, { name: e.target.value })} />
            <input className="inp" disabled={ro} placeholder="notes" value={i.notes || ""} onChange={(e) => setI(i.id, { notes: e.target.value })} />
            {!ro && <button className="text-red-400 hover:text-red-300" onClick={() => remove(i.id)}>✕</button>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- background / story ---------------- */

function Background({ ro, data, update }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Background"><input className="inp" disabled={ro} value={data.background} placeholder="e.g. Soldier" onChange={(e) => update({ background: e.target.value })} /></Labeled>
        <TA ro={ro} label="Appearance" value={data.appearance} onChange={(v) => update({ appearance: v })} />
        <TA ro={ro} label="Personality Traits" value={data.personality} onChange={(v) => update({ personality: v })} />
        <TA ro={ro} label="Ideals" value={data.ideals} onChange={(v) => update({ ideals: v })} />
        <TA ro={ro} label="Bonds" value={data.bonds} onChange={(v) => update({ bonds: v })} />
        <TA ro={ro} label="Flaws" value={data.flaws} onChange={(v) => update({ flaws: v })} />
      </div>
      <TA ro={ro} label="Backstory" value={data.backstory} onChange={(v) => update({ backstory: v })} rows={6} />

      <div className="rounded border border-gold/20 bg-black/20 p-3">
        <h3 className="panel-title mb-2">Card &amp; Portrait</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Labeled label="Portrait image URL">
            <input className="inp" disabled={ro} value={data.avatarImageUrl} placeholder="https://… (leave blank for color)" onChange={(e) => update({ avatarImageUrl: e.target.value })} />
          </Labeled>
          <div>
            <div className="label mb-1">Stats shown on your card</div>
            <div className="flex flex-wrap gap-2">
              {CARD_STAT_OPTIONS.map((o) => {
                const on = data.cardStats.includes(o.key);
                return (
                  <button
                    key={o.key}
                    disabled={ro}
                    className={`chip ${on ? "bg-gold/25 text-gold" : ""}`}
                    onClick={() => update({ cardStats: on ? data.cardStats.filter((k) => k !== o.key) : [...data.cardStats, o.key] })}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- level guidance ---------------- */

function LevelGuidancePanel({ guidance, useXp, xp, update, ro, lvl }: { guidance: ReturnType<typeof levelGuidance>; useXp: boolean; xp: number; update: (p: Partial<CharacterData>) => void; ro: boolean; lvl: number }) {
  const nextThreshold = lvl < 20 ? XP_THRESHOLDS[lvl + 1] : null;
  const prevThreshold = XP_THRESHOLDS[lvl] ?? 0;
  const pct = nextThreshold ? Math.min(100, Math.round(((xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100)) : 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="panel-title">⚔ What&apos;s Next</h2>
        <label className="flex items-center gap-1 text-xs text-parchment/60">
          <input type="checkbox" disabled={ro} checked={useXp} onChange={(e) => update({ useXp: e.target.checked })} className="accent-gold" />
          Track by XP
        </label>
      </div>
      {useXp ? (
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="label">XP</span>
            <input type="number" className="inp w-32" disabled={ro} value={xp} onChange={(e) => update({ xp: clampInt(e.target.value, 0, 9999999) })} />
            {guidance.xpNeeded !== null && <span className="text-xs text-parchment/60">{guidance.xpNeeded.toLocaleString()} XP to level {guidance.nextLevel}</span>}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/50"><div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} /></div>
        </div>
      ) : (
        <p className="mb-3 text-xs text-parchment/50">Leveling manually — set class levels above. Toggle &quot;Track by XP&quot; to use the XP table.</p>
      )}
      {guidance.nextLevel === null ? (
        <p className="text-sm text-gold">Level 20 — the pinnacle of power!</p>
      ) : (
        <>
          {guidance.upcoming.length > 0 && (
            <div className="mb-3">
              <div className="label mb-1">Features you&apos;ll unlock next level</div>
              <ul className="space-y-1">
                {guidance.upcoming.map((u, i) => (
                  <li key={i} className="rounded border border-gold/20 bg-black/20 p-2 text-sm"><span className="font-display text-gold">{u.className} {u.atLevel}</span>{": "}{u.features.join(", ")}</li>
                ))}
              </ul>
            </div>
          )}
          {guidance.suggestions.length > 0 && (
            <ul className="list-inside list-disc space-y-1 text-xs text-parchment/70">{guidance.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function TA({ ro, label, value, onChange, rows = 2 }: { ro: boolean; label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return <div><div className="label mb-1">{label}</div><textarea className="inp" disabled={ro} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-parchment/50">{text}</p>;
}

function Pips({ ro, label, color, count, onChange }: { ro: boolean; label: string; color: "green" | "red"; count: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className={color === "green" ? "text-green-400" : "text-red-400"}>{label}</span>
      {[1, 2, 3].map((i) => (
        <button key={i} disabled={ro} onClick={() => onChange(count >= i ? i - 1 : i)} className={`h-4 w-4 rounded-full border ${count >= i ? (color === "green" ? "bg-green-500 border-green-500" : "bg-red-500 border-red-500") : "border-gold/40"}`} />
      ))}
    </div>
  );
}

function DeleteButton({ characterId, name }: { characterId: string; name: string }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <button className="text-xs text-red-400/70 hover:text-red-400" onClick={() => setConfirm(true)}>Delete character</button>;
  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-parchment/70">Delete &quot;{name}&quot;?</span>
      <button className="text-parchment/50 hover:text-parchment" onClick={() => setConfirm(false)}>cancel</button>
      <button className="font-semibold text-red-400" onClick={() => deleteCharacterAction(characterId)}>confirm</button>
    </span>
  );
}

function clampInt(v: string, min: number, max: number): number {
  const n = parseInt(v, 10);
  if (isNaN(n)) return min < 0 ? 0 : min;
  return Math.max(min, Math.min(max, n));
}
function modStr(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
