/**
 * chartResponsive.js — Centralised responsive helpers for ECharts option functions.
 *
 * ─── ADDING A NEW CHART ────────────────────────────────────────────────────
 *
 * 1. Write your option function accepting a width param:
 *
 *      import { bp, rGrid, rLabel } from '../utils/chartResponsive';
 *
 *      function myChart(data, w = 400) {
 *        const { pick } = bp(w);
 *        return {
 *          grid: rGrid(w, { top: 16 }),
 *          xAxis: { axisLabel: rLabel(w, { rotate: pick(45, 20) }) },
 *          // ...
 *        };
 *      }
 *
 * 2. Drop it in JSX — pick the closest type and you're done:
 *
 *      <ChartContainer option={(w) => myChart(data, w)} type="bar" />
 *      <ChartContainer option={myPieData}               type="pie" />
 *      <ChartContainer option={my3DData}                type="3d"  />
 *
 *    Override any default with an explicit prop:
 *      <ChartContainer option={...} type="bar" maxHeight={400} />
 *
 * ─── CHART TYPE DEFAULTS ───────────────────────────────────────────────────
 * The runtime copy of these defaults lives in ChartContainer.js → CHART_DEFAULTS.
 * If you change a value below, mirror the change there (and vice versa).
 * Do NOT import ChartContainer here — that creates a circular dependency.
 *
 * type     ratio  maxHeight  square  gl    notes
 * ───────────────────────────────────────────────────────────────────────────
 * pie      1      300        true    false square prevents horizontal stretch
 * scatter  1      320        true    false square keeps circles round
 * bar      1      340        false   false standard bar / horizontal bar
 * treemap  1      360        false   false
 * bubble   1      380        false   false scatter-bubble charts
 * box      1      360        false   false box plots
 * heatmap  1      360        false   false
 * 3d       0.75   430        false   true  gl enables mobile tap-to-tooltip
 *
 * ─── BREAKPOINTS ───────────────────────────────────────────────────────────
 */
export const CHART_BREAKPOINTS = {
  sm: 480,  // "small" — phones in portrait
  md: 720,  // "medium" — phones landscape / small tablets
};

/**
 * bp(w) — returns a breakpoint context for the given canvas width.
 *
 * @param {number} w - canvas width in pixels (from ChartContainer)
 * @returns {{ sm: boolean, md: boolean, pick: (small: any, large: any) => any }}
 *
 * Example:
 *   const { sm, pick } = bp(w);
 *   fontSize: pick(7, 9)   // 7 on sm screens, 9 on larger
 */
export function bp(w) {
  const sm = w < CHART_BREAKPOINTS.sm;
  const md = w < CHART_BREAKPOINTS.md;
  return {
    sm,
    md,
    /** Return `small` when on a small screen, `large` otherwise. */
    pick: (small, large) => (sm ? small : large),
    /** Return `small` on sm, `mid` on md, `large` on desktop. */
    pick3: (small, mid, large) => (sm ? small : md ? mid : large),
  };
}

/**
 * rGrid(w, overrides) — standard ECharts grid with tightened margins on small screens.
 *
 * Default (small / large):
 *   left: 8, right: 8, top: 12, bottom: 8 — containLabel: true
 *
 * @param {number} w
 * @param {object} [overrides] - any grid keys to override after bp logic is applied
 */
export function rGrid(w, overrides = {}) {
  return {
    left: 8,
    right: 8,
    top: 12,
    bottom: 8,
    containLabel: true,
    ...overrides,
  };
}

/**
 * rLabel(w, overrides) — responsive axisLabel defaults.
 *
 * Default (small / large):
 *   color: '#8B7E6A', fontSize: 8 / 9, rotate: 0, overflow: 'truncate'
 *
 * @param {number} w
 * @param {object} [overrides] - any axisLabel keys to override
 */
export function rLabel(w, overrides = {}) {
  const { sm } = bp(w);
  return {
    color: '#8B7E6A',
    fontSize: sm ? 8 : 9,
    overflow: 'truncate',
    ...overrides,
  };
}

/**
 * rValueLabel(w, overrides) — like rLabel but for value (non-category) axes —
 * lighter color, no rotation.
 */
export function rValueLabel(w, overrides = {}) {
  const { sm } = bp(w);
  return {
    color: '#8B7E6A',
    fontSize: sm ? 8 : 9,
    ...overrides,
  };
}

/**
 * rNameText(w, overrides) — responsive nameTextStyle for axis names.
 */
export function rNameText(w, overrides = {}) {
  const { sm } = bp(w);
  return {
    color: '#8B7E6A',
    fontSize: sm ? 8 : 9,
    ...overrides,
  };
}
