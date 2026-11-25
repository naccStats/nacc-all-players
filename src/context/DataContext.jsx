import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { parseCsv, parsePlayers, parseTopPlayers } from '../utils/playerData';

const DataContext = createContext();
export const useDataContext = () => useContext(DataContext);
export const usePlayers = () => useContext(DataContext).players;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

async function loadCsv(name) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${name}`);
  if (!response.ok) throw new Error(`Failed to load ${name}: ${response.status}`);
  return parseCsv(await response.text());
}

/* The top players' extended stats, loaded once by the first page that asks. null while loading. */
let topPromise = null;
export function useTopPlayers() {
  const [top, setTop] = useState(null);
  useEffect(() => {
    let live = true;
    topPromise ||= loadCsv('topPlayers.csv').then(parseTopPlayers);
    topPromise
      .then((t) => live && setTop(t))
      .catch(() => {
        topPromise = null;
        if (live) setTop([]);
      });
    return () => { live = false; };
  }, []);
  return top;
}

export const DataContextProvider = ({ children }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      let lastErr = null;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const parsed = parsePlayers(await loadCsv('players.csv'));
          if (!parsed.length) throw new Error('The player file loaded but holds no valid players.');
          if (cancelled) return;
          setPlayers(parsed);
          setLoading(false);
          return;
        } catch (err) {
          lastErr = err;
          if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
      if (cancelled) return;
      console.error('[data] players.csv failed on every attempt:', lastErr);
      setError(lastErr?.message || 'Failed to load the player file.');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [retryKey]);

  const value = useMemo(
    () => ({ players, loading, error, retry: () => setRetryKey((k) => k + 1) }),
    [players, loading, error]
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
