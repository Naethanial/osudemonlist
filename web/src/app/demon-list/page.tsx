import { getMaps, getGeneratedAt, MAPS_PER_PAGE } from "@/lib/data";
import MapCard from "@/components/MapCard";
import Pagination from "@/components/Pagination";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function DemonListPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const maps = getMaps();
  const totalPages = Math.ceil(maps.length / MAPS_PER_PAGE);
  const clampedPage = Math.min(page, totalPages);

  const startIndex = (clampedPage - 1) * MAPS_PER_PAGE;
  const pageMaps = maps.slice(startIndex, startIndex + MAPS_PER_PAGE);

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
            demon list
          </h1>
          <span className="text-sm mb-1" style={{ color: "#9da0b0" }}>
            {maps.length} maps
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

      {/* Column headers */}
      <div
        className="flex items-center gap-4 px-4 pb-2 mb-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "#5a5d6e", borderBottom: "1px solid #2a2d3a" }}
      >
        <div className="w-10 text-right">Rank</div>
        <div className="w-20">Stars</div>
        <div className="flex-1">Map</div>
        <div className="text-right">Points / Clears</div>
      </div>

      {/* Map cards */}
      <div className="space-y-2">
        {pageMaps.map((map) => {
          const verifierPlayer = map.qualifyingPlayers.find(
            (p) => p.clearRole === "verified"
          );
          return (
            <MapCard
              key={map.beatmapId}
              rank={map.rank}
              beatmapId={map.beatmapId}
              beatmapsetId={map.beatmapsetId}
              title={map.title}
              artist={map.artist}
              difficultyName={map.difficultyName}
              difficultyRating={map.difficultyRating}
              points={map.points}
              clearCount={map.qualifyingPlayers.length}
              verifier={verifierPlayer?.username}
              verifierUserId={verifierPlayer?.userId}
            />
          );
        })}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={clampedPage}
        totalPages={totalPages}
        basePath="/demon-list"
      />
    </div>
  );
}
