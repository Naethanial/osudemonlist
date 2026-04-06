#!/usr/bin/env python3
"""
Plot `pointsForDemonRank` from src/scoring.ts for ranks 1..1000.

Requires: matplotlib (`pip install matplotlib` or use a venv).

Usage from repo root:
  python3 scripts/plot-demon-rank-curve.py
  python3 scripts/plot-demon-rank-curve.py --out docs/demon-rank-points-curve.png
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys


def repo_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def fetch_points_csv(root: str) -> str:
    ts = r"""
import { pointsForDemonRank } from './src/scoring.ts';
for (let x = 1; x <= 1000; x++) {
  console.log(x + ',' + pointsForDemonRank(x));
}
"""
    proc = subprocess.run(
        ["npx", "--yes", "tsx", "-e", ts],
        cwd=root,
        capture_output=True,
        text=True,
        check=True,
    )
    return proc.stdout


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--out",
        default=os.path.join(repo_root(), "docs", "demon-rank-points-curve.png"),
        help="Output PNG path",
    )
    args = parser.parse_args()

    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib is required: pip install matplotlib", file=sys.stderr)
        sys.exit(1)

    root = repo_root()
    raw = fetch_points_csv(root)
    xs: list[int] = []
    ys: list[float] = []
    for line in raw.strip().splitlines():
        a, b = line.split(",", 1)
        xs.append(int(a))
        ys.append(float(b))

    fig, ax = plt.subplots(figsize=(10, 5), dpi=150)
    ax.plot(xs, ys, color="#ff66aa", linewidth=1.5)
    ax.set_xlabel("Demon rank")
    ax.set_ylabel("Base points (before mod multiplier)")
    ax.set_title("pointsForDemonRank(rank), ranks 1–1000")
    ax.set_xlim(1, 1000)
    ax.grid(True, alpha=0.3)
    fig.patch.set_facecolor("#0f1117")
    ax.set_facecolor("#1a1c27")
    ax.tick_params(colors="#9da0b0")
    ax.xaxis.label.set_color("#c8cad4")
    ax.yaxis.label.set_color("#c8cad4")
    ax.title.set_color("#ffffff")
    ax.spines["bottom"].set_color("#2a2d3a")
    ax.spines["left"].set_color("#2a2d3a")
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    for g in ax.get_xgridlines() + ax.get_ygridlines():
        g.set_color("#2a2d3a")
        g.set_alpha(0.6)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)) or ".", exist_ok=True)
    fig.tight_layout()
    fig.savefig(args.out, facecolor=fig.get_facecolor())
    print(args.out)


if __name__ == "__main__":
    main()
