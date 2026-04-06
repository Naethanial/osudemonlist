import { getPlayers, getGeneratedAt, PLAYERS_PER_PAGE } from "@/lib/data";
import { fetchCountriesForPlayers } from "@/lib/osuAuth";
import PlayerRow from "@/components/PlayerRow";
import Pagination from "@/components/Pagination";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function RankingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const players = getPlayers();
  const totalPages = Math.ceil(players.length / PLAYERS_PER_PAGE);
  const clampedPage = Math.min(page, totalPages);

  const startIndex = (clampedPage - 1) * PLAYERS_PER_PAGE;
  const pagePlayers = players.slice(startIndex, startIndex + PLAYERS_PER_PAGE);

  // Fetch country codes for this page's players
  const userIds = pagePlayers.map((p) => p.userId);
  const countryMap = await fetchCountriesForPlayers(userIds);

  const generatedAt = getGeneratedAt();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-end gap-4 mb-1">
          <h1
            className="text-3xl tracking-wide"
            style={{ color: "#ffffff", fontFamily: "Venera, Torus, sans-serif", fontWeight: 500 }}
          >
            rankings
          </h1>
          <span className="text-sm mb-1" style={{ color: "#9da0b0" }}>
            {players.length.toLocaleString()} players
          </span>
        </div>
        <div
          className="h-[2px] w-16 rounded-full mb-4"
          style={{ backgroundColor: "#ff66aa" }}
        />
        <p className="text-xs" style={{ color: "#5a5d6e" }}>
          Last updated: {new Date(generatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          })}
        </p>
      </div>

      {/* Table header */}
      <div
        className="flex items-center gap-3 px-4 pb-2 mb-1 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "#5a5d6e", borderBottom: "1px solid #2a2d3a" }}
      >
        <div className="w-10 text-right">Rank</div>
        <div className="w-9 shrink-0" />
        <div className="w-6 shrink-0" />
        <div className="flex-1">Player</div>
        <div className="w-28 text-right">Points</div>
        <div className="w-16 text-right">Clears</div>
      </div>

      {/* Player rows */}
      <div className="space-y-[2px]">
        {pagePlayers.map((player, i) => (
          <PlayerRow
            key={player.userId}
            rank={startIndex + i + 1}
            userId={player.userId}
            username={player.username}
            totalPoints={player.totalPoints}
            clearCount={player.maps.length}
            countryCode={countryMap.get(player.userId)}
          />
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={clampedPage}
        totalPages={totalPages}
        basePath="/rankings"
      />
    </div>
  );
}
