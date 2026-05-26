import Link from "next/link";
import type { CharacterData } from "@/lib/dnd/character";
import { totalLevel, passivePerception, initiative, formatMod } from "@/lib/dnd/compute";

export interface CardRow {
  id: string;
  name: string;
  owner_id: string;
  campaign_id: string | null;
  data: CharacterData;
  owner_name?: string;
}

function statValue(data: CharacterData, key: string): { label: string; value: string } | null {
  switch (key) {
    case "hp":
      return { label: "HP", value: `${data.currentHp}/${data.maxHp}` };
    case "ac":
      return { label: "AC", value: `${data.armorClass}` };
    case "pp":
      return { label: "Pass. Perc.", value: `${passivePerception(data)}` };
    case "speed":
      return { label: "Speed", value: `${data.speed}ft` };
    case "init":
      return { label: "Init", value: formatMod(initiative(data)) };
    default:
      return null;
  }
}

export default function CharacterCard({
  ch,
  ownerLabel,
  campaignName,
}: {
  ch: CardRow;
  ownerLabel: string;
  campaignName?: string;
}) {
  const accent = ch.data.avatarColor || "#7b2d26";
  const lvl = totalLevel(ch.data);
  const classLine = ch.data.classes.map((c) => `${c.name} ${c.level}`).join(" / ") || "Unclassed";
  const stats = (ch.data.cardStats || ["hp", "ac"])
    .map((k) => statValue(ch.data, k))
    .filter((x): x is { label: string; value: string } => x !== null);

  return (
    <Link
      href={`/character/${ch.id}`}
      className="panel block overflow-hidden transition hover:-translate-y-0.5 hover:border-gold/60"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <div className="flex items-center gap-3 p-3">
        {ch.data.avatarImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ch.data.avatarImageUrl} alt="" className="h-12 w-12 shrink-0 rounded-full border-2 object-cover" style={{ borderColor: accent }} />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 font-display text-xl" style={{ background: accent, borderColor: accent }}>
            {ch.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-display text-parchment">{ch.name}</div>
          <div className="truncate text-xs text-parchment/60">Lvl {lvl} · {classLine}</div>
        </div>
      </div>
      {stats.length > 0 && (
        <div className="flex border-t border-gold/15 text-center">
          {stats.map((s) => (
            <div key={s.label} className="flex-1 border-r border-gold/10 py-1.5 last:border-r-0">
              <div className="text-[9px] uppercase text-gold/60">{s.label}</div>
              <div className="font-display text-sm text-parchment">{s.value}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-parchment/50">
        <span>{ownerLabel}</span>
        {campaignName && <span className="chip">{campaignName}</span>}
      </div>
    </Link>
  );
}
