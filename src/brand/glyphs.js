/* Every drawn mark of the site, as SVG strings: the React app and the static home page share them. */
import { tribColor, tribLabel } from '../utils/tribulationSystem.js';

const r1 = (n) => Math.round(n * 100) / 100;
const polar = (cx, cy, r, deg) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r1(cx + r * Math.cos(a)), r1(cy + r * Math.sin(a))];
};
const attr = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---- Logo: a brush ring with a spirit flame, and a pearl that circles it (brand.css moves it) ---- */

/* A brush stroke bent into a ring: thin where the brush lands, full in the middle, dry at the end. */
function brushRing(cx, cy, r, from, sweep) {
  const outer = [];
  const inner = [];
  const n = 64;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    const w = 0.35 + 2.5 * Math.sin(Math.PI * s ** 0.62) ** 0.9 + 0.22 * Math.sin(s * 23);
    outer.push(polar(cx, cy, r + w * 0.62, from + sweep * s).join(' '));
    inner.push(polar(cx, cy, r - w * 0.62, from + sweep * s).join(' '));
  }
  return `M${outer.join('L')}L${inner.reverse().join('L')}Z`;
}
const RING = brushRing(24, 24, 19, 32, 318);
const PETAL = 'M24 35.500c-5.200-5-6-12.500 0-20.500 6 8 5.200 15.500 0 20.500z';
/* outer petals first, so the middle one lies on top */
const PETALS = [[-68, .55], [68, .55], [-36, .78], [36, .78], [0, 1]];

export const logoSvg = (uid = 'a') =>
  `<svg class="logo-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">` +
  `<defs><linearGradient id="lg-p-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3d6"/><stop offset=".5" stop-color="#e3b65c"/><stop offset="1" stop-color="#d95926"/></linearGradient>` +
  `<linearGradient id="lg-r-${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff8e6"/><stop offset="1" stop-color="#c9a45a"/></linearGradient>` +
  `<mask id="lg-m-${uid}"><circle class="logo-mark__draw" cx="24" cy="24" r="19" fill="none" stroke="#fff" stroke-width="10" pathLength="100" transform="rotate(-60 24 24)"/></mask></defs>` +
  `<path d="${RING}" fill="url(#lg-r-${uid})" mask="url(#lg-m-${uid})"/>` +
  `<g class="logo-mark__lotus">${PETALS.map(([a, o]) => `<g class="logo-mark__petal" style="--a:${a}deg"><path d="${PETAL}" transform="translate(24 35.5) scale(${0.62 + o * 0.38}) translate(-24 -35.5)" fill="url(#lg-p-${uid})" fill-opacity="${o}" stroke="#15120f" stroke-width=".7"/></g>`).join('')}</g>` +
  `<g class="logo-mark__orbit"><circle cx="31.1" cy="6.4" r="2.5" fill="#fff6df"/></g></svg>`;

/* ---- Guild crest: one drawn from each guild's name, so a guild always wears the same one ---- */

const CREST_COLORS = ['#e0b964', '#e07a5f', '#62c29a', '#6fabe6', '#dd9150', '#52b8b8', '#e0879c', '#b0bb62', '#bcc4cc', '#cdb78f'];
const hash = (s) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619) >>> 0;
  return h;
};
const polygon = (n, r, turn = 0) => Array.from({ length: n }, (_, i) => polar(24, 24, r, turn + (360 / n) * i).join(',')).join(' ');

export function crestSvg(name, size = 36) {
  if (!name) {
    return `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="none" stroke="#6f6961" stroke-width="1.5" stroke-dasharray="3 4"/></svg>`;
  }
  const h = hash(`17h0${name}`);
  const c = CREST_COLORS[h % CREST_COLORS.length];
  const folds = 4 + ((h >>> 8) % 5);
  const motif = (h >>> 13) % 4;
  const frame = (h >>> 17) % 4;
  const edge = [
    `<circle cx="24" cy="24" r="21.5"/>`,
    `<polygon points="${polygon(6, 22.5)}"/>`,
    `<polygon points="${polygon(8, 22.5, 22.5)}"/>`,
    `<path d="M24 2 43 9v16c0 10-8 17-19 21C13 42 5 35 5 25V9z"/>`,
  ][frame];
  const petal = {
    0: 'M24 8.5C28 14 28 19 24 24 20 19 20 14 24 8.5Z',
    1: 'M24 9l3.4 8L24 24l-3.4-7z',
    2: 'M24 10a5 5 0 0 1 0 10 5 5 0 0 1 0-10z',
    3: 'M22.6 24C18 18 19 12 24 8c-1 4 1.6 6 2.6 9 .8 2.600-.6 5-4 7z',
  }[motif];
  const petals = Array.from({ length: folds }, (_, i) => `<path d="${petal}" transform="rotate(${r1((360 / folds) * i)} 24 24)"/>`).join('');
  return `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">` +
    `<g fill="${c}" fill-opacity=".13" stroke="${c}" stroke-width="1.5" stroke-linejoin="round">${edge}</g>` +
    `<g fill="${c}" fill-opacity=".9">${petals}</g><circle cx="24" cy="24" r="3" fill="#15120f"/></svg>`;
}

/* ---- Rank: a medal for the first three, a numeral after that ---- */

const METAL = { 1: ['#fff1c9', '#e3b65c', '#8f6a22'], 2: ['#ffffff', '#c2cad2', '#737d88'], 3: ['#ffd9b5', '#cf8a55', '#7d4a24'] };
const LEAF = 'M10.5 24c-3.600-.2-5.600-2-6.300-5 3.300.100 5.400 1.800 6.300 5z';

export function rankSvg(rank, size = 40) {
  const m = METAL[rank];
  if (!m) return `<span class="rank-no">${rank}</span>`;
  const leaves = [0, 26, 52, 78, 104].map((a) => `<path d="${LEAF}" transform="rotate(${a - 64} 24 24)"/><path d="${LEAF}" transform="translate(48 0) scale(-1 1) rotate(${a - 64} 24 24)"/>`).join('');
  return `<svg class="medal" width="${size}" height="${size}" viewBox="0 0 48 48" role="img" aria-label="Rank ${rank}">` +
    `<defs><linearGradient id="md-${rank}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m[0]}"/><stop offset=".5" stop-color="${m[1]}"/><stop offset="1" stop-color="${m[2]}"/></linearGradient></defs>` +
    `<g fill="url(#md-${rank})">${leaves}</g><circle cx="24" cy="24" r="12" fill="#15120f" stroke="url(#md-${rank})" stroke-width="1.8"/>` +
    `<text x="24" y="29.600" text-anchor="middle" font-family="Spectral, Georgia, serif" font-weight="500" font-size="17" fill="${m[0]}">${rank}</text></svg>`;
}

/* ---- Tier: a cut gem in the tier's own gold ---- */

export function tierHtml(trib, { short = false } = {}) {
  if (!trib) return '<span class="muted">-</span>';
  const c = tribColor(trib);
  const gem = `<svg class="gem" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1 18 7.500 10 19 2 7.500z" fill="${c}"/><path d="M10 1 6.500 7.500h7z" fill="#fff" fill-opacity=".45"/><path d="M6.500 7.500 10 19 2 7.500z" fill="#000" fill-opacity=".12"/><path d="M13.500 7.500 10 19l8-11.500z" fill="#000" fill-opacity=".3"/></svg>`;
  return `<span class="tier" style="--t:${c}" title="${attr(tribLabel(trib))}">${gem}${attr(short ? trib : tribLabel(trib))}</span>`;
}

/* ---- Beasts: a small sign each, always beside its name ---- */

const BEAST_SIGNS = {
  Luohou: '<path d="M14.500 10.800A5.800 5.800 0 1 1 8.600 3.400a4.600 4.600 0 0 0 5.900 7.400z"/>',
  Kunpeng: '<path d="M1.500 11.500c3 0 3.700-5.500 7.500-5.500s4 3.200 7.500 2.200c-1.500 4.300-4.500 5.300-7 4.100-2-1-2.400-2.600-4-2.100-1.200.400-1.800 1.600-4 1.300z"/>',
  Diting: '<path d="M9 2.500a6.500 6.500 0 1 0 6.500 6.500h-2.400A4.100 4.100 0 1 1 9 4.900zM9 7a2 2 0 1 0 2 2h-2z"/>',
  Anzu: '<path d="M15.500 2.500C8 3 3.500 7 2.500 15.500l2-2.500c1.200.500 2.600.400 3.900-.200L7 11.500c2.500.200 4.500-.600 6-2.400l-2-.300c2.500-1.200 4-3.200 4.500-6.300z"/>',
};
export const beastSvg = (name, color, size = 18) =>
  `<svg class="beast-sign" width="${size}" height="${size}" viewBox="0 0 18 18" fill="${color}" aria-hidden="true">${BEAST_SIGNS[name] || '<circle cx="9" cy="9" r="5"/>'}</svg>`;

/* ---- Power: the figure set large, its unit small ---- */
export const cpHtml = (text) => {
  const m = /^([\d.,]+)([A-Z])$/.exec(text);
  return m ? `${m[1]}<small>${m[2]}</small>` : text;
};
