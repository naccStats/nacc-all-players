# NACC — Immortal Cultivation Records

> Analytics dashboard for *Nobody's Adventure Chop Chop* (NA server).

---

## Overview

A data-driven React analytics platform displaying player and guild statistics parsed from CSV data files.

---

## Features

| Feature | Description |
|---|---|
| 📊 **Dashboard** | Player stats, top 10 cultivators, guild CP rankings, tribulation distribution, CP histogram |
| 🏆 **Rankings** | Sortable, filterable player table with pagination (30/page) |
| 🏯 **Guild Analytics** | Guild CP bar & pie charts, expandable guild cards with member breakdown |
| 📈 **Advanced Stats** | Scatter plots, tribulation avg CP bars, FDU/FDD correlation, composite scores |
| 🔮 **Visual Insights** | Radar chart for top 10 players, detailed stats for top players, guild avg CP, animated CP leaderboard |
| ☰ **Collapsible Sidebar** | Desktop collapse/expand; mobile slide-in drawer |
| 🔍 **Global Search** | Header search with animated dropdown across all players |
| ⚡ **Dynamic Charts** | All charts auto-update from CSV — no hardcoding |

## Tech Stack

| Library | Version | Purpose |
|---|---|---|
| React | 18 | UI framework |
| react-router-dom | 6 | Client-side routing (HashRouter) |
| framer-motion | 10 | Animations & transitions |
| echarts-for-react | 3 | Charts |
| lucide-react | 0.400 | Icons |
| papaparse | 5 | CSV parsing |

---

## ⚠️ Important: Updating Player Records

To update the analytics data, CSV files must be re-uploaded:

---

### 📄 `data/players.csv`

This file should contain **all players and their required information**.

**Requirements:**

* Must be a comma-separated `.csv` file
* Must contain exactly **12 columns**
* Columns (in order):

```
Count, Region, Guild, Player, UID, CP, FDU, FDD, Total Finals, Tribulation, Has Chaos, Updated?
```

---

### 📄 `data/topPlayer.csv`

This file should contain a **subset of top players with detailed statistics**.

**Requirements:**

* Must be a comma-separated `.csv` file
* Must contain exactly **15 columns**
* Columns (in order):

```
Guild, Player, UID, CP, Heal Up, Heal Down, Total Heal,
Beast Up, Beast Down, Total Beast,
FDU, FDD, Total Finals, Tribulation, Has Chaos
```

---

## ✅ Data Guidelines

* Files must be properly formatted CSV (comma-separated).
* No missing columns.
* No extra columns.
* Ensure there are no malformed rows or stray characters.
* Data should be clean and consistent before uploading.