import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import { parsePlayers } from '../utils/statsEngine';
import { normalizeGuild } from '../utils/formatters';

const DataContext = createContext();
export const useDataContext = () => useContext(DataContext);
export const usePlayers = () => useContext(DataContext).players;

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

async function loadCsv(name) {
  const response = await fetch(`${import.meta.env.BASE_URL}data/${name}`);
  if (!response.ok) throw new Error(`Failed to load ${name}: ${response.status}`);
  const text = (await response.text()).replace(/^﻿/, '');
  const { data } = Papa.parse(text, {
    header: true, skipEmptyLines: true, dynamicTyping: true, transformHeader: (h) => h.trim(),
  });
  return data || [];
}

const num = (row, k) => {
  const v = Number(row[k]);
  return isNaN(v) ? 0 : v;
};
const str = (row, k) => (row[k] ?? '').toString().trim();

const parseTop = (row) => ({
  uid: str(row, 'UID'),
  player: str(row, 'Player'),
  guild: normalizeGuild(row.Guild),
  trib: str(row, 'Tribulation').toUpperCase(),
  beast: ['', 'N', 'NO'].includes(str(row, 'Has Chaos').toUpperCase()) ? '' : str(row, 'Has Chaos'),
  cp: num(row, 'CP'),
  healUp: num(row, 'Heal Up'),
  healDown: num(row, 'Heal Down'),
  totalHeal: num(row, 'Total Heal'),
  beastUp: num(row, 'Beast Up'),
  beastDown: num(row, 'Beast Down'),
  totalBeast: num(row, 'Total Beast'),
  fdu: num(row, 'FDU'),
  fdd: num(row, 'FDD'),
  totalFinals: num(row, 'Total Finals'),
});

/* The top players' extended stats, loaded once by the first page that asks. null while loading. */
let topPromise = null;
export function useTopPlayers() {
  const [top, setTop] = useState(null);
  useEffect(() => {
    let live = true;
    topPromise ||= loadCsv('topPlayers.csv').then((rows) => rows.map(parseTop).filter((p) => p.player));
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
