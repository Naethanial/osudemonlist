import {
  getPlayers,
  getGeneratedAt,
  PLAYERS_PER_PAGE,
  getPlayerVerificationCounts,
} from "@/lib/data";
import { fetchCountriesForPlayers, getStoredCountries } from "@/lib/osuAuth";
import PlayerRow from "@/components/PlayerRow";
import Pagination from "@/components/Pagination";
import RankingsControls from "@/components/RankingsControls";
import { Suspense } from "react";

interface Props {
  searchParams: Promise<{ page?: string; sort?: string; country?: string }>;
}

export default async function RankingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const sort = ["points", "clears", "verifications"].includes(params.sort ?? "")
    ? (params.sort ?? "points")
    : "points";
  const countryFilter = /^[A-Z]{2}$/.test(params.country ?? "") ? (params.country ?? "") : "";

  const verificationCounts = getPlayerVerificationCounts();
  let players = getPlayers();

  // Sort
  if (sort === "clears") {
    players = [...players].sort((a, b) => b.maps.length - a.maps.length);
  } else if (sort === "verifications") {
    players = [...players].sort(
      (a, b) =>
        (verificationCounts.get(b.userId) ?? 0) -
        (verificationCounts.get(a.userId) ?? 0)
    );
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

  const rightColLabel =
    sort === "verifications" ? "Verifs" : sort === "clears" ? "Clears" : "Clears";

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
          <RankingsControls currentSort={sort} currentCountry={countryFilter} />
        </Suspense>
      </div>

      {/* Table header */}
      <div
        className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 pb-2 mb-1 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "#5a5d6e", borderBottom: "1px solid #2a2d3a" }}
      >
        <div className="w-8 sm:w-10 text-right">Rank</div>
        <div className="w-9 shrink-0" />
        <div className="w-6 shrink-0" />
        <div className="flex-1">Player</div>
        <div className="w-20 sm:w-28 text-right">Points</div>
        <div className={`hidden sm:block text-right ${sort === "verifications" ? "w-20" : "w-16"}`}>
          {rightColLabel}
        </div>
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
          pagePlayers.map((player, i) => (
            <PlayerRow
              key={player.userId}
              rank={startIndex + i + 1}
              userId={player.userId}
              username={player.username}
              totalPoints={player.totalPoints}
              clearCount={player.maps.length}
              verificationCount={verificationCounts.get(player.userId) ?? 0}
              countryCode={countryMap.get(player.userId)}
              sort={sort}
            />
          ))
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
          ]
            .filter(Boolean)
            .join("&")
        }
      />
    </div>
  );
}
