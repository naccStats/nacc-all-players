/* One look for every chart: colours, axes and tooltips. Pages import from here only. */
export const C = {
  bg: '#0c0a08', surface: '#181512', raised: '#211d18',
  ink: '#ffffff', soft: '#d9d5cf', muted: '#a39d95',
  line: 'rgba(255,255,255,0.08)', axis: 'rgba(255,255,255,0.16)',
  accent: '#c9a45a',
  gold: '#b8893a', blue: '#3987e5', aqua: '#199e70', orange: '#d95926',
};

/* Checked as a set on the card surface: these stay apart under colour-vision deficiency in this order. */
const BEAST_COLORS = { Luohou: C.orange, Kunpeng: C.blue, Diting: C.gold, Anzu: C.aqua };
/* A beast the sheet adds later takes one of these neutral tones until it is given a colour above. */
const NEW_BEAST_COLORS = ['#8f8a84', '#6f6961', '#b9b2a8'];
const KNOWN_BEASTS = Object.keys(BEAST_COLORS);
/* every beast named in the sheet, the known ones first */
export const beastNames = (players) => {
  const found = new Set(players.map((p) => p.chaosBeast).filter(Boolean));
  return [...KNOWN_BEASTS.filter((b) => found.has(b)), ...[...found].filter((b) => !KNOWN_BEASTS.includes(b)).sort()];
};
export const beastColor = (name) =>
  BEAST_COLORS[name] || NEW_BEAST_COLORS[[...String(name)].reduce((s, c) => s + c.codePointAt(0), 0) % NEW_BEAST_COLORS.length];
export const ROLE_COLORS = { Healer: C.aqua, Balanced: C.blue, Fighter: C.gold };
export const PAIR = [C.gold, C.blue];

export const FONT = 'Figtree, "Noto Serif SC", "Microsoft YaHei", "PingFang SC", system-ui, sans-serif';

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ENTITIES[c]);

export const tooltip = (extra = {}) => ({
  backgroundColor: C.raised, borderColor: C.axis, borderWidth: 1, padding: [10, 12], confine: true,
  textStyle: { color: C.soft, fontSize: 13, fontFamily: FONT, lineHeight: 20 },
  extraCssText: 'border-radius:8px;box-shadow:none;',
  ...extra,
});

/* tip('Title', [['Label', 'value'], ...]) is the body of every tooltip */
export const tip = (title, rows) =>
  `<div style="color:#fff;font-weight:500;margin-bottom:4px">${esc(title)}</div>` +
  rows.map(([k, v]) =>
    '<div style="display:flex;gap:20px;justify-content:space-between">' +
    `<span style="color:${C.muted}">${esc(k)}</span>` +
    `<span style="color:#fff;font-variant-numeric:tabular-nums">${esc(v)}</span></div>`
  ).join('');

export const isNarrow = (w) => w < 480;

/* Guild names down the side of a chart: in full on a phone too */
export const guildAxisLabel = (w) => (isNarrow(w) ? { width: 92, fontSize: 12 } : { width: 140 });

export const grid = (extra = {}) => ({ left: 4, right: 16, top: 16, bottom: 8, containLabel: true, ...extra });

const label = { color: C.muted, fontSize: 13, fontFamily: FONT, hideOverlap: true };
const name = { color: C.muted, fontSize: 13, fontFamily: FONT };

export const valueAxis = (extra = {}) => ({
  type: 'value',
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: C.line } },
  nameLocation: 'middle',
  nameTextStyle: name,
  ...extra,
  axisLabel: { ...label, ...(extra.axisLabel || {}) },
});

export const catAxis = (data, extra = {}) => ({
  type: 'category',
  data,
  axisLine: { lineStyle: { color: C.axis } },
  axisTick: { show: false },
  nameLocation: 'middle',
  nameTextStyle: name,
  ...extra,
  axisLabel: { ...label, color: C.soft, ...(extra.axisLabel || {}) },
});

/* Sequential ramp for counts: one hue, dark to light. */
export const RAMP = ['#2a241b', '#5d4a26', '#93733a', '#c9a45a', '#f0dcab'];
