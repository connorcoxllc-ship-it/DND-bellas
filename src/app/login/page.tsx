import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AuthForm from "./AuthForm";
import Reveal from "../_components/Reveal";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16">
      <Reveal>
        <span className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-parchment/70">
          <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
          Your party&apos;s campaign hub
        </span>
      </Reveal>
      <Reveal delay={0.05}>
        <h1 className="text-center font-display text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
          <span className="gradient-text">Bella&apos;s Campaign</span>
        </h1>
      </Reveal>
      <Reveal delay={0.12}>
        <p className="mx-auto mt-5 max-w-xl text-center text-base text-parchment/60">
          Interactive D&amp;D 5e character sheets for the whole party. Build a hero
          with the guided builder, level up with smart guidance, and see everyone
          else&apos;s sheets in real time.
        </p>
      </Reveal>

      <Reveal delay={0.2} className="mt-10 w-full max-w-md">
        <div className="panel p-7 shadow-glow">
          <AuthForm />
        </div>
      </Reveal>

      <Reveal delay={0.3} className="mt-10 w-full max-w-3xl">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { t: "Guided builder", d: "Class, species, background & stats — automated." },
            { t: "Live party view", d: "Everyone sees each other's sheets instantly." },
            { t: "Level-up guidance", d: "Know exactly what's coming next." },
          ].map((f) => (
            <div key={f.t} className="panel p-4 transition hover:-translate-y-1">
              <div className="font-display text-sm text-parchment">{f.t}</div>
              <div className="mt-1 text-xs text-parchment/55">{f.d}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </main>
  );
}
