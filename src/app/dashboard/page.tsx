import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  listCampaignsForUser,
  listVisibleCharacters,
  listCampaignMembers,
} from "@/lib/queries";
import { logoutAction } from "../actions";
import CampaignControls from "./CampaignControls";
import NewCharacterButton from "./NewCharacterButton";
import { totalLevel } from "@/lib/dnd/compute";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const campaigns = await listCampaignsForUser(user.id);
  const characters = await listVisibleCharacters(user.id);

  const membersByCampaign: Record<string, Awaited<ReturnType<typeof listCampaignMembers>>> = {};
  for (const c of campaigns) {
    membersByCampaign[c.id] = await listCampaignMembers(c.id);
  }

  const myCharacters = characters.filter((c) => c.owner_id === user.id);
  const partyCharacters = characters.filter((c) => c.owner_id !== user.id);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-gold/20 pb-4">
        <div>
          <h1 className="font-display text-2xl text-gold">Bella&apos;s Campaign Hub</h1>
          <p className="text-sm text-parchment/60">Welcome back, {user.displayName}.</p>
        </div>
        <form action={logoutAction}>
          <button className="btn" type="submit">Sign out</button>
        </form>
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="panel p-4">
          <h2 className="panel-title mb-3">Your Campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="text-sm text-parchment/60">
              No campaigns yet. Create one as the DM, or join one with a code.
            </p>
          ) : (
            <ul className="space-y-3">
              {campaigns.map((c) => (
                <li key={c.id} className="rounded border border-gold/20 bg-black/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-parchment">{c.name}</span>
                    <span className="chip">{c.role === "dm" ? "Dungeon Master" : "Player"}</span>
                  </div>
                  <div className="mt-1 text-xs text-parchment/60">
                    Invite code:{" "}
                    <span className="rounded bg-gold/15 px-1.5 py-0.5 font-mono text-gold">
                      {c.join_code}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {membersByCampaign[c.id]?.map((m) => (
                      <span key={m.user_id} className="chip">
                        {m.display_name}
                        {m.role === "dm" ? " (DM)" : ""}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel p-4">
          <h2 className="panel-title mb-3">Start or Join</h2>
          <CampaignControls />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="panel-title">Your Characters</h2>
          <NewCharacterButton campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
        </div>
        {myCharacters.length === 0 ? (
          <p className="text-sm text-parchment/60">
            No characters yet. Create your first hero above.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myCharacters.map((ch) => (
              <CharacterCard key={ch.id} ch={ch} mine campaigns={campaigns} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="panel-title mb-3">The Party</h2>
        {partyCharacters.length === 0 ? (
          <p className="text-sm text-parchment/60">
            When your party-mates create characters in a shared campaign,
            they&apos;ll appear here for you to view.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {partyCharacters.map((ch) => (
              <CharacterCard key={ch.id} ch={ch} campaigns={campaigns} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function CharacterCard({
  ch,
  mine,
  campaigns,
}: {
  ch: Awaited<ReturnType<typeof listVisibleCharacters>>[number];
  mine?: boolean;
  campaigns: { id: string; name: string }[];
}) {
  const lvl = totalLevel(ch.data);
  const classLine = ch.data.classes
    .map((c) => `${c.name} ${c.level}`)
    .join(" / ");
  const campaign = campaigns.find((c) => c.id === ch.campaign_id);
  return (
    <Link
      href={`/character/${ch.id}`}
      className="panel block p-4 transition hover:border-gold/60"
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 font-display text-lg"
          style={{ background: ch.data.avatarColor || "#7b2d26" }}
        >
          {ch.name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-parchment">{ch.name}</div>
          <div className="truncate text-xs text-parchment/60">
            Lvl {lvl} · {classLine || "Unclassed"}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-parchment/50">
        <span>{mine ? "You" : ch.owner_name}</span>
        {campaign && <span className="chip">{campaign.name}</span>}
      </div>
    </Link>
  );
}
