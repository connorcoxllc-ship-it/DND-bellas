"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { saveCampaignDataAction } from "../../actions";
import { CampaignData, CampaignPanel, Combatant } from "@/lib/dnd/dashboard";
import { passivePerception, initiative, formatMod } from "@/lib/dnd/compute";
import type { CardRow } from "../../_components/CharacterCard";
import CharacterCard from "../../_components/CharacterCard";

export default function CampaignHome({
  campaignId,
  name,
  joinCode,
  isDm,
  initialData,
  members,
  characters,
}: {
  campaignId: string;
  name: string;
  joinCode: string;
  isDm: boolean;
  initialData: CampaignData;
  members: { user_id: string; display_name: string; role: string }[];
  characters: CardRow[];
}) {
  const [data, setData] = useState<CampaignData>(initialData);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDm) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      await saveCampaignDataAction(campaignId, data);
      setSaved("saved");
      setTimeout(() => setSaved("idle"), 1200);
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, isDm, campaignId]);

  const update = (patch: Partial<CampaignData>) => setData((d) => ({ ...d, ...patch }));
  const ro = !isDm;

  // Panels
  const addPanel = () => update({ panels: [...data.panels, { id: nanoid(), title: "New Section", body: "" }] });
  const setPanel = (id: string, patch: Partial<CampaignPanel>) => update({ panels: data.panels.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const removePanel = (id: string) => update({ panels: data.panels.filter((p) => p.id !== id) });

  // Initiative
  const init = data.initiative;
  const setInit = (patch: Partial<CampaignData["initiative"]>) => update({ initiative: { ...init, ...patch } });
  const addCombatant = () => setInit({ combatants: [...init.combatants, { id: nanoid(), name: "", init: 10 }] });
  const importParty = () => {
    const existing = new Set(init.combatants.map((c) => c.name.toLowerCase()));
    const add: Combatant[] = characters
      .filter((c) => !existing.has(c.name.toLowerCase()))
      .map((c) => ({ id: nanoid(), name: c.name, init: initiative(c.data), hp: c.data.currentHp, ac: c.data.armorClass }));
    setInit({ combatants: [...init.combatants, ...add] });
  };
  const setCombatant = (id: string, patch: Partial<Combatant>) => setInit({ combatants: init.combatants.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const removeCombatant = (id: string) => setInit({ combatants: init.combatants.filter((c) => c.id !== id) });
  const sorted = useMemo(() => [...init.combatants].sort((a, b) => b.init - a.init), [init.combatants]);
  const nextTurn = () => {
    if (sorted.length === 0) return;
    let turn = init.turn + 1;
    let round = init.round;
    if (turn >= sorted.length) { turn = 0; round += 1; }
    setInit({ turn, round });
  };

  return (
    <div className="space-y-4">
      {/* Banner */}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between p-5" style={{ background: `linear-gradient(135deg, ${data.bannerColor}cc, transparent)` }}>
          <div>
            <h1 className="font-display text-3xl text-parchment drop-shadow">{name}</h1>
            <p className="text-xs text-parchment/70">Invite code: <span className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-gold">{joinCode}</span></p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {isDm && <span className="text-xs text-parchment/50">{saved === "saving" ? "Saving…" : saved === "saved" ? "Saved ✓" : "DM — editable"}</span>}
            {isDm && (
              <div className="flex items-center gap-2">
                <span className="label">Banner</span>
                <input type="color" value={data.bannerColor} onChange={(e) => update({ bannerColor: e.target.value })} className="h-7 w-10 cursor-pointer rounded border border-gold/30 bg-transparent" />
              </div>
            )}
          </div>
        </div>
        <div className="p-4">
          {ro ? (
            data.description ? <p className="whitespace-pre-wrap text-sm text-parchment/80">{data.description}</p> : <p className="text-sm text-parchment/40">No description yet.</p>
          ) : (
            <textarea className="inp" rows={3} placeholder="Describe your campaign — the hook, the world, the stakes…" value={data.description} onChange={(e) => update({ description: e.target.value })} />
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Info panels */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="panel-title">Campaign Info</h2>
            {isDm && <button className="btn" onClick={addPanel}>+ Section</button>}
          </div>
          {data.panels.length === 0 && <p className="text-sm text-parchment/50">{isDm ? "Add house rules, quest log, NPCs, session notes…" : "The DM hasn't added any info yet."}</p>}
          {data.panels.map((p) => (
            <div key={p.id} className="panel p-3">
              {ro ? (
                <>
                  <h3 className="mb-1 font-display text-gold">{p.title}</h3>
                  <p className="whitespace-pre-wrap text-sm text-parchment/80">{p.body}</p>
                </>
              ) : (
                <>
                  <div className="mb-1 flex items-center gap-2">
                    <input className="inp font-display" value={p.title} onChange={(e) => setPanel(p.id, { title: e.target.value })} />
                    <button className="text-red-400 hover:text-red-300" onClick={() => removePanel(p.id)}>✕</button>
                  </div>
                  <textarea className="inp" rows={4} value={p.body} placeholder="Details…" onChange={(e) => setPanel(p.id, { body: e.target.value })} />
                </>
              )}
            </div>
          ))}
        </section>

        {/* Party overview + initiative */}
        <section className="space-y-3">
          <div>
            <h2 className="panel-title mb-2">Party Overview</h2>
            <div className="panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gold/20 text-[10px] uppercase text-gold/60">
                    <th className="p-2 text-left">Character</th><th className="p-2">HP</th><th className="p-2">AC</th><th className="p-2">PP</th><th className="p-2">Init</th>
                  </tr>
                </thead>
                <tbody>
                  {characters.length === 0 && <tr><td colSpan={5} className="p-3 text-center text-parchment/40">No characters in this campaign yet.</td></tr>}
                  {characters.map((c) => (
                    <tr key={c.id} className="border-b border-gold/10 last:border-0">
                      <td className="p-2"><span className="font-medium text-parchment">{c.name}</span> <span className="text-xs text-parchment/50">{c.owner_name}</span></td>
                      <td className="p-2 text-center">{c.data.currentHp}/{c.data.maxHp}</td>
                      <td className="p-2 text-center">{c.data.armorClass}</td>
                      <td className="p-2 text-center">{passivePerception(c.data)}</td>
                      <td className="p-2 text-center">{formatMod(initiative(c.data))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="panel-title">Initiative Tracker</h2>
              {isDm && (
                <div className="flex gap-2">
                  <button className="btn" onClick={importParty}>Import party</button>
                  <button className="btn" onClick={addCombatant}>+ Combatant</button>
                </div>
              )}
            </div>
            <div className="panel p-3">
              <div className="mb-2 flex items-center gap-3 text-sm">
                <span className="chip">Round {init.round}</span>
                {isDm && <button className="btn" onClick={nextTurn}>Next turn ▶</button>}
                {isDm && init.combatants.length > 0 && <button className="btn" onClick={() => setInit({ round: 1, turn: 0 })}>Reset</button>}
              </div>
              {sorted.length === 0 ? (
                <p className="text-sm text-parchment/50">{isDm ? "Add combatants or import the party to start tracking turns." : "No combat in progress."}</p>
              ) : (
                <ul className="space-y-1">
                  {sorted.map((c, idx) => (
                    <li key={c.id} className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${idx === init.turn ? "bg-gold/20 ring-1 ring-gold" : "bg-black/20"}`}>
                      <span className="w-6 text-center font-display text-gold">{c.init}</span>
                      {ro ? <span className="flex-1">{c.name || "—"}</span> : (
                        <input className="inp flex-1 py-0.5" value={c.name} placeholder="Name" onChange={(e) => setCombatant(c.id, { name: e.target.value })} />
                      )}
                      {!ro && <input type="number" className="inp w-14 py-0.5 text-center" value={c.init} onChange={(e) => setCombatant(c.id, { init: parseInt(e.target.value, 10) || 0 })} title="Initiative" />}
                      {c.hp !== undefined && <span className="text-xs text-parchment/60">{c.hp} hp</span>}
                      {c.ac !== undefined && <span className="text-xs text-parchment/60">AC {c.ac}</span>}
                      {!ro && <button className="text-red-400 hover:text-red-300" onClick={() => removeCombatant(c.id)}>✕</button>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Characters in campaign */}
      <section>
        <h2 className="panel-title mb-2">Characters</h2>
        {characters.length === 0 ? (
          <p className="text-sm text-parchment/50">No characters assigned to this campaign yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((c) => <CharacterCard key={c.id} ch={c} ownerLabel={c.owner_name || "Player"} />)}
          </div>
        )}
      </section>

      {/* Members */}
      <section className="panel p-3">
        <h2 className="panel-title mb-2">Members</h2>
        <div className="flex flex-wrap gap-1">
          {members.map((m) => <span key={m.user_id} className="chip">{m.display_name}{m.role === "dm" ? " (DM)" : ""}</span>)}
        </div>
      </section>
    </div>
  );
}
