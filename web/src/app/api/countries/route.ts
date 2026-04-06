import { NextResponse } from "next/server";
import { getPlayers } from "@/lib/data";
import { fetchCountriesForPlayers } from "@/lib/osuAuth";

function getCountryName(code: string): string {
  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

export async function GET() {
  const players = getPlayers();
  const userIds = players.map((p) => p.userId);
  const countryMap = await fetchCountriesForPlayers(userIds);

  const countryCounts = new Map<string, number>();
  for (const [, code] of countryMap) {
    countryCounts.set(code, (countryCounts.get(code) ?? 0) + 1);
  }

  const countries = [...countryCounts.entries()]
    .map(([code, count]) => ({
      code,
      name: getCountryName(code),
      playerCount: count,
    }))
    .sort((a, b) => b.playerCount - a.playerCount || a.name.localeCompare(b.name));

  return NextResponse.json(countries);
}
