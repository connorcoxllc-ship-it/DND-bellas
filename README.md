# Bella's Campaign — D&D Character Hub

An interactive D&D 5e character-sheet app for your whole party, built to deploy
on **Vercel** with **Vercel Postgres**. Think "D&D Beyond, but yours" — fully
manual sheets, shared so everyone in a campaign can view each other's heroes,
plus built-in level-up guidance that tells you what's coming next.

## Features

- **Interactive character sheets** — abilities, modifiers, saving throws, skills
  (with proficiency + expertise), AC/HP/initiative/speed, hit dice, death saves,
  conditions, inspiration. Modifiers, proficiency bonus, passive perception,
  spell save DC and spell attack are all calculated automatically as you type.
- **Manual-first** — everything is editable. Core 5e classes/races are built in
  for convenience, but you can free-type any class, subclass, race, feature, or
  spell so content from **any source** (Xanathar's, Tasha's, homebrew, etc.)
  works.
- **Level-up guidance ("What's Next")** — tracks XP (or manual levels), shows XP
  to the next level, the exact class features you'll unlock next level, ASI/feat
  reminders, HP-on-level-up help, and spell-slot growth for casters.
- **Shared party view** — create a campaign (you become the DM), share the
  6-character invite code, and everyone who joins can view each other's sheets.
  You can only *edit* your own character; party sheets are read-only.
- **Attacks, spellcasting, inventory, story** — attack list with damage roller,
  spell slots with click-to-spend pips, prepared-spell tracking, equipment,
  features & traits, personality/ideals/bonds/flaws, backstory and notes.
- **Dice roller** — floating dice tool; ability checks, saves, skills, attacks
  and damage are all one click to roll.
- **Accounts** — email + password login. Your data lives in your own database.

## Deploy to Vercel (start to finish)

1. **Push this repo to GitHub** (already done if you're reading this on GitHub).
2. In [Vercel](https://vercel.com), click **Add New → Project** and import this
   repository. Framework preset auto-detects as **Next.js** — accept defaults.
3. **Add a database.** In your new project go to the **Storage** tab →
   **Create Database → Postgres**, and connect it to the project. Vercel will
   automatically inject the `POSTGRES_URL` environment variable. No manual
   schema/migration step is needed — the app creates its tables on first run.
4. **Add the auth secret.** In **Settings → Environment Variables**, add:
   - `AUTH_SECRET` = a long random string (generate one with
     `openssl rand -base64 32`).
5. **Redeploy** (Vercel → Deployments → ⋯ → Redeploy) so it picks up the env
   vars, then open your URL.
6. Everyone in the party signs up with email + password. One person creates the
   campaign and shares the invite code; the rest join with it. Done.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in POSTGRES_URL and AUTH_SECRET
npm run dev                  # http://localhost:3000
```

You can point `POSTGRES_URL` at the same Vercel Postgres database (copy it from
the Vercel dashboard) or any Postgres instance. Tables are created automatically
on first request.

## Tech

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Postgres
(`postgres` driver) · server actions · `jose` JWT sessions · `bcryptjs`.

## How sharing/permissions work

- A **campaign** has an owner (DM) and members. Joining uses a short invite code.
- A **character** optionally belongs to a campaign. Anyone in that campaign can
  **view** it; only the owner can **edit** it. Characters with no campaign are
  private to their owner.
