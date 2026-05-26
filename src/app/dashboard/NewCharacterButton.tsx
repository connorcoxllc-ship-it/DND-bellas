"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { createCharacterAction } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Creating..." : "Create character"}
    </button>
  );
}

export default function NewCharacterButton({
  campaigns,
}: {
  campaigns: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + New character
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="panel w-full max-w-sm p-5">
        <h3 className="panel-title mb-4">New Character</h3>
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
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-parchment/50">
              Add to a campaign so your party can view this sheet.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <Submit />
          </div>
        </form>
      </div>
    </div>
  );
}
