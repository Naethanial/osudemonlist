"use client";

import Image from "next/image";
import { Link } from "next-view-transitions";

interface PlayerRowProps {
  rank: number;
  userId: number;
  username: string;
  totalPoints: number;
  clearCount: number;
  verificationCount?: number;
  countryCode?: string;
  sort?: string;
}

export default function PlayerRow({
  rank,
  userId,
  username,
  totalPoints,
  clearCount,
  verificationCount,
  countryCode,
  sort = "points",
}: PlayerRowProps) {
  const medalColor =
    rank === 1 ? "#ffd700"
    : rank === 2 ? "#c0c0c0"
    : rank === 3 ? "#cd7f32"
    : null;

  const rankColor = medalColor ?? "#9da0b0";
  const accentColor = medalColor ?? "#ffffff";

  return (
    <div className="relative group">
      {/* Main clickable row → internal profile */}
      <Link
        href={`/users/${userId}`}
        className="player-row flex items-center gap-1.5 sm:gap-3 px-2 sm:px-4 py-3 rounded-lg transition-colors"
      >
        {/* Rank */}
        <div
          className="w-8 sm:w-10 text-right text-sm font-bold shrink-0"
          style={{ color: rankColor }}
        >
          #{rank}
        </div>

        {/* Avatar */}
        <div className="w-9 h-9 shrink-0 rounded-full overflow-hidden relative">
          <Image
            src={`https://a.ppy.sh/${userId}`}
            alt={username}
            fill
            className="object-cover"
            sizes="36px"
            unoptimized
          />
        </div>

        {/* Country flag */}
        <div className="w-6 h-4 shrink-0 relative overflow-hidden rounded-[2px]">
          {countryCode ? (
            <Image
              src={`https://osu.ppy.sh/images/flags/${countryCode}.png`}
              alt={countryCode}
              fill
              className="object-cover"
              sizes="24px"
              unoptimized
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-xs"
              style={{ backgroundColor: "#2a2d3a", color: "#5a5d6e" }}
            >
              ?
            </div>
          )}
        </div>

        {/* Username */}
        <div className="flex-1 min-w-0 sm:pr-7">
          <span
            className="text-sm font-medium truncate block group-hover:underline"
            style={{ color: accentColor }}
          >
            {username}
          </span>
        </div>

        {/* Points */}
        <div className="text-right shrink-0 w-20 sm:w-28">
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: sort === "points" ? accentColor : "#9da0b0" }}
          >
            {totalPoints.toFixed(2)}
          </span>
          <span className="text-xs ml-1" style={{ color: "#5a5d6e" }}>
            pts
          </span>
        </div>

        {/* Clears / Verifications — hidden on mobile, swaps based on sort on desktop */}
        {sort === "verifications" ? (
          <div className="hidden sm:block text-right shrink-0 w-20">
            <span className="text-sm font-bold tabular-nums" style={{ color: accentColor }}>
              {verificationCount ?? 0}
            </span>
            <span className="text-xs ml-1" style={{ color: "#5a5d6e" }}>
              verifs
            </span>
          </div>
        ) : (
          <div className="hidden sm:block text-right shrink-0 w-16">
            <span
              className="text-sm tabular-nums font-bold"
              style={{ color: sort === "clears" ? accentColor : "#9da0b0" }}
            >
              {clearCount}
            </span>
            <span className="text-xs ml-1" style={{ color: "#5a5d6e" }}>
              clears
            </span>
          </div>
        )}
      </Link>

      {/* External osu! profile link — hidden on mobile (hover-only feature) */}
      <a
        href={`https://osu.ppy.sh/users/${userId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:block absolute right-[7.5rem] top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        title="Open osu! profile"
        aria-label={`${username} on osu!`}
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
          style={{ color: "#9da0b0" }}
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </a>
    </div>
  );
}
