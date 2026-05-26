import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthForm from "./AuthForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
      <h1 className="font-display text-3xl text-gold">Bella&apos;s Campaign</h1>
      <p className="mt-2 text-center text-sm text-parchment/70">
        Interactive D&amp;D character sheets for the whole party. Build your hero,
        level up with guidance, and peek at everyone else&apos;s sheets.
      </p>
      <div className="panel mt-8 w-full p-6">
        <AuthForm />
      </div>
      <p className="mt-6 text-center text-xs text-parchment/40">
        Your data is stored in your own database. Share a campaign code to play
        together.
      </p>
    </main>
  );
}
