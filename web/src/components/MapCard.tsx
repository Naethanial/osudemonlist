"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "next-view-transitions";

const FALLBACK_TOP_ACCENT = "#ff66aa";

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0"))
    .join("")}`;
}

function averageColorFromImageData(data: Uint8ClampedArray): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 8) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (n === 0) return FALLBACK_TOP_ACCENT;
  r = Math.round(r / n);
  g = Math.round(g / n);
  b = Math.round(b / n);
  // Very dark averages read as a muddy border; lift slightly so glow is visible on dark UI
  const lum = (r + g + b) / 3;
  if (lum < 42) {
    const lift = 1.38;
    r = Math.min(255, Math.round(r * lift + 22));
    g = Math.min(255, Math.round(g * lift + 22));
    b = Math.min(255, Math.round(b * lift + 22));
  }
  return rgbToHex(r, g, b);
}

function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return { r: 255, g: 102, b: 170 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16),
  };
}

/** Push sampled colors toward higher luminance + lower saturation (pastel) for borders / accents. */
function pastelBrightRgb(r: number, g: number, b: number): { r: number; g: number; b: number } {
  const towardWhite = 0.55;
  let r2 = r + (255 - r) * towardWhite;
  let g2 = g + (255 - g) * towardWhite;
  let b2 = b + (255 - b) * towardWhite;
  const brighten = 1.1;
  r2 = Math.min(255, r2 * brighten);
  g2 = Math.min(255, g2 * brighten);
  b2 = Math.min(255, b2 * brighten);
  return {
    r: Math.round(r2),
    g: Math.round(g2),
    b: Math.round(b2),
  };
}

function pastelBrightHex(hex: string): string {
  const { r, g, b } = parseHexRgb(hex);
  const p = pastelBrightRgb(r, g, b);
  return rgbToHex(p.r, p.g, p.b);
}

/** Samples average RGB from cover via same-origin proxy (`/api/beatmap-cover/...`) so canvas is not CORS-tainted. */
async function sampleCoverAverageColor(proxyUrl: string): Promise<string | null> {
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = document.createElement("img");
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("image load"));
        el.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      const w = 72;
      const h = 54;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      return averageColorFromImageData(data);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

function topCardGlowStyle(accentHex: string): CSSProperties {
  const { r, g, b } = parseHexRgb(accentHex);
  return {
    boxShadow: [
      `0 0 0 1px rgba(${r},${g},${b},0.45)`,
      `0 0 10px rgba(${r},${g},${b},0.22)`,
      `0 0 22px rgba(${r},${g},${b},0.12)`,
      `0 6px 20px rgba(0,0,0,0.5)`,
    ].join(", "),
  };
}

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
  isTop?: boolean;
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
  isTop = false,
}: MapCardProps) {
  const coverUrl = `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover.jpg`;
  const mapUrl = `https://osu.ppy.sh/beatmapsets/${beatmapsetId}#osu/${beatmapId}`;
  const color = starColor(difficultyRating);

  const [coverAccent, setCoverAccent] = useState<string | null>(null);

  useEffect(() => {
    if (!isTop) return;
    let cancelled = false;
    (async () => {
      const sampled = await sampleCoverAverageColor(`/api/beatmap-cover/${beatmapsetId}`);
      if (!cancelled && sampled) setCoverAccent(sampled);
    })();
    return () => {
      cancelled = true;
    };
  }, [isTop, beatmapsetId]);

  const topAccent = useMemo(
    () => pastelBrightHex(coverAccent ?? FALLBACK_TOP_ACCENT),
    [coverAccent]
  );
  const topGlowStyle = useMemo(() => topCardGlowStyle(topAccent), [topAccent]);

  if (isTop) {
    return (
      <div className="relative mb-4">
        <Link
          href={`/demon-list/${beatmapId}`}
          className="relative flex items-center gap-4 rounded-xl overflow-hidden group transition-transform hover:-translate-y-[2px]"
          style={{
            backgroundColor: "#1a1c24",
            minHeight: 140,
            display: "flex",
            ...topGlowStyle,
          }}
        >
          {/* Background cover image */}
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={coverUrl}
              alt={title}
              fill
              className="object-cover opacity-[0.38] group-hover:opacity-[0.48] transition-opacity scale-105"
              sizes="(max-width: 1024px) 100vw, 900px"
              unoptimized
            />
            {/* Gradient overlay — a bit lighter so the cover reads brighter / softer */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, rgba(26,28,36,0.92) 22%, rgba(26,28,36,0.55) 62%, rgba(26,28,36,0.18) 100%)",
              }}
            />
          </div>

          {/* Content */}
          <div className="relative flex items-center gap-2 sm:gap-5 px-3 sm:px-5 py-4 sm:py-5 w-full pr-10 sm:pr-14">
            {/* Rank */}
            <div className="shrink-0 w-8 sm:w-10 text-right">
              <span className="text-sm sm:text-base font-bold" style={{ color: topAccent }}>
                #1
              </span>
            </div>

            {/* Star badge */}
            <div
              className="shrink-0 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-xs sm:text-sm font-bold tabular-nums"
              style={{ backgroundColor: "rgba(0,0,0,0.55)", color, border: `1px solid ${color}44` }}
            >
              ★ {difficultyRating.toFixed(2)}
            </div>

            {/* Map info */}
            <div className="flex-1 min-w-0">
              <div
                className="text-base sm:text-xl font-bold truncate"
                style={{ color: "#ffffff", textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
              >
                {title}
              </div>
              <div className="text-xs sm:text-sm truncate mt-0.5 sm:mt-1">
                <span style={{ color: "#9da0b0" }}>{artist}</span>
                <span style={{ color: "#5a5d6e" }}> — </span>
                <span className="font-semibold" style={{ color }}>{difficultyName}</span>
              </div>
              {verifier && (
                <div className="flex items-center gap-1 mt-0.5 sm:mt-1 min-w-0">
                  <span className="text-xs shrink-0" style={{ color: "#5a5d6e" }}>
                    verified by
                  </span>
                  {verifierUserId ? (
                    <a
                      href={`/users/${verifierUserId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs sm:text-sm font-semibold truncate min-w-0 hover:underline"
                      style={{ color: "#ff99cc" }}
                    >
                      {verifier}
                    </a>
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold truncate min-w-0" style={{ color: "#ff99cc" }}>
                      {verifier}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right stats */}
            <div className="shrink-0 text-right">
              <div className="text-lg sm:text-2xl font-bold tabular-nums" style={{ color: "#b6e534" }}>
                {points.toFixed(0)}
                <span className="text-xs sm:text-sm font-normal ml-1" style={{ color: "#5a5d6e" }}>
                  pts
                </span>
              </div>
              <div className="text-xs sm:text-sm mt-0.5" style={{ color: "#9da0b0" }}>
                {clearCount} clear{clearCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </Link>

        {/* External osu! link icon */}
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-md opacity-40 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          title="Open on osu!"
          aria-label="Open on osu!"
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
        <div className="relative flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 w-full pr-9 sm:pr-12">
          {/* Rank */}
          <div
            className="w-8 sm:w-10 text-right text-xs sm:text-sm font-bold shrink-0"
            style={{ color: "#5a5d6e" }}
          >
            #{rank}
          </div>

          {/* Star badge */}
          <div
            className="shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-xs font-bold tabular-nums"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", color }}
          >
            ★ {difficultyRating.toFixed(2)}
          </div>

          {/* Map info */}
          <div className="flex-1 min-w-0">
            <div
              className="text-xs sm:text-sm font-semibold truncate"
              style={{ color: "#ffffff" }}
            >
              {title}
            </div>
            <div className="text-xs truncate mt-0.5">
              <span style={{ color: "#9da0b0" }}>{artist}</span>
              <span style={{ color: "#5a5d6e" }}> — </span>
              <span className="font-medium" style={{ color }}>{difficultyName}</span>
            </div>
            {verifier && (
              <div className="flex items-center gap-1 mt-0.5 min-w-0">
                <span className="text-xs shrink-0" style={{ color: "#5a5d6e" }}>
                  verified by
                </span>
                {verifierUserId ? (
                  <a
                    href={`/users/${verifierUserId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-medium truncate min-w-0 hover:underline"
                    style={{ color: "#ff99cc" }}
                  >
                    {verifier}
                  </a>
                ) : (
                  <span className="text-xs font-medium truncate min-w-0" style={{ color: "#ff99cc" }}>
                    {verifier}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right stats */}
          <div className="shrink-0 text-right">
            <div className="text-xs sm:text-sm font-bold tabular-nums" style={{ color: "#b6e534" }}>
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
