"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { loginAction, registerAction } from "../actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "..." : label}
    </button>
  );
}

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, loginFormAction] = useFormState(loginAction, null as { error?: string } | null);
  const [regState, regFormAction] = useFormState(registerAction, null as { error?: string } | null);

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-md border border-gold/30 p-1">
        <button
          className={`rounded px-3 py-1.5 text-sm font-medium transition ${
            mode === "login" ? "bg-gold/20 text-gold" : "text-parchment/60"
          }`}
          onClick={() => setMode("login")}
        >
          Sign in
        </button>
        <button
          className={`rounded px-3 py-1.5 text-sm font-medium transition ${
            mode === "register" ? "bg-gold/20 text-gold" : "text-parchment/60"
          }`}
          onClick={() => setMode("register")}
        >
          Create account
        </button>
      </div>

      {mode === "login" ? (
        <form action={loginFormAction} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="inp" autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required className="inp" autoComplete="current-password" />
          </div>
          {loginState?.error && (
            <p className="text-sm text-red-400">{loginState.error}</p>
          )}
          <SubmitButton label="Enter the realm" />
        </form>
      ) : (
        <form action={regFormAction} className="space-y-3">
          <div>
            <label className="label">Display name</label>
            <input name="displayName" type="text" required className="inp" placeholder="What the party calls you" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" required className="inp" autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input name="password" type="password" required minLength={6} className="inp" autoComplete="new-password" />
          </div>
          {regState?.error && (
            <p className="text-sm text-red-400">{regState.error}</p>
          )}
          <SubmitButton label="Begin your legend" />
        </form>
      )}
    </div>
  );
}
