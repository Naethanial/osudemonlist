import { notFound } from "next/navigation";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { getMapById, getMaps } from "@/lib/data";
import { difficultyDisplayByBeatmapId } from "@/lib/demonListOrder";
import type { QualifyingPlayer } from "@/lib/types";

interface Props {
  params: Promise<{ beatmapId: string }>;
}

export const dynamic = "force-dynamic";

function starColor(stars: number): string {
  if (stars >= 9) return "#ff6060";
  if (stars >= 8) return "#ff9966";
  if (stars >= 7) return "#ffcc22";
  if (stars >= 6) return "#aadd00";
  if (stars >= 5) return "#66ccff";
  return "#aaaaff";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function victorNumberLabel(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

export async function generateStaticParams() {
  const maps = getMaps();
  return maps.map((m) => ({ beatmapId: String(m.beatmapId) }));
}

export default async function MapDetailPage({ params }: Props) {
  const { beatmapId: rawId } = await params;
  const beatmapId = parseInt(rawId, 10);
  if (isNaN(beatmapId)) notFound();

  const map = getMapById(beatmapId);
  if (!map) notFound();

  const displayByBeatmapId = difficultyDisplayByBeatmapId(getMaps());
  const display = displayByBeatmapId.get(map.beatmapId) ?? {
    displayRank: map.rank,
    displayPoints: map.points,
  };

  const coverUrl = `https://assets.ppy.sh/beatmaps/${map.beatmapsetId}/covers/cover.jpg`;
  const beatmapUrl = `https://osu.ppy.sh/beatmapsets/${map.beatmapsetId}#osu/${map.beatmapId}`;
  const color = starColor(map.difficultyRating);

  const verifier = map.qualifyingPlayers.find(
    (p) => p.clearRole === "verified"
  );
  const firstVictor = map.qualifyingPlayers.find(
    (p) => p.victorNumber === 1
  );
  const victors = map.qualifyingPlayers
    .filter((p) => p.clearRole === "victor")
    .sort((a, b) => (a.victorNumber ?? 999) - (b.victorNumber ?? 999));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/demon-list"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-80"
        style={{ color: "#9da0b0" }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        demon list
      </Link>

      {/* Hero banner */}
      <div
        className="relative rounded-2xl overflow-hidden mb-8"
        style={{ minHeight: 200 }}
      >
        {/* Cover background */}
        <div className="absolute inset-0">
          <Image
            src={coverUrl}
            alt={map.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 1024px"
            unoptimized
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(18,19,24,0.92) 0%, rgba(18,19,24,0.75) 50%, rgba(18,19,24,0.55) 100%)",
            }}
          />
        </div>

        {/* Hero content */}
        <div className="relative px-8 py-8 flex flex-col justify-end" style={{ minHeight: 200 }}>
          {/* Rank + star badge row */}
          <div className="flex items-center gap-3 mb-3">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#9da0b0" }}
            >
              #{display.displayRank}
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded tabular-nums"
              style={{ backgroundColor: "rgba(0,0,0,0.55)", color }}
            >
              ★ {map.difficultyRating.toFixed(2)}
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-3xl font-bold leading-tight mb-1"
            style={{ color: "#ffffff", fontFamily: "Torus, sans-serif" }}
          >
            {map.title}
          </h1>

          {/* Artist + difficulty + osu! link */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm" style={{ color: "#9da0b0" }}>
              {map.artist}
            </span>
            <span style={{ color: "#5a5d6e" }}>—</span>
            <span className="text-sm font-medium" style={{ color }}>
              {map.difficultyName}
            </span>
            <a
              href={beatmapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-opacity hover:opacity-80 ml-1"
              style={{
                backgroundColor: "rgba(255,102,170,0.18)",
                color: "#ff66aa",
                border: "1px solid rgba(255,102,170,0.35)",
              }}
              title="Open on osu!"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              osu!
            </a>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 mt-4">
            <div>
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: "#b6e534" }}
              >
                {display.displayPoints.toFixed(0)}
              </span>
              <span className="text-sm ml-1" style={{ color: "#5a5d6e" }}>
                pts
              </span>
            </div>
            <div>
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: "#ffffff" }}
              >
                {map.qualifyingPlayers.length}
              </span>
              <span className="text-sm ml-1" style={{ color: "#5a5d6e" }}>
                {map.qualifyingPlayers.length === 1 ? "clear" : "clears"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verified by */}
      {verifier && (
        <section className="mb-6">
          <SectionLabel>Verified by</SectionLabel>
          <PlayerChip player={verifier} role="verifier" />
        </section>
      )}

      {/* First victor */}
      {firstVictor && (
        <section className="mb-6">
          <SectionLabel>First Victor</SectionLabel>
          <PlayerChip player={firstVictor} role="first-victor" />
        </section>
      )}

      {/* All victors */}
      {victors.length > 0 && (
        <section>
          <SectionLabel>
            Victors{" "}
            <span className="font-normal" style={{ color: "#5a5d6e" }}>
              {victors.length}
            </span>
          </SectionLabel>
          <div className="space-y-[3px]">
            {victors.map((p) => (
              <VictorRow key={p.userId} player={p} />
            ))}
          </div>
        </section>
      )}

      {map.qualifyingPlayers.length === 0 && (
        <div className="text-center py-16" style={{ color: "#5a5d6e" }}>
          No qualifying clears recorded yet.
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h2
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: "#5a5d6e" }}
      >
        {children}
      </h2>
      <div className="h-px" style={{ backgroundColor: "#2a2d3a" }} />
    </div>
  );
}

function PlayerChip({
  player,
  role,
}: {
  player: QualifyingPlayer;
  role: "verifier" | "first-victor";
}) {
  const accentColor = role === "verifier" ? "#ff66aa" : "#b6e534";
  const labelText = role === "verifier" ? "Verifier" : "1st Victor";

  return (
    <Link
      href={`/users/${player.userId}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors hover:opacity-80"
      style={{ backgroundColor: "#1e2028" }}
    >
      <div className="w-10 h-10 rounded-full overflow-hidden relative shrink-0">
        <Image
          src={`https://a.ppy.sh/${player.userId}`}
          alt={player.username}
          fill
          className="object-cover"
          sizes="40px"
          unoptimized
        />
      </div>
      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-semibold truncate block"
          style={{ color: "#ffffff" }}
        >
          {player.username}
        </span>
        <span className="text-xs" style={{ color: "#5a5d6e" }}>
          {formatDate(player.clearedAt)}
        </span>
      </div>
      <span
        className="text-xs font-bold px-2 py-0.5 rounded shrink-0"
        style={{
          backgroundColor: `${accentColor}22`,
          color: accentColor,
          border: `1px solid ${accentColor}44`,
        }}
      >
        {labelText}
      </span>
    </Link>
  );
}

function VictorRow({ player }: { player: QualifyingPlayer }) {
  const isFirst = player.victorNumber === 1;
  const isTop3 =
    player.victorNumber !== null && player.victorNumber <= 3;
  const numColor = isFirst
    ? "#ffd700"
    : player.victorNumber === 2
    ? "#c0c0c0"
    : player.victorNumber === 3
    ? "#cd7f32"
    : "#5a5d6e";

  return (
    <Link
      href={`/users/${player.userId}`}
      className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors group"
      style={{ backgroundColor: "transparent" }}
    >
      {/* Victor number */}
      <div
        className="w-10 text-right text-sm font-bold shrink-0 tabular-nums"
        style={{ color: numColor }}
      >
        {player.victorNumber !== null
          ? `${victorNumberLabel(player.victorNumber)}`
          : "—"}
      </div>

      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full overflow-hidden relative shrink-0"
        style={isTop3 ? { boxShadow: `0 0 0 1px ${numColor}55` } : {}}
      >
        <Image
          src={`https://a.ppy.sh/${player.userId}`}
          alt={player.username}
          fill
          className="object-cover"
          sizes="32px"
          unoptimized
        />
      </div>

      {/* Username */}
      <div className="flex-1 min-w-0">
        <span
          className="text-sm font-medium truncate block group-hover:underline"
          style={{ color: isTop3 ? numColor : "#ffffff" }}
        >
          {player.username}
        </span>
      </div>

      {/* Date */}
      <span className="text-xs shrink-0 tabular-nums" style={{ color: "#5a5d6e" }}>
        {formatDate(player.clearedAt)}
      </span>

      {/* Multiplier badge if not 1x */}
      {player.pointsMultiplier !== 1 && (
        <span
          className="text-xs px-1.5 py-0.5 rounded shrink-0"
          style={{
            backgroundColor: "rgba(182,229,52,0.12)",
            color: "#b6e534",
          }}
        >
          ×{player.pointsMultiplier}
        </span>
      )}
    </Link>
  );
}
