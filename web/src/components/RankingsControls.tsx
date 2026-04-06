"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Country {
  code: string;
  name: string;
  playerCount: number;
}

interface RankingsControlsProps {
  currentSort: string;
  currentCountry: string;
}

const SORTS = [
  { value: "points", label: "Points" },
  { value: "clears", label: "Clears" },
  { value: "verifications", label: "Verifications" },
];

export default function RankingsControls({
  currentSort,
  currentCountry,
}: RankingsControlsProps) {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  useEffect(() => {
    fetch("/api/countries")
      .then((r) => r.json())
      .then((data) => {
        setCountries(data as Country[]);
      })
      .catch(() => {})
      .finally(() => setCountriesLoading(false));
  }, []);

  function navigate(sort: string, country: string) {
    const params = new URLSearchParams();
    if (sort !== "points") params.set("sort", sort);
    if (country) params.set("country", country);
    const qs = params.toString();
    router.push(`/rankings${qs ? `?${qs}` : ""}`);
  }

  return (
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
              onClick={() => navigate(s.value, currentCountry)}
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
          onChange={(e) => navigate(currentSort, e.target.value)}
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
          onClick={() => navigate(currentSort, "")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-opacity hover:opacity-70"
          style={{ backgroundColor: "#ff66aa22", color: "#ff66aa", border: "1px solid #ff66aa44" }}
        >
          {currentCountry}
          <span>✕</span>
        </button>
      )}
    </div>
  );
}
