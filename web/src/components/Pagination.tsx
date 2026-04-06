"use client";

import { Link } from "next-view-transitions";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
}: PaginationProps) {
  const pageUrl = (p: number) => `${basePath}?page=${p}`;

  // Build page number list with ellipsis
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const btnBase =
    "flex items-center justify-center min-w-[36px] h-9 px-2 rounded text-sm font-medium transition-all";
  const activeStyle = { backgroundColor: "#ff66aa", color: "#ffffff" };
  const inactiveStyle = { backgroundColor: "#1e2028", color: "#9da0b0" };
  const navStyle = { backgroundColor: "#1e2028", color: "#9da0b0" };

  return (
    <div className="flex items-center justify-center gap-1 py-6">
      {/* PREV */}
      {currentPage > 1 ? (
        <Link href={pageUrl(currentPage - 1)} className={btnBase} style={navStyle}>
          ‹ prev
        </Link>
      ) : (
        <span className={btnBase} style={{ ...navStyle, opacity: 0.4 }}>
          ‹ prev
        </span>
      )}

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className={btnBase}
            style={{ color: "#5a5d6e", backgroundColor: "transparent" }}
          >
            …
          </span>
        ) : (
          <Link
            key={p}
            href={pageUrl(p)}
            className={btnBase}
            style={p === currentPage ? activeStyle : inactiveStyle}
          >
            {p}
          </Link>
        )
      )}

      {/* NEXT */}
      {currentPage < totalPages ? (
        <Link href={pageUrl(currentPage + 1)} className={btnBase} style={navStyle}>
          next ›
        </Link>
      ) : (
        <span className={btnBase} style={{ ...navStyle, opacity: 0.4 }}>
          next ›
        </span>
      )}
    </div>
  );
}
