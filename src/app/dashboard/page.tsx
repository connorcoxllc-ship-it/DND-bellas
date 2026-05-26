import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  listCampaignsForUser,
  listVisibleCharacters,
  listCampaignMembers,
  getUserPrefs,
} from "@/lib/queries";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [campaignsRaw, characters, prefs] = await Promise.all([
    listCampaignsForUser(user.id),
    listVisibleCharacters(user.id),
    getUserPrefs(user.id),
  ]);

  const campaigns = await Promise.all(
    campaignsRaw.map(async (c) => ({
      id: c.id,
      name: c.name,
      join_code: c.join_code,
      role: c.role,
      members: await listCampaignMembers(c.id),
    }))
  );

  const toCard = (ch: (typeof characters)[number]) => ({
    id: ch.id,
    name: ch.name,
    owner_id: ch.owner_id,
    campaign_id: ch.campaign_id,
    data: ch.data,
    owner_name: ch.owner_name,
  });

  const myCharacters = characters.filter((c) => c.owner_id === user.id).map(toCard);
  const partyCharacters = characters.filter((c) => c.owner_id !== user.id).map(toCard);

  return (
    <DashboardClient
      displayName={user.displayName}
      campaigns={campaigns}
      myCharacters={myCharacters}
      partyCharacters={partyCharacters}
      initialPrefs={prefs}
    />
  );
}
