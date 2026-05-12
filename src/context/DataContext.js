import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

const DataContext = createContext();
export const useDataContext = () => useContext(DataContext);

function toNumber(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export const DataContextProvider = ({ children }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  const retry = () => {
    setError(null);
    setLoading(true);
    setRetryKey(k => k + 1);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const MAX_ATTEMPTS = 3;
      const RETRY_DELAY_MS = 1000;
      let lastErr = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          setLoading(true);
          const url = `${process.env.PUBLIC_URL}/data/players.csv`;
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to load CSV: ${response.status}`);
          const text = await response.text();

          // Strip BOM if present (Excel-generated CSVs often include it)
          const cleanText = text.replace(/^\uFEFF/, '');

          const result = Papa.parse(cleanText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            // trimHeaders was removed in PapaParse v5; use transformHeader instead
            transformHeader: (h) => h.trim(),
          });

          if (!result?.data?.length) {
            throw new Error('CSV loaded but no valid rows found.');
          }

        const parsed = [];
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
              totalFinals: toNumber(row['Total Finals']),
              tribulation: (row.Tribulation || '').toString().trim().toUpperCase(),
              hasChaos,
              chaosBeast: chaosBeast || null,
              updated: (row['Updated?'] || '').toString().trim().toUpperCase(),
            };

            // Skip rows where CP didn't parse to a real value — they corrupt guild averages
            if (p.cp <= 0) continue;

            if (!uidMap.has(uid)) {
              uidMap.set(uid, p);
              parsed.push(p);
            }
          }

          if (parsed.length === 0) {
            throw new Error('CSV loaded but no valid players found.');
          }

          if (!cancelled) {
            setPlayers(parsed);
            setLastUpdated(new Date());
            setError(null);
            setLoading(false);
          }
          return; // success — exit retry loop
        } catch (err) {
          lastErr = err;
          if (attempt < MAX_ATTEMPTS) {
            await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
          }
        }
      }

      // All attempts exhausted
      if (!cancelled) {
        console.error('[DATA] CSV Load Error (all attempts):', lastErr);
        setError(lastErr?.message || 'Failed to load CSV.');
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [retryKey]);

  const value = useMemo(
    () => ({ players, loading, error, lastUpdated, retry }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, loading, error, lastUpdated]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
