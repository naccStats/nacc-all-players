/* Reads the rows of public/data/*.csv. The app and the home page both go through here, so a slip in the
   sheet is put right once, for every page:
   - totals are added up from their parts, never taken from the sheet's own total columns
   - "1,700", " 1700 " and 1700 are the same number
   - stray spaces and capitals do not make a second guild, beast or tier */
import Papa from 'papaparse';

/* Every cell stays text until it is read below: Papa's own typing would turn a player named "007" into 7. */
export const parseCsv = (text) => Papa.parse(text.replace(/^﻿/, ''), {
  header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim(),
}).data;

const text = (row, key) => String(row[key] ?? '').trim();
const isBlank = (row, key) => ['', '-'].includes(text(row, key));
/* a number, or null when the cell is blank or cannot be read as one */
const read = (row, key) => {
  if (isBlank(row, key)) return null;
  const n = Number(text(row, key).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const num = (row, key) => read(row, key) ?? 0;
const round1 = (n) => Math.round(n * 10) / 10;

/* The sum of both parts. Only where a part is missing does the sheet's total stand in. */
const total = (row, a, b, key) => {
  const [x, y] = [read(row, a), read(row, b)];
  if (x === null || y === null) return read(row, key) ?? round1((x ?? 0) + (y ?? 0));
  return round1(x + y);
};

/* "NoGuild", "No Guild" and blanks all mean unguilded: an empty string. */
const guildOf = (row) => {
  const g = text(row, 'Guild').replace(/\s+/g, ' ');
  return g.replace(/\s/g, '').toLowerCase() === 'noguild' ? '' : g;
};
const tierOf = (row) => text(row, 'Tribulation').replace(/\s/g, '').toUpperCase();
const chaosOf = (row) => text(row, 'Has Chaos');
const hasNone = (v) => ['', '-', 'N', 'NO', 'NONE'].includes(v.toUpperCase());
const isUnnamed = (v) => ['Y', 'YES'].includes(v.toUpperCase()); // has a beast, the sheet does not say which

/* One CSV row to one player, or null when the row has no name, UID or combat power. */
const parsePlayer = (row) => {
  const [player, uid, cp, chaos] = [text(row, 'Player'), text(row, 'UID'), num(row, 'CP'), chaosOf(row)];
  if (!player || !uid || cp <= 0) return null;
  const hasChaos = !hasNone(chaos);
  return {
    uid, player, cp, hasChaos,
    region: text(row, 'Region') || 'NA',
    guild: guildOf(row),
    fdu: num(row, 'FDU'),
    fdd: num(row, 'FDD'),
    totalFinals: total(row, 'FDU', 'FDD', 'Total Finals'),
    tribulation: tierOf(row),
    chaosBeast: hasChaos && !isUnnamed(chaos) ? chaos : null,
    updated: text(row, 'Updated?').toUpperCase(),
  };
};

/* "Downfall" and "DownFall" are one guild: the spelling used most often is shown for both. */
const fold = (v) => v.replace(/\s/g, '').toLowerCase();
const unify = (rows, key) => {
  const spellings = {};
  rows.forEach((r) => {
    if (!r[key]) return;
    const of = (spellings[fold(r[key])] ||= {});
    of[r[key]] = (of[r[key]] || 0) + 1;
  });
  return rows.map((r) => (r[key]
    ? { ...r, [key]: Object.entries(spellings[fold(r[key])]).sort((a, b) => b[1] - a[1])[0][0] }
    : r));
};

export const parsePlayers = (rows) => {
  const seen = new Set();
  const players = rows.map(parsePlayer).filter((p) => p && !seen.has(p.uid) && seen.add(p.uid));
  return unify(unify(players, 'guild'), 'chaosBeast');
};

export const parseTopPlayers = (rows) => unify(rows.map((row) => ({
  uid: text(row, 'UID'),
  player: text(row, 'Player'),
  guild: guildOf(row),
  trib: tierOf(row),
  beast: hasNone(chaosOf(row)) ? '' : chaosOf(row),
  cp: num(row, 'CP'),
  healUp: num(row, 'Heal Up'),
  healDown: num(row, 'Heal Down'),
  totalHeal: total(row, 'Heal Up', 'Heal Down', 'Total Heal'),
  beastUp: num(row, 'Beast Up'),
  beastDown: num(row, 'Beast Down'),
  totalBeast: total(row, 'Beast Up', 'Beast Down', 'Total Beast'),
  fdu: num(row, 'FDU'),
  fdd: num(row, 'FDD'),
  totalFinals: total(row, 'FDU', 'FDD', 'Total Finals'),
})).filter((p) => p.player), 'guild');

/* ---- What in a sheet looks like a slip: [{ line, message }]. Shown while building, never on the site. ---- */

const NUMBERS = ['CP', 'FDU', 'FDD', 'Total Finals', 'Heal Up', 'Heal Down', 'Total Heal', 'Beast Up', 'Beast Down', 'Total Beast'];
const TOTALS = [['FDU', 'FDD', 'Total Finals'], ['Heal Up', 'Heal Down', 'Total Heal'], ['Beast Up', 'Beast Down', 'Total Beast']];

export function checkRows(rows, isTier) {
  const out = [];
  const uids = new Map();
  const guilds = new Map();
  rows.forEach((row, i) => {
    const line = i + 2; // line 1 holds the column names
    const say = (message) => out.push({ line, message: `${text(row, 'Player') || '(no name)'}: ${message}` });

    NUMBERS.filter((k) => k in row && !isBlank(row, k) && read(row, k) === null)
      .forEach((k) => say(`${k} "${text(row, k)}" is not a number`));

    TOTALS.forEach(([a, b, k]) => {
      const [x, y, t] = [read(row, a), read(row, b), read(row, k)];
      if (x === null || y === null || t === null || Math.abs(x + y - t) <= 0.15) return;
      say(`${a} ${x} + ${b} ${y} = ${round1(x + y)}, but ${k} says ${t}. The site shows ${round1(x + y)}; check which number is wrong`);
    });

    if (!text(row, 'Player') || !text(row, 'UID') || num(row, 'CP') <= 0) say('left off the site: a row needs a name, a UID and a CP above 0');
    const uid = text(row, 'UID');
    if (uid && uids.has(uid)) say(`left off the site: UID ${uid} is already on line ${uids.get(uid)}`);
    else if (uid) uids.set(uid, line);

    if (isUnnamed(chaosOf(row))) say(`Has Chaos says "${chaosOf(row)}" instead of the beast's name`);
    if (tierOf(row) && !isTier(tierOf(row))) say(`Tribulation "${text(row, 'Tribulation')}" is not a known tier`);

    const guild = guildOf(row);
    const first = guilds.get(fold(guild));
    if (guild && first && first !== guild) say(`guild "${guild}" is also spelled "${first}" (shown as one guild)`);
    else if (guild) guilds.set(fold(guild), guild);
  });
  return out;
}
