# NACC player and guild rankings

Player and guild stats for *Nobody's Adventure Chop Chop* (NA region), read from two CSV files.

**Live:** https://naccstats.github.io/nacc-all-players/

---

## Structure

| Path | What it is |
|---|---|
| `index.html`, `home/render.mjs` | Home page. Static HTML; every figure, table and drawn screen on it is written from `public/data/*.csv` at build time |
| `app/index.html`, `src/` | React app with the analytics pages, served at `/app/` (HashRouter) |
| `public/assets/` | Design kit used by the home page (tasteskill). Do not edit; page CSS lives in `index.html` |
| `public/home/` | The ink paintings on the home page |
| `src/data-date.js` | The "As of" date shown on every page. Change it with each data update |
| `src/brand/` | The animated logo, guild crests, medals and tier gems, shared by both parts |
| `src/styles/app.css`, `src/utils/chartTheme.js` | Colours, type and chart styling of the app |

Links from before the move (`/#/rankings`, `/#/player/<uid>`) redirect to the same page under `/app/`.

## Pages

| Page | Route | Description |
|---|---|---|
| **Overview** | `#/` | Server totals, rank lookup, top 10, tiers, guild power, power spread |
| **Players** | `#/rankings` | Sortable, filterable player table with CSV download |
| **Guilds** | `#/guilds` | Power and share, players by tier, roster, average power against size |
| **Compare** | `#/compare?a=&b=` | Two guilds side by side with a score; the link keeps the choice |
| **Beasts** | `#/bestiary` | Chaos beast owners, their power, beasts by guild |
| **Insights** | `#/insights` | Top 10 radar, every stat of the top players, healers and fighters |
| **Advanced** | `#/advanced` | CP to rank, 3D scatter, FDU and FDD, tier ranges, composite score |
| **Player** | `#/player/<uid>` | One player against the region |

## Commands

```bash
npm start        # dev server
npm run build    # production build in dist/
```

Built with Vite, React 18, react-router-dom, ECharts and echarts-gl, lucide-react and Papa Parse.

---

## Updating Player Records

1. Replace the files in `public/data/`.
2. Set the date in **`src/data-date.js`** (`DATA_AS_OF`). It is shown exactly as written on every page.
3. Commit and push to `main`. The GitHub Actions workflow builds the site and publishes it.

### `public/data/players.csv`

Contains **all players**. Must be a comma-separated `.csv` with exactly **12 columns** in this order:

```
Count, Region, Guild, Player, UID, CP, FDU, FDD, Total Finals, Tribulation, Has Chaos, Updated?
```

### `public/data/topPlayers.csv`

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
- `Updated?` is `Y` for an active player and `AFK` for an inactive one.
- `Has Chaos` column should contain the beast name or be empty — not `null`/`none`.
- Guild field: `NoGuild` or `No Guild` is treated as unguilded and excluded from guild charts.