"use client";

import { useState } from "react";

interface RollResult {
  expr: string;
  rolls: number[];
  modifier: number;
  total: number;
  label?: string;
}

// Parse simple expressions like "2d6+3", "d20", "1d8-1".
function rollExpr(expr: string, label?: string): RollResult | null {
  const m = expr.replace(/\s+/g, "").match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!m) return null;
  const count = Math.min(parseInt(m[1] || "1", 10), 50);
  const sides = parseInt(m[2], 10);
  const modifier = m[3] ? parseInt(m[3], 10) : 0;
  if (!sides || sides < 2) return null;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { expr, rolls, modifier, total, label };
}

export function useDice() {
  const [history, setHistory] = useState<RollResult[]>([]);
  const roll = (expr: string, label?: string) => {
    const r = rollExpr(expr, label);
    if (r) setHistory((h) => [r, ...h].slice(0, 30));
    return r;
  };
  return { history, roll, clear: () => setHistory([]) };
}

export default function DiceRoller({
  history,
  roll,
  clear,
}: ReturnType<typeof useDice>) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("1d20");
  const quick = ["d4", "d6", "d8", "d10", "d12", "d20", "d100"];

  return (
    <>
      <button
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-blood text-2xl shadow-xl transition hover:brightness-110"
        onClick={() => setOpen((o) => !o)}
        title="Dice roller"
        aria-label="Dice roller"
      >
        🎲
      </button>
      {open && (
        <div className="fixed bottom-24 right-5 z-40 w-72 panel p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="panel-title">Dice Roller</h3>
            <button className="text-xs text-parchment/50 hover:text-parchment" onClick={clear}>
              clear
            </button>
          </div>
          <div className="mb-2 grid grid-cols-4 gap-1">
            {quick.map((d) => (
              <button key={d} className="btn px-0 py-1 text-xs" onClick={() => roll(d, d)}>
                {d}
              </button>
            ))}
          </div>
          <div className="mb-3 flex gap-1">
            <input
              className="inp text-sm"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="2d6+3"
            />
            <button className="btn" onClick={() => roll(custom, "custom")}>
              Roll
            </button>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {history.length === 0 && (
              <p className="text-xs text-parchment/40">No rolls yet.</p>
            )}
            {history.map((r, i) => (
              <div
                key={i}
                className={`rounded border border-gold/15 bg-black/30 px-2 py-1 text-xs ${
                  i === 0 ? "ring-1 ring-gold/40" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-parchment/70">
                    {r.label && r.label !== r.expr ? `${r.label} ` : ""}
                    {r.expr}
                  </span>
                  <span className="font-display text-lg text-gold">{r.total}</span>
                </div>
                <div className="text-parchment/40">
                  [{r.rolls.join(", ")}]
                  {r.modifier ? (r.modifier > 0 ? ` +${r.modifier}` : ` ${r.modifier}`) : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
