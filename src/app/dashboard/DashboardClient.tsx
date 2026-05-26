"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { logoutAction, saveUserPrefsAction } from "../actions";
import CampaignControls from "./CampaignControls";
import NewCharacterButton from "./NewCharacterButton";
import CharacterCard, { CardRow } from "../_components/CharacterCard";
import {
  ALL_SECTIONS,
  DashSection,
  DashWidget,
  UserPrefs,
} from "@/lib/dnd/dashboard";

interface CampaignSummary {
  id: string;
  name: string;
  join_code: string;
  role: string;
  members: { user_id: string; display_name: string; role: string }[];
}

export default function DashboardClient({
  displayName,
  campaigns,
  myCharacters,
  partyCharacters,
  initialPrefs,
}: {
  displayName: string;
  campaigns: CampaignSummary[];
  myCharacters: CardRow[];
  partyCharacters: CardRow[];
  initialPrefs: UserPrefs;
}) {
  const [prefs, setPrefs] = useState<UserPrefs>(initialPrefs);
  const [customizing, setCustomizing] = useState(false);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveUserPrefsAction(prefs), 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [prefs]);

  const accent = prefs.accent;
  const isHidden = (s: DashSection) => prefs.hidden.includes(s);
  const toggleHidden = (s: DashSection) =>
    setPrefs((p) => ({
      ...p,
      hidden: p.hidden.includes(s) ? p.hidden.filter((x) => x !== s) : [...p.hidden, s],
    }));
  const move = (s: DashSection, dir: -1 | 1) =>
    setPrefs((p) => {
      const order = [...p.order];
      const i = order.indexOf(s);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return p;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...p, order };
    });

  const addWidget = (type: "note" | "links") =>
    setPrefs((p) => ({
      ...p,
      widgets: [...p.widgets, { id: nanoid(), type, title: type === "note" ? "Note" : "Links", body: "", links: [] }],
    }));
  const setWidget = (id: string, patch: Partial<DashWidget>) =>
    setPrefs((p) => ({ ...p, widgets: p.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) }));
  const removeWidget = (id: string) =>
    setPrefs((p) => ({ ...p, widgets: p.widgets.filter((w) => w.id !== id) }));

  function renderSection(s: DashSection) {
    if (isHidden(s)) return null;
    switch (s) {
      case "myCharacters":
        return (
          <section key={s}>
            <SectionHead accent={accent} title="Your Characters">
              <NewCharacterButton campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
            </SectionHead>
            {myCharacters.length === 0 ? (
              <Empty text="No characters yet. Create your first hero." />
            ) : (
              <Grid>
                {myCharacters.map((ch) => (
                  <CharacterCard key={ch.id} ch={ch} ownerLabel="You" campaignName={campaigns.find((c) => c.id === ch.campaign_id)?.name} />
                ))}
              </Grid>
            )}
          </section>
        );
      case "party":
        return (
          <section key={s}>
            <SectionHead accent={accent} title="The Party" />
            {partyCharacters.length === 0 ? (
              <Empty text="Party-mates' characters in your shared campaigns appear here." />
            ) : (
              <Grid>
                {partyCharacters.map((ch) => (
                  <CharacterCard key={ch.id} ch={ch} ownerLabel={ch.owner_name || "Player"} campaignName={campaigns.find((c) => c.id === ch.campaign_id)?.name} />
                ))}
              </Grid>
            )}
          </section>
        );
      case "campaigns":
        return (
          <section key={s}>
            <SectionHead accent={accent} title="Your Campaigns" />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-3">
                {campaigns.length === 0 ? (
                  <Empty text="No campaigns yet. Create one or join with a code." />
                ) : (
                  campaigns.map((c) => (
                    <Link key={c.id} href={`/campaign/${c.id}`} className="panel block p-3 transition hover:border-gold/60">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-parchment">{c.name}</span>
                        <span className="chip">{c.role === "dm" ? "Dungeon Master" : "Player"}</span>
                      </div>
                      <div className="mt-1 text-xs text-parchment/60">
                        Invite code: <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-gold">{c.join_code}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {c.members.map((m) => (
                          <span key={m.user_id} className="chip">{m.display_name}{m.role === "dm" ? " (DM)" : ""}</span>
                        ))}
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <div className="panel p-4">
                <h3 className="panel-title mb-3">Start or Join</h3>
                <CampaignControls />
              </div>
            </div>
          </section>
        );
      case "widgets":
        return (
          <section key={s}>
            <SectionHead accent={accent} title="Your Widgets">
              <div className="flex gap-2">
                <button className="btn" onClick={() => addWidget("note")}>+ Note</button>
                <button className="btn" onClick={() => addWidget("links")}>+ Links</button>
              </div>
            </SectionHead>
            {prefs.widgets.length === 0 ? (
              <Empty text="Add a note or a quick-links widget to personalize your hub." />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {prefs.widgets.map((w) => (
                  <WidgetCard key={w.id} w={w} onChange={(patch) => setWidget(w.id, patch)} onRemove={() => removeWidget(w.id)} />
                ))}
              </div>
            )}
          </section>
        );
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6" style={{ ["--accent" as string]: accent } as React.CSSProperties}>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: accent + "55" }}>
        <div>
          <h1 className="font-display text-2xl" style={{ color: accent }}>Bella&apos;s Campaign Hub</h1>
          <p className="text-sm text-parchment/60">Welcome back, {displayName}.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setCustomizing((v) => !v)}>{customizing ? "Done" : "✎ Customize"}</button>
          <form action={logoutAction}><button className="btn" type="submit">Sign out</button></form>
        </div>
      </header>

      {customizing && (
        <div className="panel mb-6 p-4">
          <h2 className="panel-title mb-3">Customize your dashboard</h2>
          <div className="mb-4 flex items-center gap-3">
            <span className="label">Accent color</span>
            <input type="color" value={prefs.accent} onChange={(e) => setPrefs((p) => ({ ...p, accent: e.target.value }))} className="h-8 w-12 cursor-pointer rounded border border-gold/30 bg-transparent" />
            <button className="btn" onClick={() => setPrefs((p) => ({ ...p, accent: "#8b5cf6" }))}>Reset</button>
          </div>
          <div className="label mb-1">Sections (reorder &amp; show/hide)</div>
          <ul className="space-y-1">
            {prefs.order.map((s) => {
              const meta = ALL_SECTIONS.find((x) => x.key === s)!;
              return (
                <li key={s} className="flex items-center gap-2 rounded border border-gold/20 bg-black/20 px-2 py-1 text-sm">
                  <button className="btn px-2 py-0.5" onClick={() => move(s, -1)} title="Up">↑</button>
                  <button className="btn px-2 py-0.5" onClick={() => move(s, 1)} title="Down">↓</button>
                  <span className="flex-1">{meta.label}</span>
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={!isHidden(s)} onChange={() => toggleHidden(s)} className="accent-gold" />
                    Visible
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-8">{prefs.order.map(renderSection)}</div>
    </main>
  );
}

function SectionHead({ title, accent, children }: { title: string; accent: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b pb-1" style={{ borderColor: accent + "44" }}>
      <h2 className="font-display text-sm uppercase tracking-wide" style={{ color: accent }}>{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-parchment/60">{text}</p>;
}

function WidgetCard({ w, onChange, onRemove }: { w: DashWidget; onChange: (p: Partial<DashWidget>) => void; onRemove: () => void }) {
  return (
    <div className="panel p-3">
      <div className="mb-2 flex items-center gap-2">
        <input className="inp font-display" value={w.title} onChange={(e) => onChange({ title: e.target.value })} />
        <button className="text-red-400 hover:text-red-300" onClick={onRemove}>✕</button>
      </div>
      {w.type === "note" ? (
        <textarea className="inp" rows={5} placeholder="Write a note…" value={w.body || ""} onChange={(e) => onChange({ body: e.target.value })} />
      ) : (
        <LinksEditor w={w} onChange={onChange} />
      )}
    </div>
  );
}

function LinksEditor({ w, onChange }: { w: DashWidget; onChange: (p: Partial<DashWidget>) => void }) {
  const links = w.links || [];
  const setLink = (i: number, patch: Partial<{ label: string; url: string }>) =>
    onChange({ links: links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });
  return (
    <div className="space-y-1">
      {links.map((l, i) => (
        <div key={i} className="flex items-center gap-1">
          <input className="inp" placeholder="Label" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
          <input className="inp" placeholder="https://" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
          <button className="text-red-400" onClick={() => onChange({ links: links.filter((_, idx) => idx !== i) })}>✕</button>
        </div>
      ))}
      <button className="btn" onClick={() => onChange({ links: [...links, { label: "", url: "" }] })}>+ Link</button>
      {links.filter((l) => l.url).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {links.filter((l) => l.url).map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className="chip hover:bg-gold/20">{l.label || l.url}</a>
          ))}
        </div>
      )}
    </div>
  );
}
