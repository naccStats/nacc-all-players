/* The guild comparison's score, out of 100. Used by the Compare page and by the home page's third step.
   Total CP 40, average CP 30, average Finals 15 (each against the stronger of the two), beast rate 15. */
const share = (d, other, k) => (d[k] || 0) / Math.max(d[k] || 0, other[k] || 0, 1e-9);

export const SCORE_PARTS = [
  { label: 'Total CP, out of 40', of: (d, o) => share(d, o, 'totalCP') * 40 },
  { label: 'Average CP, out of 30', of: (d, o) => share(d, o, 'avgCP') * 30 },
  { label: 'Average Finals, out of 15', of: (d, o) => share(d, o, 'avgFinals') * 15 },
  { label: 'Beast owners, out of 15', of: (d) => (d.chaosRate || 0) * 15 },
];
export const guildScore = (d, other) => SCORE_PARTS.reduce((s, p) => s + p.of(d, other), 0);
