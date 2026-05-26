import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCampaignsForUser } from "@/lib/queries";
import BuilderWizard from "./BuilderWizard";

export const dynamic = "force-dynamic";

export default async function NewCharacterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const campaigns = await listCampaignsForUser(user.id);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link href="/dashboard" className="btn mb-4 inline-block">← Back to hub</Link>
      <BuilderWizard campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} />
    </main>
  );
}
