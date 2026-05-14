/* Shared tier table — add a row here to add a new CP scale tier to both formatters. */
const CP_TIERS = [
  { suffix: 'P', minVal: 1_000_000, divisor: 1_000_000 },
  { suffix: 'T', minVal: 1_000,     divisor: 1_000 },
  { suffix: 'B', minVal: 1,         divisor: 1 },
];

export const formatCP = (raw) => {
  if (raw == null || isNaN(raw)) return '0M';
  if (raw < 1) return (raw * 1000).toFixed(0) + 'M';
  for (const { suffix, minVal, divisor } of CP_TIERS) {
    if (raw >= minVal) return (raw / divisor).toFixed(1) + suffix;
  }
  return raw.toFixed(1) + 'B';
};

/**
 * Compact axis label formatter — no decimals, same tiers as formatCP.
 * Keeps labels short so they never clip on narrow charts.
 */
export const formatCPShort = (raw) => {
  if (raw == null || isNaN(raw)) return '0M';
  if (raw < 1) return Math.round(raw * 1000) + 'M';
  for (const { suffix, minVal, divisor } of CP_TIERS) {
    if (raw >= minVal) return Math.round(raw / divisor) + suffix;
  }
  return Math.round(raw) + 'B';
};
  
  export const formatNumber = (n, decimals = 0) => {
    if (n == null || isNaN(n)) return '0';
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };
  
  export const formatShort = (n) => {
    if (n == null || isNaN(n)) return '0';
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  };
  
  export const formatTime = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }).format(date);
  };
  
  export const formatPercent = (n, decimals = 1) => {
    if (n == null || isNaN(n)) return '0%';
    return n.toFixed(decimals) + '%';
  };
  