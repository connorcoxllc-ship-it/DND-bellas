"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBuiltCharacterAction } from "../../actions";
import { normalizeCharacter, defaultCharacter, type CharacterData } from "@/lib/dnd/character";

export default function ImportPdf({ campaigns }: { campaigns: { id: string; name: string }[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "parsing" | "creating" | "error">("idle");
  const [error, setError] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("parsing");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/import-pdf", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't read that PDF.");

      const merged: CharacterData = normalizeCharacter({
        ...defaultCharacter(),
        ...json.data,
        abilities: { ...defaultCharacter().abilities, ...(json.data?.abilities || {}) },
      });
      // Keep level in sync if classes were detected.
      if (json.data?.classes?.[0]?.level) merged.manualLevel = json.data.classes[0].level;

      setStatus("creating");
      const created = await createBuiltCharacterAction(merged, campaignId);
      if (created.ok) router.push(`/character/${created.id}`);
      else throw new Error(created.error || "Failed to create character.");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Import failed.");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const busy = status === "parsing" || status === "creating";

  return (
    <div className="panel p-5">
      <h2 className="font-display text-lg text-parchment">Import from a PDF</h2>
      <p className="mt-1 text-sm text-parchment/60">
        Have a character sheet PDF (from D&amp;D Beyond or a fillable sheet)? Upload it and
        I&apos;ll pull in what I can — name, abilities, AC, HP, class &amp; level — then drop you
        on the sheet to review and finish. Best-effort: double-check the imported values.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={onFile}
          disabled={busy}
          className="hidden"
          id="pdf-input"
        />
        <label htmlFor="pdf-input" className={`btn-primary cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {status === "parsing" ? "Reading PDF…" : status === "creating" ? "Creating…" : "📄 Upload PDF"}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="label">Add to campaign</span>
          <select className="inp max-w-[180px]" value={campaignId ?? ""} disabled={busy} onChange={(e) => setCampaignId(e.target.value || null)}>
            <option value="">Private</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      {status === "error" && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <p className="mt-3 text-xs text-parchment/40">
        Tip: the fillable WotC sheet (with form fields) imports most accurately. D&amp;D Beyond&apos;s
        styled export still works but may need a few manual fixes.
      </p>
    </div>
  );
}
