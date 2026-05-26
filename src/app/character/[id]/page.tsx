import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCharacter, listCampaignsForUser } from "@/lib/queries";
import CharacterSheet from "./CharacterSheet";

export const dynamic = "force-dynamic";

export default async function CharacterPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const result = await getCharacter(user.id, params.id);
  if (!result) notFound();

  const campaigns = await listCampaignsForUser(user.id);

  return (
    <main className="mx-auto max-w-6xl px-3 py-5">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/dashboard" className="btn">
          ← Back to hub
        </Link>
        <span className="text-xs text-parchment/50">
          {result.canEdit ? "Editing your character" : `Viewing ${result.row.owner_name}'s character (read-only)`}
        </span>
      </div>
      <CharacterSheet
        characterId={result.row.id}
        initialData={result.row.data}
        initialCampaignId={result.row.campaign_id}
        canEdit={result.canEdit}
        campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))}
      />
    </main>
  );
}
