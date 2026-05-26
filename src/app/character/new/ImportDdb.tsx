"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBuiltCharacterAction } from "../../actions";
import { normalizeCharacter, defaultCharacter, type CharacterData } from "@/lib/dnd/character";
import { emptySpellSlots } from "@/lib/dnd/character";
import { recommendedSpellSlots } from "@/lib/dnd/compute";

export default function ImportDdb({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "importing" | "error">("idle");
  const [error, setError] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);

  async function importChar() {
    if (!url.trim()) return;
    setStatus("importing");
    setError("");
    try {
      const res = await fetch("/api/import-ddb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed.");

      const merged: CharacterData = normalizeCharacter({
        ...defaultCharacter(),
        ...json.data,
        abilities: { ...defaultCharacter().abilities, ...(json.data?.abilities || {}) },
      });
      // Auto-fill spell slots from the imported class & level.
      const { slots, pact } = recommendedSpellSlots(merged);
      const ss = emptySpellSlots();
      for (let i = 0; i < 9; i++) ss[i + 1] = { max: slots[i], used: 0 };
      if (pact) ss[pact.level] = { max: (ss[pact.level]?.max || 0) + pact.slots, used: 0 };
      merged.spellSlots = ss;

      const created = await createBuiltCharacterAction(merged, campaignId);
      if (created.ok) router.push(`/character/${created.id}`);
      else throw new Error(created.error || "Failed to create character.");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Import failed.");
    }
  }

  const busy = status === "importing";

  return (
    <div className="panel p-5">
      <h2 className="font-display text-lg text-parchment">Import from D&amp;D Beyond</h2>
      <p className="mt-1 text-sm text-parchment/60">
        Paste your D&amp;D Beyond character link and the whole sheet fills itself in — abilities,
        class &amp; level, race, background, HP, skills, proficiencies and more.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          className="inp min-w-[260px] flex-1"
          placeholder="https://www.dndbeyond.com/characters/12345678"
          value={url}
          disabled={busy}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") importChar(); }}
        />
        <label className="flex items-center gap-2 text-sm">
          <span className="label">Campaign</span>
          <select className="inp max-w-[160px]" value={campaignId ?? ""} disabled={busy} onChange={(e) => setCampaignId(e.target.value || null)}>
            <option value="">Private</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <button className="btn-primary" disabled={busy || !url.trim()} onClick={importChar}>
          {busy ? "Importing…" : "Import character"}
        </button>
      </div>
      {status === "error" && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {/* How-to guide */}
      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="panel-title mb-2">How to get your link</h3>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-parchment/75">
          <li>Open your character on <span className="text-parchment">dndbeyond.com</span> (the full character sheet view).</li>
          <li>Click the <span className="text-parchment">gear / settings</span> icon on the sheet, then find <span className="text-parchment">Character Privacy</span>.</li>
          <li>Set privacy to <span className="text-gold">Public</span> (this lets the importer read your character — you can switch it back afterward).</li>
          <li>Copy the page URL from your browser&apos;s address bar. It looks like <span className="break-all font-mono text-xs text-parchment/80">https://www.dndbeyond.com/characters/12345678</span>.</li>
          <li>Paste it in the box above and hit <span className="text-parchment">Import character</span>.</li>
        </ol>
        <p className="mt-3 text-xs text-parchment/45">
          Tip: only the number at the end of the link matters. After importing, review the sheet —
          AC, spells and a few derived values may need a quick check, and you can edit anything.
        </p>
      </div>
    </div>
  );
}
