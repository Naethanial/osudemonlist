"use client";

import Image from "next/image";
import { Link } from "next-view-transitions";

interface MapCardProps {
  rank: number;
  beatmapId: number;
  beatmapsetId: number;
  title: string;
  artist: string;
  difficultyName: string;
  difficultyRating: number;
  points: number;
  clearCount: number;
  verifier?: string;
  verifierUserId?: number;
}

function starColor(stars: number): string {
  if (stars >= 9) return "#ff6060";
  if (stars >= 8) return "#ff9966";
  if (stars >= 7) return "#ffcc22";
  if (stars >= 6) return "#aadd00";
  if (stars >= 5) return "#66ccff";
  return "#aaaaff";
}

export default function MapCard({
  rank,
  beatmapId,
  beatmapsetId,
  title,
  artist,
  difficultyName,
  difficultyRating,
  points,
  clearCount,
  verifier,
  verifierUserId,
}: MapCardProps) {
  const coverUrl = `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover.jpg`;
  const mapUrl = `https://osu.ppy.sh/beatmapsets/${beatmapsetId}#osu/${beatmapId}`;
  const color = starColor(difficultyRating);

  return (
    <div className="relative">
      <Link
        href={`/demon-list/${beatmapId}`}
        className="relative flex items-center gap-4 rounded-xl overflow-hidden group transition-transform hover:-translate-y-[1px]"
        style={{ backgroundColor: "#1e2028", minHeight: 76, display: "flex" }}
      >
        {/* Background cover image */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover opacity-20 group-hover:opacity-30 transition-opacity scale-105"
            sizes="(max-width: 1024px) 100vw, 900px"
            unoptimized
          />
          {/* Gradient overlay: solid left, transparent right */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to right, #1e2028 30%, rgba(30,32,40,0.6) 70%, rgba(30,32,40,0.3) 100%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="relative flex items-center gap-4 px-4 py-3 w-full pr-12">
          {/* Rank */}
          <div
            className="w-10 text-right text-sm font-bold shrink-0"
            style={{ color: "#5a5d6e" }}
          >
            #{rank}
          </div>

          {/* Star badge */}
          <div
            className="shrink-0 px-2 py-0.5 rounded text-xs font-bold tabular-nums"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", color }}
          >
            ★ {difficultyRating.toFixed(2)}
          </div>

          {/* Map info */}
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-semibold truncate"
              style={{ color: "#ffffff" }}
            >
              {title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs truncate" style={{ color: "#9da0b0" }}>
                {artist}
              </span>
              <span className="text-xs shrink-0" style={{ color: "#5a5d6e" }}>
                —
              </span>
              <span
                className="text-xs truncate font-medium shrink-0 max-w-[160px]"
                style={{ color: color }}
              >
                {difficultyName}
              </span>
            </div>
            {verifier && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs shrink-0" style={{ color: "#5a5d6e" }}>
                  verified by
                </span>
                {verifierUserId ? (
                  <a
                    href={`/users/${verifierUserId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium truncate hover:underline"
                    style={{ color: "#ff99cc" }}
                  >
                    {verifier}
                  </a>
                ) : (
                  <span className="text-xs font-medium truncate" style={{ color: "#ff99cc" }}>
                    {verifier}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right stats */}
          <div className="shrink-0 text-right">
            <div className="text-sm font-bold tabular-nums" style={{ color: "#b6e534" }}>
              {points.toFixed(0)}{" "}
              <span className="text-xs font-normal" style={{ color: "#5a5d6e" }}>
                pts
              </span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#9da0b0" }}>
              {clearCount} clear{clearCount !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </Link>

      {/* External osu! link icon — sits in the top-right corner */}
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-7 h-7 rounded-md opacity-40 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        title="Open on osu!"
        aria-label="Open on osu!"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "#ffffff" }}
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}
