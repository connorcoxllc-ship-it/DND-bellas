"use client";

import { useEffect, useRef, useState } from "react";

const API = "https://www.dnd5eapi.co/api";

interface SrdRef {
  index: string;
  name: string;
  url: string;
}

// Cache index lists across mounts for the session.
const listCache: Record<string, SrdRef[]> = {};

export interface SrdSpell {
  name: string;
  level: number;
  school?: string;
  desc?: string;
}
export interface SrdWeapon {
  name: string;
  damage?: string;
  properties?: string;
}

export default function SrdPicker({
  kind,
  label,
  onSelectSpell,
  onSelectWeapon,
  disabled,
}: {
  kind: "spells" | "equipment";
  label: string;
  onSelectSpell?: (s: SrdSpell) => void;
  onSelectWeapon?: (w: SrdWeapon) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [list, setList] = useState<SrdRef[]>(listCache[kind] || []);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ready">(
    listCache[kind] ? "ready" : "idle"
  );
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || listCache[kind]) return;
    setStatus("loading");
    fetch(`${API}/${kind}`)
      .then((r) => r.json())
      .then((d) => {
        const results: SrdRef[] = d.results || [];
        listCache[kind] = results;
        setList(results);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [open, kind]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const matches =
    q.trim().length === 0
      ? list.slice(0, 30)
      : list.filter((i) => i.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40);

  async function pick(ref: SrdRef) {
    try {
      const d = await fetch(`${API}/${kind}/${ref.index}`).then((r) => r.json());
      if (kind === "spells" && onSelectSpell) {
        onSelectSpell({
          name: d.name,
          level: d.level ?? 0,
          school: d.school?.name,
          desc: Array.isArray(d.desc) ? d.desc.join("\n\n") : d.desc,
        });
      } else if (kind === "equipment" && onSelectWeapon) {
        const dmg = d.damage
          ? `${d.damage.damage_dice}${d.damage.damage_type ? " " + d.damage.damage_type.name.toLowerCase() : ""}`
          : "";
        const props = (d.properties || []).map((p: { name: string }) => p.name).join(", ");
        onSelectWeapon({ name: d.name, damage: dmg, properties: props });
      }
    } catch {
      // If detail fetch fails, fall back to just the name.
      if (kind === "spells" && onSelectSpell) onSelectSpell({ name: ref.name, level: 0 });
      if (kind === "equipment" && onSelectWeapon) onSelectWeapon({ name: ref.name });
    }
    setOpen(false);
    setQ("");
  }

  if (disabled) return null;

  return (
    <div className="relative inline-block" ref={boxRef}>
      <button type="button" className="btn" onClick={() => setOpen((o) => !o)}>
        {label}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-72 panel p-2">
          <input
            autoFocus
            className="inp mb-2"
            placeholder={`Search SRD ${kind}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto">
            {status === "loading" && <p className="p-2 text-xs text-parchment/50">Loading…</p>}
            {status === "error" && (
              <p className="p-2 text-xs text-red-400">
                Couldn&apos;t reach the SRD database. You can still add entries manually.
              </p>
            )}
            {status === "ready" &&
              matches.map((m) => (
                <button
                  key={m.index}
                  className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-gold/15"
                  onClick={() => pick(m)}
                >
                  {m.name}
                </button>
              ))}
            {status === "ready" && matches.length === 0 && (
              <p className="p-2 text-xs text-parchment/50">No matches.</p>
            )}
          </div>
          <p className="mt-1 text-[10px] text-parchment/30">Open5e SRD · official free content</p>
        </div>
      )}
    </div>
  );
}
