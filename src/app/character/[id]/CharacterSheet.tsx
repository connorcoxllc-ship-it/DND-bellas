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
  recommendedFullCasterSlots,
} from "@/lib/dnd/compute";
import DiceRoller, { useDice } from "./DiceRoller";

type SaveState = "idle" | "saving" | "saved" | "error";

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
  const dice = useDice();
  const firstRender = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave.
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

  return (
    <div className="space-y-4">
      {/* Save indicator */}
      {canEdit && (
        <div className="flex items-center justify-between">
          <SaveBadge state={saveState} />
          <DeleteButton characterId={characterId} name={data.name} />
        </div>
      )}

      {/* Header */}
      <section className="panel p-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={data.avatarColor}
              disabled={ro}
              onChange={(e) => update({ avatarColor: e.target.value })}
              className="h-12 w-12 cursor-pointer rounded-full border border-gold/40 bg-transparent"
              title="Avatar color"
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 font-display text-3xl" style={{ background: data.avatarColor }}>
              {data.name?.[0]?.toUpperCase() || "?"}
            </div>
          </div>
          <div className="min-w-[200px] flex-1">
            <input
              className="w-full bg-transparent font-display text-2xl text-gold outline-none placeholder:text-gold/30"
              value={data.name}
              disabled={ro}
              placeholder="Character name"
              onChange={(e) => update({ name: e.target.value })}
            />
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Labeled label="Race">
                <EditableSelect ro={ro} value={data.race} options={COMMON_RACES} freeText onChange={(v) => update({ race: v })} placeholder="Race" />
              </Labeled>
              <Labeled label="Background">
                <input className="inp" disabled={ro} value={data.background} placeholder="Background" onChange={(e) => update({ background: e.target.value })} />
              </Labeled>
              <Labeled label="Alignment">
                <select className="inp" disabled={ro} value={data.alignment} onChange={(e) => update({ alignment: e.target.value })}>
                  {ALIGNMENTS.map((a) => <option key={a}>{a}</option>)}
                </select>
              </Labeled>
              <Labeled label="Total Level">
                <div className="stat-box py-1 text-xl font-display text-gold">{lvl}</div>
              </Labeled>
            </div>
          </div>
        </div>

        {/* Classes */}
        <div className="mt-4">
          <div className="label mb-1">Classes</div>
          <ClassEditor ro={ro} data={data} update={update} />
        </div>

        {/* Campaign assignment (owner only) */}
        {canEdit && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="label">Campaign</span>
            <select
              className="inp max-w-xs"
              value={campaignId ?? ""}
              onChange={(e) => setCampaignId(e.target.value || null)}
            >
              <option value="">Private (not shared)</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <span className="text-xs text-parchment/40">Share with your party</span>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Left column: abilities, saves, skills */}
        <div className="space-y-4">
          <AbilityScores ro={ro} data={data} update={update} pb={pb} roll={dice.roll} />
          <SavingThrows ro={ro} data={data} update={update} roll={dice.roll} />
          <Skills ro={ro} data={data} update={update} roll={dice.roll} />
          <div className="panel p-3 text-center">
            <div className="label">Passive Perception</div>
            <div className="font-display text-2xl text-gold">{passivePerception(data)}</div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <CombatStats ro={ro} data={data} update={update} pb={pb} roll={dice.roll} />
          <LevelGuidancePanel guidance={guidance} useXp={data.useXp} xp={data.xp} update={update} ro={ro} lvl={lvl} />
          <Attacks ro={ro} data={data} update={update} roll={dice.roll} />
          <Spellcasting ro={ro} data={data} update={update} roll={dice.roll} />
          <Features ro={ro} data={data} update={update} />
          <Equipment ro={ro} data={data} update={update} />
          <ProficienciesAndStory ro={ro} data={data} update={update} />
        </div>
      </div>

      <DiceRoller {...dice} />
    </div>
  );
}

/* ---------------- small primitives ---------------- */

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label">{label}</div>
      {children}
    </div>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  const map: Record<SaveState, { t: string; c: string }> = {
    idle: { t: "All changes saved", c: "text-parchment/40" },
    saving: { t: "Saving…", c: "text-gold" },
    saved: { t: "Saved ✓", c: "text-green-400" },
    error: { t: "Save failed — check connection", c: "text-red-400" },
  };
  return <span className={`text-xs ${map[state].c}`}>{map[state].t}</span>;
}

function EditableSelect({
  ro, value, options, onChange, freeText, placeholder,
}: {
  ro: boolean; value: string; options: string[]; onChange: (v: string) => void; freeText?: boolean; placeholder?: string;
}) {
  const known = options.includes(value);
  const [custom, setCustom] = useState(!known && value !== "");
  if (custom && freeText) {
    return (
      <input className="inp" disabled={ro} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onBlur={() => { if (!value) setCustom(false); }} />
    );
  }
  return (
    <select
      className="inp"
      disabled={ro}
      value={known ? value : ""}
      onChange={(e) => {
        if (e.target.value === "__custom__") { setCustom(true); onChange(""); }
        else onChange(e.target.value);
      }}
    >
      <option value="">{placeholder || "—"}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
      {freeText && <option value="__custom__">Other…</option>}
    </select>
  );
}

/* ---------------- abilities ---------------- */

function AbilityScores({ ro, data, update, pb, roll }: SectionProps & { pb: number; roll: RollFn }) {
  return (
    <section className="panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="panel-title">Ability Scores</h2>
        <span className="chip">Prof +{pb}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ABILITIES.map((a) => {
          const score = data.abilities[a.key];
          const mod = abilityModifier(score);
          return (
            <div key={a.key} className="stat-box">
              <div className="label">{a.label}</div>
              <input
                type="number"
                className="w-16 bg-transparent text-center font-display text-2xl text-parchment outline-none"
                value={score}
                disabled={ro}
                onChange={(e) => update({ abilities: { ...data.abilities, [a.key]: clampInt(e.target.value, 1, 30) } })}
              />
              <button
                className="mt-1 rounded bg-gold/10 px-2 text-sm text-gold hover:bg-gold/20"
                onClick={() => roll(`1d20${modStr(mod)}`, `${a.label} check`)}
                title="Roll a check"
              >
                {formatMod(mod)}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SavingThrows({ ro, data, update, roll }: SectionProps & { roll: RollFn }) {
  const toggle = (k: AbilityKey) => {
    const has = data.savingThrowProficiencies.includes(k);
    update({
      savingThrowProficiencies: has
        ? data.savingThrowProficiencies.filter((x) => x !== k)
        : [...data.savingThrowProficiencies, k],
    });
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
              <input type="checkbox" disabled={ro} checked={prof} onChange={() => toggle(a.key)} className="accent-gold" />
              <span className="flex-1">{a.label}</span>
              <button className="rounded bg-gold/10 px-2 font-medium text-gold hover:bg-gold/20" onClick={() => roll(`1d20${modStr(bonus)}`, `${a.label} save`)}>
                {formatMod(bonus)}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

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
      <h2 className="panel-title mb-2">Skills</h2>
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
              <span className="flex-1 truncate">
                {s.label} <span className="text-[10px] uppercase text-parchment/40">{s.ability}</span>
              </span>
              <button className="rounded bg-gold/10 px-2 font-medium text-gold hover:bg-gold/20" onClick={() => roll(`1d20${modStr(bonus)}`, s.label)}>
                {formatMod(bonus)}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- combat ---------------- */

function CombatStats({ ro, data, update, pb, roll }: SectionProps & { pb: number; roll: RollFn }) {
  const init = initiative(data);
  return (
    <section className="panel p-4">
      <h2 className="panel-title mb-3">Combat</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatNum ro={ro} label="Armor Class" value={data.armorClass} onChange={(v) => update({ armorClass: v })} />
        <div className="stat-box">
          <div className="label">Initiative</div>
          <button className="font-display text-2xl text-gold" onClick={() => roll(`1d20${modStr(init)}`, "Initiative")}>{formatMod(init)}</button>
        </div>
        <StatNum ro={ro} label="Speed" value={data.speed} onChange={(v) => update({ speed: v })} />
        <StatNum ro={ro} label="Max HP" value={data.maxHp} onChange={(v) => update({ maxHp: v })} />
        <StatNum ro={ro} label="Current HP" value={data.currentHp} onChange={(v) => update({ currentHp: v })} />
        <StatNum ro={ro} label="Temp HP" value={data.tempHp} onChange={(v) => update({ tempHp: v })} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Labeled label="Hit Dice">
          <input className="inp" disabled={ro} value={data.hitDice} placeholder="5d8" onChange={(e) => update({ hitDice: e.target.value })} />
        </Labeled>
        <div>
          <div className="label">Death Saves</div>
          <div className="flex items-center gap-3 text-sm">
            <Pips ro={ro} label="✓" color="green" count={data.deathSaves.successes} onChange={(n) => update({ deathSaves: { ...data.deathSaves, successes: n } })} />
            <Pips ro={ro} label="✗" color="red" count={data.deathSaves.failures} onChange={(n) => update({ deathSaves: { ...data.deathSaves, failures: n } })} />
          </div>
        </div>
        <div>
          <div className="label">Status</div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" disabled={ro} checked={data.inspiration} onChange={(e) => update({ inspiration: e.target.checked })} className="accent-gold" />
            Inspiration
          </label>
        </div>
      </div>

      <div className="mt-3">
        <div className="label">Conditions</div>
        <TagInput ro={ro} tags={data.conditions} onChange={(t) => update({ conditions: t })} placeholder="add a condition (e.g. Poisoned)" />
      </div>
    </section>
  );
}

function StatNum({ ro, label, value, onChange }: { ro: boolean; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="stat-box">
      <div className="label">{label}</div>
      <input
        type="number"
        className="w-full bg-transparent text-center font-display text-2xl text-parchment outline-none"
        value={value}
        disabled={ro}
        onChange={(e) => onChange(clampInt(e.target.value, -999, 9999))}
      />
    </div>
  );
}

function Pips({ ro, label, color, count, onChange }: { ro: boolean; label: string; color: "green" | "red"; count: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className={color === "green" ? "text-green-400" : "text-red-400"}>{label}</span>
      {[1, 2, 3].map((i) => (
        <button
          key={i}
          disabled={ro}
          onClick={() => onChange(count >= i ? i - 1 : i)}
          className={`h-4 w-4 rounded-full border ${count >= i ? (color === "green" ? "bg-green-500 border-green-500" : "bg-red-500 border-red-500") : "border-gold/40"}`}
        />
      ))}
    </div>
  );
}

/* ---------------- level guidance ---------------- */

function LevelGuidancePanel({
  guidance, useXp, xp, update, ro, lvl,
}: {
  guidance: ReturnType<typeof levelGuidance>; useXp: boolean; xp: number; update: (p: Partial<CharacterData>) => void; ro: boolean; lvl: number;
}) {
  const nextThreshold = lvl < 20 ? XP_THRESHOLDS[lvl + 1] : null;
  const prevThreshold = XP_THRESHOLDS[lvl] ?? 0;
  const pct = nextThreshold ? Math.min(100, Math.round(((xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100)) : 100;

  return (
    <section className="panel border-gold/50 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="panel-title">⚔ What&apos;s Next — Level-Up Guide</h2>
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
            {guidance.xpNeeded !== null && (
              <span className="text-xs text-parchment/60">
                {guidance.xpNeeded.toLocaleString()} XP to level {guidance.nextLevel}
              </span>
            )}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/50">
            <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : (
        <p className="mb-3 text-xs text-parchment/50">
          Leveling manually — set class levels above. Toggle &quot;Track by XP&quot; to use the XP table.
        </p>
      )}

      {guidance.nextLevel === null ? (
        <p className="text-sm text-gold">You&apos;ve reached level 20 — the pinnacle of power!</p>
      ) : (
        <>
          {guidance.upcoming.length > 0 && (
            <div className="mb-3">
              <div className="label mb-1">Features you&apos;ll unlock next level</div>
              <ul className="space-y-1">
                {guidance.upcoming.map((u, i) => (
                  <li key={i} className="rounded border border-gold/20 bg-black/20 p-2 text-sm">
                    <span className="font-display text-gold">{u.className} {u.atLevel}</span>
                    {": "}
                    {u.features.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {guidance.suggestions.length > 0 && (
            <ul className="list-inside list-disc space-y-1 text-xs text-parchment/70">
              {guidance.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/* ---------------- classes ---------------- */

function ClassEditor({ ro, data, update }: SectionProps) {
  const setClass = (i: number, patch: Partial<CharacterData["classes"][number]>) => {
    const classes = data.classes.map((c, idx) => (idx === i ? { ...c, ...patch } : c));
    update({ classes });
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
          <input className="inp w-24" disabled={ro} placeholder="Subclass" value={c.subclass || ""} onChange={(e) => setClass(i, { subclass: e.target.value })} />
          <div className="flex items-center gap-1">
            <span className="label">Lvl</span>
            <input type="number" className="inp w-16" disabled={ro} value={c.level} onChange={(e) => setClass(i, { level: clampInt(e.target.value, 1, 20) })} />
          </div>
          {CLASSES[c.name] && <span className="chip">d{CLASSES[c.name].hitDie}</span>}
          {!ro && data.classes.length > 1 && (
            <button className="text-red-400 hover:text-red-300" onClick={() => remove(i)}>✕</button>
          )}
        </div>
      ))}
      {!ro && (
        <button className="btn" onClick={add}>+ Multiclass</button>
      )}
    </div>
  );
}

/* ---------------- attacks ---------------- */

function Attacks({ ro, data, update, roll }: SectionProps & { roll: RollFn }) {
  const add = () => update({ attacks: [...data.attacks, { id: nanoid(), name: "", bonus: "", damage: "" }] });
  const setA = (id: string, patch: Partial<AttackEntry>) => update({ attacks: data.attacks.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const remove = (id: string) => update({ attacks: data.attacks.filter((a) => a.id !== id) });
  return (
    <section className="panel p-4">
      <SectionHead title="Attacks & Spell Attacks" onAdd={ro ? undefined : add} />
      {data.attacks.length === 0 && <Empty ro={ro} text="No attacks yet." />}
      <div className="space-y-2">
        {data.attacks.map((a) => (
          <div key={a.id} className="grid grid-cols-[1fr_70px_1fr_auto] items-center gap-2 text-sm">
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
    </section>
  );
}

/* ---------------- spellcasting ---------------- */

function Spellcasting({ ro, data, update, roll }: SectionProps & { roll: RollFn }) {
  const dc = spellSaveDc(data);
  const atk = spellAttackBonus(data);
  const addSpell = () => update({ spells: [...data.spells, { id: nanoid(), name: "", level: 1, prepared: false }] });
  const setSpell = (id: string, patch: Partial<SpellEntry>) => update({ spells: data.spells.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeSpell = (id: string) => update({ spells: data.spells.filter((s) => s.id !== id) });
  const setSlot = (lvl: number, patch: Partial<{ max: number; used: number }>) =>
    update({ spellSlots: { ...data.spellSlots, [lvl]: { ...data.spellSlots[lvl], ...patch } } });

  const applyRecommended = () => {
    const rec = recommendedFullCasterSlots(data);
    const next = { ...data.spellSlots };
    for (let i = 0; i < 9; i++) next[i + 1] = { max: rec[i], used: Math.min(data.spellSlots[i + 1]?.used || 0, rec[i]) };
    update({ spellSlots: next });
  };

  const spellsByLevel = useMemo(() => {
    const map: Record<number, SpellEntry[]> = {};
    for (const s of data.spells) (map[s.level] ??= []).push(s);
    return map;
  }, [data.spells]);

  return (
    <section className="panel p-4">
      <h2 className="panel-title mb-3">Spellcasting</h2>
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Labeled label="Ability">
          <select className="inp" disabled={ro} value={data.spellcastingAbility ?? ""} onChange={(e) => update({ spellcastingAbility: (e.target.value || null) as AbilityKey | null })}>
            <option value="">None</option>
            {ABILITIES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </Labeled>
        <div className="stat-box">
          <div className="label">Save DC</div>
          <div className="font-display text-2xl text-gold">{dc ?? "—"}</div>
        </div>
        <div className="stat-box">
          <div className="label">Spell Atk</div>
          <button className="font-display text-2xl text-gold" disabled={atk === null} onClick={() => atk !== null && roll(`1d20${modStr(atk)}`, "Spell attack")}>{atk !== null ? formatMod(atk) : "—"}</button>
        </div>
        {!ro && (
          <button className="btn self-end" onClick={applyRecommended} title="Fill slots from the full-caster table">Auto slots</button>
        )}
      </div>

      {/* Spell slots */}
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
                    <button key={i} onClick={() => setSlot(lvl, { used: slot.used > i ? i : i + 1 })} className={`h-3.5 w-3.5 rounded-sm border ${i < slot.used ? "bg-blood border-blood" : "bg-transparent border-gold/40"}`} title={i < slot.used ? "used" : "available"} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Spell list */}
      <SectionHead title="Known / Prepared Spells" onAdd={ro ? undefined : addSpell} small />
      {data.spells.length === 0 && <Empty ro={ro} text="No spells added." />}
      <div className="space-y-3">
        {Object.keys(spellsByLevel).map(Number).sort((a, b) => a - b).map((lvl) => (
          <div key={lvl}>
            <div className="label mb-1">{lvl === 0 ? "Cantrips" : `Level ${lvl}`}</div>
            <div className="space-y-1">
              {spellsByLevel[lvl].map((s) => (
                <div key={s.id} className="grid grid-cols-[auto_1fr_70px_1fr_auto] items-center gap-2 text-sm">
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
    </section>
  );
}

/* ---------------- features ---------------- */

function Features({ ro, data, update }: SectionProps) {
  const add = () => update({ features: [...data.features, { id: nanoid(), name: "", source: "", description: "" }] });
  const setF = (id: string, patch: Partial<FeatureEntry>) => update({ features: data.features.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const remove = (id: string) => update({ features: data.features.filter((f) => f.id !== id) });
  return (
    <section className="panel p-4">
      <SectionHead title="Features & Traits" onAdd={ro ? undefined : add} />
      {data.features.length === 0 && <Empty ro={ro} text="No features yet. Add class/race/feat features from any source." />}
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
    </section>
  );
}

/* ---------------- equipment ---------------- */

function Equipment({ ro, data, update }: SectionProps) {
  const add = () => update({ equipment: [...data.equipment, { id: nanoid(), name: "", quantity: 1 }] });
  const setI = (id: string, patch: Partial<ItemEntry>) => update({ equipment: data.equipment.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const remove = (id: string) => update({ equipment: data.equipment.filter((i) => i.id !== id) });
  return (
    <section className="panel p-4">
      <SectionHead title="Equipment & Inventory" onAdd={ro ? undefined : add} />
      {data.equipment.length === 0 && <Empty ro={ro} text="Bag is empty." />}
      <div className="space-y-1">
        {data.equipment.map((i) => (
          <div key={i.id} className="grid grid-cols-[60px_1fr_1fr_auto] items-center gap-2 text-sm">
            <input type="number" className="inp text-center" disabled={ro} value={i.quantity} onChange={(e) => setI(i.id, { quantity: clampInt(e.target.value, 0, 9999) })} />
            <input className="inp" disabled={ro} placeholder="Item" value={i.name} onChange={(e) => setI(i.id, { name: e.target.value })} />
            <input className="inp" disabled={ro} placeholder="notes" value={i.notes || ""} onChange={(e) => setI(i.id, { notes: e.target.value })} />
            {!ro && <button className="text-red-400 hover:text-red-300" onClick={() => remove(i.id)}>✕</button>}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- story ---------------- */

function ProficienciesAndStory({ ro, data, update }: SectionProps) {
  return (
    <section className="panel p-4">
      <h2 className="panel-title mb-3">Proficiencies, Personality &amp; Story</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <TA ro={ro} label="Proficiencies & Languages" value={data.proficienciesAndLanguages} onChange={(v) => update({ proficienciesAndLanguages: v })} />
        <TA ro={ro} label="Appearance" value={data.appearance} onChange={(v) => update({ appearance: v })} />
        <TA ro={ro} label="Personality Traits" value={data.personality} onChange={(v) => update({ personality: v })} />
        <TA ro={ro} label="Ideals" value={data.ideals} onChange={(v) => update({ ideals: v })} />
        <TA ro={ro} label="Bonds" value={data.bonds} onChange={(v) => update({ bonds: v })} />
        <TA ro={ro} label="Flaws" value={data.flaws} onChange={(v) => update({ flaws: v })} />
      </div>
      <div className="mt-3 grid gap-3">
        <TA ro={ro} label="Backstory" value={data.backstory} onChange={(v) => update({ backstory: v })} rows={4} />
        <TA ro={ro} label="Notes" value={data.notes} onChange={(v) => update({ notes: v })} rows={3} />
      </div>
    </section>
  );
}

function TA({ ro, label, value, onChange, rows = 2 }: { ro: boolean; label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div>
      <div className="label mb-1">{label}</div>
      <textarea className="inp" disabled={ro} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function SectionHead({ title, onAdd, small }: { title: string; onAdd?: () => void; small?: boolean }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className={small ? "label" : "panel-title"}>{title}</h2>
      {onAdd && <button className="btn" onClick={onAdd}>+ Add</button>}
    </div>
  );
}

function Empty({ text }: { ro: boolean; text: string }) {
  return <p className="text-sm text-parchment/50">{text}</p>;
}

function TagInput({ ro, tags, onChange, placeholder }: { ro: boolean; tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t, i) => (
        <span key={i} className="chip">
          {t}
          {!ro && <button className="text-red-400" onClick={() => onChange(tags.filter((_, idx) => idx !== i))}>×</button>}
        </span>
      ))}
      {!ro && (
        <input
          className="inp w-40"
          value={val}
          placeholder={placeholder}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && val.trim()) { e.preventDefault(); onChange([...tags, val.trim()]); setVal(""); }
          }}
        />
      )}
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

/* ---------------- types & utils ---------------- */

type RollFn = (expr: string, label?: string) => unknown;
interface SectionProps {
  ro: boolean;
  data: CharacterData;
  update: (patch: Partial<CharacterData>) => void;
}

function clampInt(v: string, min: number, max: number): number {
  const n = parseInt(v, 10);
  if (isNaN(n)) return min < 0 ? 0 : min;
  return Math.max(min, Math.min(max, n));
}
function modStr(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
