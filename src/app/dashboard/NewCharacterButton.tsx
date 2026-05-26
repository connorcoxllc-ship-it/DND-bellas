"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createCharacterAction } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "Creating..." : "Create blank"}
    </button>
  );
}

export default function NewCharacterButton({
  campaigns,
}: {
  campaigns: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <Link href="/character/new" className="btn-primary">✨ Build a character</Link>
      <button className="btn" onClick={() => setOpen(true)}>+ Blank</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="panel w-full max-w-sm p-5">
            <h3 className="panel-title mb-1">Quick blank character</h3>
            <p className="mb-4 text-xs text-parchment/50">Prefer the guided builder? Close this and hit &quot;Build a character&quot;.</p>
            <form action={createCharacterAction} className="space-y-3">
              <div>
                <label className="label">Character name</label>
                <input name="name" className="inp" placeholder="e.g. Bella Stormwind" required />
              </div>
              <div>
                <label className="label">Campaign (optional)</label>
                <select name="campaignId" className="inp">
                  <option value="">No campaign (private)</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
                <Submit />
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
