import Papa from 'papaparse';

function toNumber(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export const parseCSV = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();

    const result = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      trimHeaders: true,
    });

    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      console.warn('[CSV] Parsed CSV but got no rows.');
      return [];
    }

    const players = [];
    const uidMap = new Map();

    for (const row of result.data) {
      const player = (row.Player || '').toString().trim();
      const uid = row.UID ? String(row.UID).trim() : null;
      if (!player || !uid) continue;

      const chaosRaw = (row['Has Chaos'] || '').toString().trim().toUpperCase();
      const hasChaos = chaosRaw !== 'N' && chaosRaw !== '' && chaosRaw !== 'NO';
      const chaosBeast =
        !hasChaos
          ? null
          : (row['Has Chaos'] || '').toString().trim();

      const p = {
        uid,
        player,
        region: (row.Region || 'NA').toString().trim(),
        guild: (row.Guild || '').toString().trim(),
        cp: toNumber(row.CP),
        fdu: toNumber(row.FDU),
        fdd: toNumber(row.FDD),
        finals: toNumber(row['Total Finals']),
        tribulation: (row.Tribulation || 0),
        status: (row['Status'] || 'Active').toString().trim(),
        hasChaos,
        beastName: chaosBeast || null,
      };

      if (!uidMap.has(uid)) {
        uidMap.set(uid, p);
        players.push(p);
      }
    }

    console.log('[CSV] Parsed and normalized players:', players.length);
    return players;
  } catch (err) {
    console.error('[CSV] Error:', err);
    throw err;
  }
};
