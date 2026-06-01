# NACC — Immortal Cultivation Records

> Analytics dashboard for *Nobody's Adventure Chop Chop* (NA server) — built with a cultivation-realm aesthetic.

**Live:** https://naccstats.github.io/nacc-all-players/

---

## Overview

A data-driven React analytics platform displaying player and guild statistics parsed from CSV data files. Features a cinematic landing gate, constellation backgrounds, and responsive ECharts visualizations across eight pages.

---

## Pages

| Page | Description |
|---|---|
| **Dashboard** | Player stats overview, top 10 cultivators, guild CP rankings, tribulation distribution, CP histogram |
| **Rankings** | Sortable, filterable player table with pagination |
| **Guild Analytics** | Guild CP bar & pie charts, expandable guild cards with member breakdown and CP comparison |
| **Guild Comparison** | Side-by-side guild comparison with radar, scatter, and contribution charts |
| **Advanced Stats** | Scatter plots, tribulation avg CP, FDU/FDD correlation, composite score breakdowns |
| **Visual Insights** | Radar for top 10 players, animated CP leaderboard, guild average CP, 3D scatter |
| **Player Profile** | Individual player deep-dive — tribulation tier, CP rank, beast, finals stats, contribution charts |
| **Chaos Bestiary** | Beast unlock tracker, guild beast army rankings, beast dominance analytics |

---

## Tech Stack

| Library | Purpose |
|---|---|
| React 18 | UI framework |
| react-router-dom 6 | Client-side routing (HashRouter) |
| framer-motion 10 | Page & element animations |
| echarts-for-react 3 | Charts |
| echarts-gl | 3D scatter charts |
| lucide-react | Icons |
| papaparse 5 | CSV parsing |
| constellation.js (vendored) | Particle constellation backgrounds |

---

## Updating Player Records

### `data/players.csv`

Contains **all players**. Must be a comma-separated `.csv` with exactly **12 columns** in this order:

```
Count, Region, Guild, Player, UID, CP, FDU, FDD, Total Finals, Tribulation, Has Chaos, Updated?
```

### `data/topPlayer.csv`

Contains a **subset of top players** with detailed stats. Must be a comma-separated `.csv` with exactly **15 columns** in this order:

```
Guild, Player, UID, CP, Heal Up, Heal Down, Total Heal,
Beast Up, Beast Down, Total Beast,
FDU, FDD, Total Finals, Tribulation, Has Chaos
```

---

## Data Guidelines

- Files must be properly formatted CSV (comma-separated).
- No missing or extra columns.
- No malformed rows or stray characters.
- Player names and guild names must be consistent across both files.
- `Has Chaos` column should contain the beast name or be empty — not `null`/`none`.
- Guild field: `NoGuild` is treated as unguilded and excluded from guild charts.