"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCampaignAction, joinCampaignAction } from "../actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn" disabled={pending}>
      {pending ? "..." : label}
    </button>
  );
}

export default function CampaignControls() {
  const [createState, createAction] = useFormState(
    createCampaignAction,
    null as { error?: string; ok?: boolean } | null
  );
  const [joinState, joinAction] = useFormState(
    joinCampaignAction,
    null as { error?: string; ok?: boolean } | null
  );

  return (
    <div className="space-y-4">
      <form action={createAction} className="space-y-2">
        <label className="label">Create a campaign (you become DM)</label>
        <div className="flex gap-2">
          <input name="name" className="inp" placeholder="Campaign name" required />
          <Submit label="Create" />
        </div>
        {createState?.error && <p className="text-xs text-red-400">{createState.error}</p>}
      </form>

      <div className="border-t border-gold/15" />

      <form action={joinAction} className="space-y-2">
        <label className="label">Join with an invite code</label>
        <div className="flex gap-2">
          <input
            name="code"
            className="inp font-mono uppercase"
            placeholder="ABC123"
            required
          />
          <Submit label="Join" />
        </div>
        {joinState?.error && <p className="text-xs text-red-400">{joinState.error}</p>}
        {joinState?.ok && <p className="text-xs text-green-400">Joined!</p>}
      </form>
    </div>
  );
}
