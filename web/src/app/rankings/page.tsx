import {
  getPlayers,
  getMaps,
  getGeneratedAt,
  PLAYERS_PER_PAGE,
  getPlayerVerificationCounts,
  getPlayerVerificationCountsInRange,
  getDemonListSize,
  getMultiplierLookup,
} from "@/lib/data";
import { computeLengthRanks, playerLengthStats } from "@/lib/lengthWeighted";
import type { Player } from "@/lib/types";
import { fetchCountriesForPlayers, getStoredCountries } from "@/lib/osuAuth";
import PlayerRow from "@/components/PlayerRow";
import Pagination from "@/components/Pagination";
import RankingsControls from "@/components/RankingsControls";
import { Suspense } from "react";

const VALID_SORTS = ["points", "clears", "verifications"] as const;
type SortMode = (typeof VALID_SORTS)[number];

interface Props {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    country?: string;
    rankMin?: string;
    rankMax?: string;
  }>;
}

function parseRankRange(
  rankMinStr: string | undefined,
  rankMaxStr: string | undefined,
  demonListSize: number
): { min: number; max: number } {
  const parse = (s: string | undefined, fallback: number) => {
    const n = parseInt(s ?? "", 10);
    return Number.isFinite(n) ? n : fallback;
  };
  let min = parse(rankMinStr, 1);
  let max = parse(rankMaxStr, demonListSize);
  min = Math.max(1, Math.min(min, demonListSize));
  max = Math.max(1, Math.min(max, demonListSize));
  if (min > max) {
    const t = min;
    min = max;
    max = t;
  }
  return { min, max };
}


export default async function RankingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const sort: SortMode = (VALID_SORTS as readonly string[]).includes(params.sort ?? "")
    ? (params.sort as SortMode)
    : "points";
  const countryFilter = /^[A-Z]{2}$/.test(params.country ?? "") ? (params.country ?? "") : "";

  const demonListSize = getDemonListSize();
  const lengthRanks = computeLengthRanks(getMaps());
  const multiplierLookup = getMultiplierLookup();
  const { min: rankMin, max: rankMax } = parseRankRange(
    params.rankMin,
    params.rankMax,
    demonListSize
  );
  const isFullRankRange = rankMin === 1 && rankMax === demonListSize;
  const statsCache = new Map<number, { points: number; clears: number }>();
  const getDisplayStats = (player: Player) => {
    const cached = statsCache.get(player.userId);
    if (cached) {
      return cached;
    }
    const stats = playerLengthStats(player, lengthRanks, multiplierLookup, rankMin, rankMax);
    statsCache.set(player.userId, stats);
    return stats;
  };

  const verificationCountsFull = getPlayerVerificationCounts();
  const verificationCounts = isFullRankRange
    ? verificationCountsFull
    : getPlayerVerificationCountsInRange(rankMin, rankMax);

  let players = getPlayers();

  if (sort === "clears") {
    if (isFullRankRange) {
      players = [...players].sort((a, b) => b.maps.length - a.maps.length);
    } else {
      players = [...players].sort((a, b) => {
        const ca = getDisplayStats(a).clears;
        const cb = getDisplayStats(b).clears;
        return cb !== ca ? cb - ca : a.userId - b.userId;
      });
    }
  } else if (sort === "verifications") {
    players = [...players].sort((a, b) => {
      const va = verificationCounts.get(a.userId) ?? 0;
      const vb = verificationCounts.get(b.userId) ?? 0;
      return vb !== va ? vb - va : a.userId - b.userId;
    });
  } else {
    // "points" — use display-order points with mod multipliers
    if (isFullRankRange) {
      players = [...players].sort((a, b) => {
        const pa = getDisplayStats(a).points;
        const pb = getDisplayStats(b).points;
        return pb !== pa ? pb - pa : a.userId - b.userId;
      });
    } else {
      players = [...players].sort((a, b) => {
        const pa = getDisplayStats(a).points;
        const pb = getDisplayStats(b).points;
        return pb !== pa ? pb - pa : a.userId - b.userId;
      });
    }
  }

  // Country filter — use only stored/cached data (no live API calls)
  let countryMap = new Map<number, string>();
  if (countryFilter) {
    countryMap = getStoredCountries();
    players = players.filter(
      (p) => countryMap.get(p.userId) === countryFilter
    );
  }

  const totalPlayers = getPlayers().length;
  const totalPages = Math.max(1, Math.ceil(players.length / PLAYERS_PER_PAGE));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * PLAYERS_PER_PAGE;
  const pagePlayers = players.slice(startIndex, startIndex + PLAYERS_PER_PAGE);

  // Fetch flags for current page only (fast — at most 50 players per page)
  const pageIds = pagePlayers.map((p) => p.userId);
  const pageCountries = await fetchCountriesForPlayers(pageIds);
  // Merge into countryMap so PlayerRow has flags
  for (const [id, code] of pageCountries) countryMap.set(id, code);

  const generatedAt = getGeneratedAt();

  const primaryColLabel =
    sort === "points" ? "Points" : sort === "clears" ? "Clears" : "Verifications";
  const secondaryColLabel = sort === "points" ? "Clears" : "Points";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-end gap-4 mb-1">
          <h1
            className="text-3xl tracking-wide"
            style={{
              color: "#ffffff",
              fontFamily: "Venera, Torus, sans-serif",
              fontWeight: 500,
            }}
          >
            rankings
          </h1>
          <span className="text-sm mb-1" style={{ color: "#9da0b0" }}>
            {countryFilter
              ? `${players.length.toLocaleString()} players`
              : `${totalPlayers.toLocaleString()} players`}
          </span>
        </div>
        <div
          className="h-[2px] w-16 rounded-full mb-4"
          style={{ backgroundColor: "#ff66aa" }}
        />
        <p className="text-xs" style={{ color: "#5a5d6e" }}>
          Last updated:{" "}
          {new Date(generatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </p>
      </div>

      {/* Controls */}
      <div className="mb-5">
        <Suspense>
          <RankingsControls
            currentSort={sort}
            currentCountry={countryFilter}
            demonListSize={demonListSize}
            rankMin={rankMin}
            rankMax={rankMax}
          />
        </Suspense>
      </div>

      {!isFullRankRange && (
        <p className="text-xs mb-4" style={{ color: "#5a5d6e" }}>
          Showing stats for demon list ranks #{rankMin}–#{rankMax} (1 = hardest).
        </p>
      )}

      {/* Table header */}
      <div
        className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 pb-2 mb-1 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "#5a5d6e", borderBottom: "1px solid #2a2d3a" }}
      >
        <div className="w-8 sm:w-10 text-right">Rank</div>
        <div className="w-9 shrink-0" />
        <div className="w-6 shrink-0" />
        <div className="flex-1">Player</div>
        <div
          className={`text-right shrink-0 ${
            sort === "verifications" ? "w-[7.5rem] sm:w-32" : "w-20 sm:w-28"
          }`}
        >
          {primaryColLabel}
        </div>
        <div className="hidden sm:block text-right w-16 shrink-0">{secondaryColLabel}</div>
      </div>

      {/* Player rows */}
      <div className="space-y-[2px]">
        {pagePlayers.length === 0 ? (
          <div
            className="py-16 text-center text-sm"
            style={{ color: "#5a5d6e" }}
          >
            No players found
            {countryFilter && ` for country ${countryFilter}`}.
          </div>
        ) : (
          pagePlayers.map((player, i) => {
            let displayPoints: number;
            let displayClears: number;

            const ss = getDisplayStats(player);
            displayPoints = ss.points;
            displayClears = ss.clears;

            return (
              <PlayerRow
                key={player.userId}
                rank={startIndex + i + 1}
                userId={player.userId}
                username={player.username}
                totalPoints={displayPoints}
                clearCount={displayClears}
                verificationCount={verificationCounts.get(player.userId) ?? 0}
                countryCode={countryMap.get(player.userId)}
                sort={sort}
              />
            );
          })
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={clampedPage}
        totalPages={totalPages}
        basePath="/rankings"
        extraParams={
          [
            sort !== "points" ? `sort=${sort}` : "",
            countryFilter ? `country=${countryFilter}` : "",
            !isFullRankRange ? `rankMin=${rankMin}&rankMax=${rankMax}` : "",
          ]
            .filter(Boolean)
            .join("&")
        }
      />
    </div>
  );
}
