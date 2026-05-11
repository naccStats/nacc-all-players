/**
 * Tribulation ordering (strongest → weakest):
 * DG > SM > CE > CK > DL > GI > SI > CI > TI > GA > BI > VT > T > NS > QR
 *
 * Each tier supports sub-ranks 1–3, where 3 is strongest within its tier.
 * e.g.  CK3 > CK2 > CK1, and any CK beats any DL regardless of sub-rank.
 *
 * IMPORTANT: Longer/more-specific prefixes that share a leading character MUST
 * appear before their shorter counterparts so startsWith() matches correctly.
 * e.g.  'TI' must come before 'T'.
 *
 * Index 0  = DG (strongest) → base rank = 15
 * Index 14 = QR (weakest)   → base rank = 1
 */
const TRIB_PREFIXES = [
  'DG',  // 15 — Demigod
  'SM',  // 14 — Supreme Master
  'CE',  // 13 — Celestial Emperor
  'CK',  // 12 — Celestial King
  'DL',  // 11 — Divine Lord
  'GI',  // 10 — Golden Immortal
  'SI',  //  9 — Supreme Immortal
  'CI',  //  8 — Celestial Immortal
  'TI',  //  7 — True Immortal   ← must be before 'T'
  'GA',  //  6 — Grand Ascension
  'BI',  //  5 — Body Integration
  'VT',  //  4 — Void Training
  'T',   //  3 — Transformation  ← after 'TI'
  'NS',  //  2 — Nascent Soul
  'QR',  //  1 — Qi Refinement
];

const TRIB_NAMES = {
  15: 'Demigod',
  14: 'Supreme Master',
  13: 'Celestial Emperor',
  12: 'Celestial King',
  11: 'Divine Lord',
  10: 'Golden Immortal',
  9:  'Supreme Immortal',
  8:  'Celestial Immortal',
  7:  'True Immortal',
  6:  'Grand Ascension',
  5:  'Body Integration',
  4:  'Void Training',
  3:  'Transformation',
  2:  'Nascent Soul',
  1:  'Qi Refinement',
};

/**
 * Parse a tribulation string into { prefix, base (1-15), sub (1-3 or 0) }.
 * sub = 0 means no numeric suffix was present.
 * Returns null for unrecognised values.
 */
function parseTrib(t) {
  if (t == null) return null;
  const s = String(t).trim().toUpperCase();
  if (!s) return null;
  for (let i = 0; i < TRIB_PREFIXES.length; i++) {
    if (s.startsWith(TRIB_PREFIXES[i])) {
      const base = TRIB_PREFIXES.length - i; // 1–15
      const rest = s.slice(TRIB_PREFIXES[i].length);
      const sub = parseInt(rest, 10);
      return {
        prefix: TRIB_PREFIXES[i],
        base,
        sub: (!isNaN(sub) && sub >= 1 && sub <= 3) ? sub : 0,
      };
    }
  }
  return null;
}

/**
 * Returns a fractional numeric rank so sub-ranks resolve correctly:
 *   CK1 = 12.000, CK2 = 12.333, CK3 = 12.667
 * Any CK value is always > any DL value (11.xxx). Returns 0 for unknown.
 */
export const tribRank = (t) => {
  const p = parseTrib(t);
  if (!p) return 0;
  return p.sub > 0 ? p.base + (p.sub - 1) / 3 : p.base;
};

/**
 * Returns a hex color for a tribulation string.
 * Color is determined by tier only (sub-rank doesn't affect color).
 */
export const tribColor = (t) => {
  const r = Math.floor(tribRank(t)); // floor so CK2 (12.333) → 12
  if (r >= 15) return '#C9920B'; // DG  — Dragon Gold
  if (r >= 14) return '#FF3B2B'; // SM  — Cinnabar Red
  if (r >= 13) return '#FF8C42'; // CE  — Flame Orange
  if (r >= 12) return '#FF00FF'; // CK  — Mystic Magenta
  if (r >= 11) return '#B026FF'; // DL  — Imperial Purple
  if (r >= 10) return '#00BFFF'; // GI  — Azure Sky
  if (r >= 9)  return '#00E87C'; // SI  — Jade Green
  if (r >= 8)  return '#3DD68C'; // CI  — Lighter Jade
  if (r >= 7)  return '#6B8AFF'; // TI  — Spirit Blue
  if (r >= 6)  return '#C9920B'; // GA  — Amber Gold (lower)
  if (r >= 5)  return '#7A6045'; // BI  — Bronze
  if (r >= 4)  return '#9AB4C8'; // VT  — Void Silver
  if (r >= 3)  return '#70C1B3'; // T   — Teal Transformation
  if (r >= 2)  return '#5B8DB8'; // NS  — Nascent Blue
  if (r >= 1)  return '#4A5568'; // QR  — Qi Grey
  return '#2D2040';              // Unknown
};

/**
 * Returns a full display label including sub-rank when present.
 * e.g. "CK2" → "Celestial King 2",  "CK" → "Celestial King"
 */
export const tribLabel = (t) => {
  if (!t) return 'Unknown';
  const p = parseTrib(t);
  if (!p) return String(t);
  const name = TRIB_NAMES[p.base] || String(t);
  return p.sub > 0 ? `${name} ${p.sub}` : name;
};
