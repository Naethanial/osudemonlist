import { notFound } from "next/navigation";
import Image from "next/image";
import { Link } from "next-view-transitions";
import {
  getPlayerById,
  getPlayers,
  getMapById,
  getMaps,
  getDemonListSize,
} from "@/lib/data";
import { difficultyDisplayByBeatmapId } from "@/lib/demonListOrder";
import { computeLengthRanks, playerLengthStats } from "@/lib/lengthWeighted";
import type { DemonMap } from "@/lib/types";
import { fetchUserCountry } from "@/lib/osuAuth";

interface Props {
  params: Promise<{ userId: string }>;
}

/** Always resolve ranks against current `getMaps()` + difficulty order (same as /demon-list). */
export const dynamic = "force-dynamic";

function starColor(stars: number): string {
  if (stars >= 9) return "#ff6060";
  if (stars >= 8) return "#ff9966";
  if (stars >= 7) return "#ffcc22";
  if (stars >= 6) return "#aadd00";
  if (stars >= 5) return "#66ccff";
  return "#aaaaff";
}

export async function generateStaticParams() {
  const players = getPlayers();
  return players.map((p) => ({ userId: String(p.userId) }));
}

export default async function UserProfilePage({ params }: Props) {
  const { userId: rawId } = await params;
  const userId = parseInt(rawId, 10);
  if (isNaN(userId)) notFound();

  const player = getPlayerById(userId);
  if (!player) notFound();

  const allMaps = getMaps();
  const demonListSize = getDemonListSize();
  const lengthRanks = computeLengthRanks(allMaps);

  // Compute rank using the same length-weighted sort as /rankings
  const allPlayers = getPlayers();
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    const pa = playerLengthStats(a, lengthRanks, 1, demonListSize).points;
    const pb = playerLengthStats(b, lengthRanks, 1, demonListSize).points;
    return pb !== pa ? pb - pa : a.userId - b.userId;
  });
  const rank = sortedPlayers.findIndex((p) => p.userId === userId) + 1;

  const countryCode = await fetchUserCountry(userId);

  // Rank + base points match /demon-list default ("Difficulty"): length-weighted display order,
  // not raw JSON `map.rank` / `map.points`.
  const demonListDisplay = difficultyDisplayByBeatmapId(allMaps);

  const clearedMaps = player.maps
    .map((pm) => {
      const map = getMapById(pm.beatmapId);
      if (!map) return null;
      const disp = demonListDisplay.get(map.beatmapId);
      if (!disp) return null;
      const qp = map.qualifyingPlayers.find((q) => q.userId === userId);
      const multiplier = qp?.pointsMultiplier ?? 1;
      const clearRole = qp?.clearRole ?? "victor";
      // Use length-weighted points without mod multiplier — consistent with /rankings
      const earnedPoints = disp.displayPoints;
      return {
        map,
        demonListRank: disp.displayRank,
        earnedPoints,
        multiplier,
        clearRole,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort(
      (a, b) =>
        a.demonListRank - b.demonListRank || a.map.beatmapId - b.map.beatmapId
    );

  const hardestMap = clearedMaps[0]?.map;

  // Total points via the same playerLengthStats formula used on /rankings
  const pointsStat = playerLengthStats(player, lengthRanks, 1, demonListSize).points;

  const rankColor =
    rank === 1
      ? "#ffd700"
      : rank === 2
      ? "#c0c0c0"
      : rank === 3
      ? "#cd7f32"
      : "#ff66aa";

  // Banner uses the hardest demon's cover for visual flair
  const bannerBeatmapsetId = hardestMap?.beatmapsetId;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/rankings"
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
        rankings
      </Link>

      {/* Profile hero */}
      <div
        className="relative rounded-2xl overflow-hidden mb-8"
        style={{ minHeight: 180 }}
      >
        {/* Background — hardest demon cover */}
        <div className="absolute inset-0">
          {bannerBeatmapsetId && (
            <Image
              src={`https://assets.ppy.sh/beatmaps/${bannerBeatmapsetId}/covers/cover.jpg`}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1024px"
              unoptimized
              priority
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(18,19,24,0.97) 0%, rgba(18,19,24,0.88) 45%, rgba(18,19,24,0.78) 100%)",
            }}
          />
        </div>

        {/* Profile content */}
        <div className="relative flex items-center gap-6 px-8 py-8">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full overflow-hidden relative shrink-0"
            style={{ boxShadow: `0 0 0 3px ${rankColor}55` }}
          >
            <Image
              src={`https://a.ppy.sh/${userId}`}
              alt={player.username}
              fill
              className="object-cover"
              sizes="96px"
              unoptimized
              priority
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              {/* Country flag */}
              {countryCode && (
                <div className="w-7 h-5 relative overflow-hidden rounded-[2px] shrink-0">
                  <Image
                    src={`https://osu.ppy.sh/images/flags/${countryCode}.png`}
                    alt={countryCode}
                    fill
                    className="object-cover"
                    sizes="28px"
                    unoptimized
                  />
                </div>
              )}
              <h1
                className="text-3xl font-bold"
                style={{ color: "#ffffff", fontFamily: "Torus, sans-serif" }}
              >
                {player.username}
              </h1>
              {/* osu! profile link */}
              <a
                href={`https://osu.ppy.sh/users/${userId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                style={{
                  backgroundColor: "rgba(255,102,170,0.15)",
                  color: "#ff66aa",
                  border: "1px solid rgba(255,102,170,0.35)",
                }}
                title="View osu! profile"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
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
            <div className="flex items-center gap-6 flex-wrap mt-3">
              <StatPill label="Rank" value={`#${rank}`} color={rankColor} />
              <StatPill
                label="Points"
                value={pointsStat.toFixed(2)}
                color="#b6e534"
                suffix="pts"
              />
              <StatPill
                label="Clears"
                value={String(player.maps.length)}
                color="#ffffff"
              />
              {hardestMap && (
                <div>
                  <p className="text-xs uppercase tracking-widest mb-0.5 !text-white">
                    Hardest Demon
                  </p>
                  <Link
                    href={`/demon-list/${hardestMap.beatmapId}`}
                    className="text-sm font-semibold hover:underline transition-colors"
                    style={{ color: starColor(hardestMap.difficultyRating) }}
                  >
                    {hardestMap.title}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cleared maps list */}
      <div className="mb-4">
        <h2
          className="text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "#5a5d6e" }}
        >
          Demons Completed{" "}
          <span className="font-normal">{clearedMaps.length}</span>
        </h2>
        <div className="h-px mb-4" style={{ backgroundColor: "#2a2d3a" }} />

        {/* Column headers */}
        <div
          className="flex items-center gap-4 px-4 pb-2 mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#5a5d6e", borderBottom: "1px solid #2a2d3a" }}
        >
          <div className="w-10 text-right" title="Same numbering as /demon-list (Difficulty sort)">
            Rank
          </div>
          <div className="w-20">Stars</div>
          <div className="flex-1">Map</div>
          <div className="text-right">Points</div>
        </div>

        <div className="space-y-2">
          {clearedMaps.map(({ map, demonListRank, earnedPoints, multiplier, clearRole }) => (
            <PlayerMapCard
              key={map.beatmapId}
              demonListRank={demonListRank}
              points={earnedPoints}
              multiplier={multiplier}
              clearRole={clearRole}
              map={map}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  color,
  suffix,
}: {
  label: string;
  value: string;
  color: string;
  suffix?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest mb-0.5 !text-white">
        {label}
      </p>
      <p>
        <span
          className="text-xl font-bold tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-sm ml-1 !text-white">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}

function PlayerMapCard({
  demonListRank,
  points,
  multiplier,
  clearRole,
  map,
}: {
  demonListRank: number;
  points: number;
  multiplier: number;
  clearRole: string;
  map: Pick<
    DemonMap,
    | "beatmapId"
    | "beatmapsetId"
    | "title"
    | "artist"
    | "difficultyName"
    | "difficultyRating"
    | "points"
  >;
}) {
  const coverUrl = `https://assets.ppy.sh/beatmaps/${map.beatmapsetId}/covers/cover.jpg`;
  const color = starColor(map.difficultyRating);

  return (
    <Link
      href={`/demon-list/${map.beatmapId}`}
      className="relative flex items-center gap-4 rounded-xl overflow-hidden group transition-transform hover:-translate-y-[1px]"
      style={{ backgroundColor: "#1e2028", minHeight: 72, display: "flex" }}
    >
      {/* Background cover */}
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={coverUrl}
          alt={map.title}
          fill
          className="object-cover opacity-20 group-hover:opacity-30 transition-opacity scale-105"
          sizes="(max-width: 1024px) 100vw, 900px"
          unoptimized
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #1e2028 30%, rgba(30,32,40,0.6) 70%, rgba(30,32,40,0.3) 100%)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex items-center gap-4 px-4 py-3 w-full">
        {/* Rank */}
        <div
          className="w-10 text-right text-sm font-bold shrink-0"
          style={{ color: "#5a5d6e" }}
        >
          #{demonListRank}
        </div>

        {/* Star badge */}
        <div
          className="shrink-0 px-2 py-0.5 rounded text-xs font-bold tabular-nums"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", color }}
        >
          ★ {map.difficultyRating.toFixed(2)}
        </div>

        {/* Map info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "#ffffff" }}
            >
              {map.title}
            </span>
            {clearRole === "verified" && (
              <span
                className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: "rgba(255,102,170,0.15)",
                  color: "#ff66aa",
                  border: "1px solid rgba(255,102,170,0.35)",
                }}
              >
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs truncate" style={{ color: "#9da0b0" }}>
              {map.artist}
            </span>
            <span className="text-xs shrink-0" style={{ color: "#5a5d6e" }}>
              —
            </span>
            <span
              className="text-xs font-medium shrink-0 max-w-[160px] truncate"
              style={{ color }}
            >
              {map.difficultyName}
            </span>
          </div>
        </div>

        {/* Points earned on this map */}
        <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
          <div
            className="text-sm font-bold tabular-nums"
            style={{ color: "#b6e534" }}
          >
            {points.toFixed(1)}{" "}
            <span className="text-xs font-normal" style={{ color: "#5a5d6e" }}>
              pts
            </span>
          </div>
          {multiplier !== 1 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded tabular-nums"
              style={{
                backgroundColor: "rgba(182,229,52,0.12)",
                color: "#b6e534",
              }}
            >
              ×{multiplier}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
