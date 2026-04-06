"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Country {
  code: string;
  name: string;
  playerCount: number;
}

interface RankingsControlsProps {
  currentSort: string;
  currentCountry: string;
  demonListSize: number;
  rankMin: number;
  rankMax: number;
}

const SORTS = [
  { value: "points", label: "Points" },
  { value: "clears", label: "Clears" },
  { value: "verifications", label: "Verifications" },
];

export default function RankingsControls({
  currentSort,
  currentCountry,
  demonListSize,
  rankMin,
  rankMax,
}: RankingsControlsProps) {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [localMin, setLocalMin] = useState(rankMin);
  const [localMax, setLocalMax] = useState(rankMax);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((data) => {
        setCountries(data as Country[]);
      })
      .catch(() => {})
      .finally(() => setCountriesLoading(false));
  }, []);

  useEffect(() => {
    setLocalMin(rankMin);
    setLocalMax(rankMax);
  }, [rankMin, rankMax]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const navigate = useCallback(
    (sort: string, country: string, rMin: number, rMax: number) => {
      const params = new URLSearchParams();
      if (sort !== "points") params.set("sort", sort);
      if (country) params.set("country", country);
      if (rMin !== 1 || rMax !== demonListSize) {
        params.set("rankMin", String(rMin));
        params.set("rankMax", String(rMax));
      }
      const qs = params.toString();
      router.push(`/rankings${qs ? `?${qs}` : ""}`);
    },
    [router, demonListSize]
  );

  const scheduleRankNavigate = useCallback(
    (nextMin: number, nextMax: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        navigate(currentSort, currentCountry, nextMin, nextMax);
      }, 280);
    },
    [navigate, currentSort, currentCountry]
  );

  const isFullRange = localMin === 1 && localMax === demonListSize;

  const rankSpan = Math.max(1, demonListSize - 1);
  const fillLeftPct = ((localMin - 1) / rankSpan) * 100;
  const fillWidthPct = ((localMax - localMin) / rankSpan) * 100;

  return (
    <div className="flex flex-col gap-4 w-full">
    <div className="flex items-center gap-3 flex-wrap">
      {/* Sort tabs */}
      <div
        className="flex items-center gap-0.5 p-1 rounded-lg"
        style={{ backgroundColor: "#1a1c27", border: "1px solid #2a2d3a" }}
      >
        {SORTS.map((s) => {
          const active = currentSort === s.value;
          return (
            <button
              key={s.value}
              onClick={() => navigate(s.value, currentCountry, rankMin, rankMax)}
              className="px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150"
              style={{
                backgroundColor: active ? "#ff66aa" : "transparent",
                color: active ? "#ffffff" : "#9da0b0",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Country filter — always visible, disabled while loading */}
      <div className="relative flex items-center">
        <select
          value={currentCountry}
          onChange={(e) => navigate(currentSort, e.target.value, rankMin, rankMax)}
          disabled={countriesLoading}
          className="appearance-none pl-8 pr-8 py-1.5 rounded-lg text-xs font-medium outline-none"
          style={{
            backgroundColor: currentCountry ? "#ff66aa1a" : "#1a1c27",
            color: currentCountry ? "#ff66aa" : countriesLoading ? "#5a5d6e" : "#9da0b0",
            border: currentCountry ? "1px solid #ff66aa44" : "1px solid #2a2d3a",
            cursor: countriesLoading ? "wait" : "pointer",
            minWidth: "160px",
          }}
        >
          {countriesLoading ? (
            <option value="">Loading countries...</option>
          ) : (
            <>
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.playerCount})
                </option>
              ))}
            </>
          )}
        </select>
        {/* Globe icon or spinner */}
        <span className="absolute left-2.5 pointer-events-none" style={{ color: currentCountry ? "#ff66aa" : "#5a5d6e" }}>
          {countriesLoading ? (
            <div
              className="w-3 h-3 rounded-full border-2 animate-spin"
              style={{ borderColor: "#5a5d6e33", borderTopColor: "#5a5d6e" }}
            />
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          )}
        </span>
        {/* Chevron */}
        <span className="absolute right-2.5 pointer-events-none" style={{ color: "#5a5d6e" }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {/* Active filters badge */}
      {currentCountry && (
        <button
          onClick={() => navigate(currentSort, "", rankMin, rankMax)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
          style={{ backgroundColor: "#ff66aa22", color: "#ff66aa", border: "1px solid #ff66aa44" }}
        >
          {currentCountry}
          <span>✕</span>
        </button>
      )}
    </div>

      {/* Full-width dual-handle demon rank range (left = min, right = max) */}
      <div className="w-full">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs" style={{ color: "#9da0b0" }}>
            <span className="font-semibold" style={{ color: "#c8cad4" }}>
              Demon rank
            </span>{" "}
            <span className="tabular-nums" style={{ color: "#ffffff" }}>
              #{localMin}
            </span>
            <span style={{ color: "#5a5d6e" }}> — </span>
            <span className="tabular-nums" style={{ color: "#ffffff" }}>
              #{localMax}
            </span>
          </p>
          {!isFullRange && (
            <button
              type="button"
              onClick={() => {
                setLocalMin(1);
                setLocalMax(demonListSize);
                navigate(currentSort, currentCountry, 1, demonListSize);
              }}
              className="text-xs font-medium shrink-0 px-2.5 py-1 rounded-md transition-opacity hover:opacity-85"
              style={{ color: "#ff66aa", backgroundColor: "#ff66aa18" }}
            >
              Reset
            </button>
          )}
        </div>

        <div className="relative w-full h-11 sm:h-12">
          {/* Track */}
          <div
            className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{ backgroundColor: "#2a2d3a" }}
            aria-hidden
          />
          {/* Selected span */}
          <div
            className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full pointer-events-none"
            style={{
              left: `${fillLeftPct}%`,
              width: `${fillWidthPct}%`,
              backgroundColor: "#ff66aa",
              minWidth: localMin === localMax ? "8px" : undefined,
            }}
            aria-hidden
          />
          <input
            type="range"
            min={1}
            max={demonListSize}
            step={1}
            value={localMin}
            onChange={(e) => {
              const v = Math.min(Number(e.target.value), localMax);
              setLocalMin(v);
              scheduleRankNavigate(v, localMax);
            }}
            className="rank-dual-range__input rank-dual-range__input--min"
            aria-label={`Minimum demon rank, ${localMin}`}
            aria-valuemin={1}
            aria-valuemax={demonListSize}
            aria-valuenow={localMin}
          />
          <input
            type="range"
            min={1}
            max={demonListSize}
            step={1}
            value={localMax}
            onChange={(e) => {
              const v = Math.max(Number(e.target.value), localMin);
              setLocalMax(v);
              scheduleRankNavigate(localMin, v);
            }}
            className="rank-dual-range__input rank-dual-range__input--max"
            aria-label={`Maximum demon rank, ${localMax}`}
            aria-valuemin={1}
            aria-valuemax={demonListSize}
            aria-valuenow={localMax}
          />
        </div>
        <div
          className="flex justify-between text-[10px] tabular-nums mt-1 px-0.5"
          style={{ color: "#5a5d6e" }}
        >
          <span>#1 (hardest)</span>
          <span>#{demonListSize}</span>
        </div>
      </div>
    </div>
  );
}
