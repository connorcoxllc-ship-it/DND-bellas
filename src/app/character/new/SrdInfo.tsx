"use client";

import { useEffect, useState } from "react";

const API = "https://www.dnd5eapi.co/api";
const cache: Record<string, any> = {};

async function get(path: string) {
  if (cache[path]) return cache[path];
  const d = await fetch(`${API}/${path}`).then((r) => {
    if (!r.ok) throw new Error("not found");
    return r.json();
  });
  cache[path] = d;
  return d;
}

function joinDesc(desc: unknown): string {
  return Array.isArray(desc) ? desc.join("\n\n") : typeof desc === "string" ? desc : "";
}

type Status = "idle" | "loading" | "ready" | "error";

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">{children}</div>;
}
function Loading() {
  return <p className="text-xs text-parchment/40">Loading official SRD details…</p>;
}
function Unavailable({ note }: { note?: string }) {
  return <p className="text-xs text-parchment/40">{note || "Full description not in the SRD — see your sourcebook. The mechanics above are applied automatically."}</p>;
}
function Source() {
  return <p className="mt-2 text-[10px] text-parchment/30">Source: D&amp;D 5e SRD (Open Game Content)</p>;
}

// Maps builder display names → SRD API indices (null = not in SRD).
export function raceIndex(name: string): string | null {
  const m: Record<string, string> = {
    Human: "human", "Elf (High)": "elf", "Dwarf (Hill)": "dwarf",
    "Halfling (Lightfoot)": "halfling", Dragonborn: "dragonborn",
    "Gnome (Rock)": "gnome", "Half-Elf": "half-elf", "Half-Orc": "half-orc", Tiefling: "tiefling",
  };
  return m[name] || null;
}
export function classIndex(name: string): string | null {
  const known = ["barbarian", "bard", "cleric", "druid", "fighter", "monk", "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"];
  const idx = name.toLowerCase();
  return known.includes(idx) ? idx : null; // Artificer is not in the SRD
}

export function RaceInfo({ index }: { index: string | null }) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<any>(null);
  const [traits, setTraits] = useState<{ name: string; desc: string }[]>([]);

  useEffect(() => {
    if (!index) { setStatus("idle"); return; }
    let live = true;
    setStatus("loading"); setData(null); setTraits([]);
    get(`races/${index}`)
      .then(async (d) => {
        if (!live) return;
        setData(d);
        const ts = await Promise.all((d.traits || []).map((t: any) => get(`traits/${t.index}`).catch(() => null)));
        if (live) {
          setTraits(ts.filter(Boolean).map((t: any) => ({ name: t.name, desc: joinDesc(t.desc) })));
          setStatus("ready");
        }
      })
      .catch(() => live && setStatus("error"));
    return () => { live = false; };
  }, [index]);

  if (!index) return <Wrap><Unavailable note="This species isn't in the SRD; its traits are applied from the rules summary above." /></Wrap>;
  if (status === "loading" || status === "idle") return <Wrap><Loading /></Wrap>;
  if (status === "error") return <Wrap><Unavailable note="Couldn't reach the SRD database — try again, or continue (mechanics are still applied)." /></Wrap>;

  return (
    <Wrap>
      {data?.alignment && <p className="mb-2 text-parchment/70">{data.alignment}</p>}
      {data?.size_description && <p className="mb-2 text-parchment/60">{data.size_description}</p>}
      <div className="space-y-2">
        {traits.map((t, i) => (
          <div key={i}>
            <div className="font-display text-xs text-gold">{t.name}</div>
            <p className="whitespace-pre-wrap text-xs text-parchment/70">{t.desc}</p>
          </div>
        ))}
      </div>
      {data?.language_desc && <p className="mt-2 text-xs text-parchment/60">{data.language_desc}</p>}
      <Source />
    </Wrap>
  );
}

export function ClassInfo({ index }: { index: string | null }) {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!index) { setStatus("idle"); return; }
    let live = true;
    setStatus("loading"); setData(null);
    get(`classes/${index}`)
      .then((d) => { if (live) { setData(d); setStatus("ready"); } })
      .catch(() => live && setStatus("error"));
    return () => { live = false; };
  }, [index]);

  if (!index) return <Wrap><Unavailable note="This class isn't in the SRD; its features are applied from the rules summary above." /></Wrap>;
  if (status === "loading" || status === "idle") return <Wrap><Loading /></Wrap>;
  if (status === "error") return <Wrap><Unavailable note="Couldn't reach the SRD database — mechanics are still applied." /></Wrap>;

  const names = (a: any[]) => (a || []).map((x) => x.name).join(", ");
  return (
    <Wrap>
      <ul className="space-y-1 text-xs text-parchment/75">
        <li><span className="text-parchment/45">Hit die:</span> d{data?.hit_die}</li>
        <li><span className="text-parchment/45">Proficiencies:</span> {names(data?.proficiencies)}</li>
        <li><span className="text-parchment/45">Saving throws:</span> {names(data?.saving_throws)}</li>
        {(data?.proficiency_choices || []).map((pc: any, i: number) => (
          <li key={i}><span className="text-parchment/45">Choose:</span> {pc.desc}</li>
        ))}
      </ul>
      <Source />
    </Wrap>
  );
}

export function FeatureDesc({ index, name }: { index: string; name: string }) {
  const [desc, setDesc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || desc !== null) return;
    get(`features/${index}`).then((d) => setDesc(joinDesc(d.desc) || "")).catch(() => setDesc(""));
  }, [open, index, desc]);
  return (
    <div>
      <button className="chip" onClick={() => setOpen((o) => !o)}>{name} {open ? "▾" : "▸"}</button>
      {open && (
        <p className="mt-1 whitespace-pre-wrap text-xs text-parchment/65">
          {desc === null ? "Loading…" : desc || "Description not in the SRD — see your sourcebook."}
        </p>
      )}
    </div>
  );
}
