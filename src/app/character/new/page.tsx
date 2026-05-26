import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listCampaignsForUser } from "@/lib/queries";
import BuilderWizard from "./BuilderWizard";
import ImportPdf from "./ImportPdf";
import ImportDdb from "./ImportDdb";

export const dynamic = "force-dynamic";

export default async function NewCharacterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const campaigns = await listCampaignsForUser(user.id).then((cs) => cs.map((c) => ({ id: c.id, name: c.name })));
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <Link href="/dashboard" className="btn inline-block">← Back to hub</Link>
      <ImportDdb campaigns={campaigns} />
      <ImportPdf campaigns={campaigns} />
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-parchment/40">
        <span className="h-px flex-1 bg-white/10" />or build from scratch<span className="h-px flex-1 bg-white/10" />
      </div>
      <BuilderWizard campaigns={campaigns} />
    </main>
  );
}
