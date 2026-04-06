"use client";

import { useRouter } from "next/navigation";

interface DemonListControlsProps {
  currentSort: string;
}

const SORTS = [
  { value: "difficulty", label: "Difficulty" },
  { value: "clears", label: "Clears" },
];

export default function DemonListControls({ currentSort }: DemonListControlsProps) {
  const router = useRouter();

  function navigate(sort: string) {
    const params = new URLSearchParams();
    if (sort !== "difficulty") params.set("sort", sort);
    const qs = params.toString();
    router.push(`/demon-list${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div
        className="flex items-center gap-0.5 p-1 rounded-lg"
        style={{ backgroundColor: "#1a1c27", border: "1px solid #2a2d3a" }}
      >
        {SORTS.map((s) => {
          const active = currentSort === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => navigate(s.value)}
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
    </div>
  );
}
