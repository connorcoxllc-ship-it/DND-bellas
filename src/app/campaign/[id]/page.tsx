import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCampaignFull } from "@/lib/queries";
import CampaignHome from "./CampaignHome";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const campaign = await getCampaignFull(user.id, params.id);
  if (!campaign) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link href="/dashboard" className="btn mb-4 inline-block">← Back to hub</Link>
      <CampaignHome
        campaignId={campaign.id}
        name={campaign.name}
        joinCode={campaign.join_code}
        isDm={campaign.isDm}
        initialData={campaign.data}
        members={campaign.members}
        characters={campaign.characters.map((c) => ({
          id: c.id,
          name: c.name,
          owner_id: c.owner_id,
          campaign_id: c.campaign_id,
          data: c.data,
          owner_name: c.owner_name,
        }))}
      />
    </main>
  );
}
