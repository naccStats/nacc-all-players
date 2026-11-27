import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import { usePlayers } from '../context/DataContext';
import { useToast } from '../hooks/useToast';
import { formatCP, formatStat } from '../utils/formatters';
import { tribRank } from '../utils/tribulationSystem';
import { Beast, Cp, Crest, Empty, Field, Finals, PageHead, PlayerRows, Rank, Select, SortBar, Tier, Who, cx } from '../components/ui';
import { cpHtml } from '../brand/glyphs';

const PER_PAGE = [10, 30, 50, 100];
const COLUMNS = [
  { key: 'player', label: 'Player' },
  { key: 'guild', label: 'Guild' },
  { key: 'tribulation', label: 'Tribulation' },
  { key: 'cp', label: 'CP', right: true },
  { key: 'fdu', label: 'FDU', right: true, wide: true, title: 'Finals damage up' },
  { key: 'fdd', label: 'FDD', right: true, wide: true, title: 'Finals damage down' },
  { key: 'totalFinals', label: 'Finals', right: true },
  { key: 'chaosBeast', label: 'Beast' },
];
/* What the list can be ranked by. Highest first; the rank is the place in this order. */
const RANK_BY = [
  { value: 'cp', label: 'Combat power', lead: 'Ranked by combat power', of: (p) => p.cp },
  { value: 'totalFinals', label: 'Total Finals', lead: 'Ranked by total Finals', of: (p) => p.totalFinals },
  { value: 'fdu', label: 'FDU', lead: 'Ranked by Finals damage up', of: (p) => p.fdu },
  { value: 'fdd', label: 'FDD', lead: 'Ranked by Finals damage down', of: (p) => p.fdd },
  { value: 'tribulation', label: 'Tribulation', lead: 'Ranked by tribulation, then combat power', of: (p) => tribRank(p.tribulation) },
];

function exportCsv(rows, by) {
  const head = [`Rank by ${by.label}`, 'Player', 'Guild', 'UID', 'CP', 'Tribulation', 'FDU', 'FDD', 'Total Finals', 'Has Chaos', 'Beast'];
  const body = rows.map((p) => [
    p.rank, p.player, p.guild, p.uid, p.cp, p.tribulation, p.fdu, p.fdd, p.totalFinals, p.hasChaos ? 'Yes' : 'No', p.chaosBeast || '',
  ]);
  const csv = [head, ...body].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'nacc-players.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

/* The first three in the chosen order, on the game's ink painting. */
const PODIUM_FIGURE = { fdu: ['FDU', 'fdu'], fdd: ['FDD', 'fdd'] };
function Podium({ players, by }) {
  const extra = PODIUM_FIGURE[by.value];
  return (
    <ol className="podium">
      {players.map((p) => (
        <li key={p.uid}>
          <Link to={`/player/${p.uid}`} className={`podium__card podium__card--${p.rank}`}>
            <span className="podium__art" aria-hidden="true" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}home/ink-clouds.jpg)` }} />
            <span className="podium__top"><Rank rank={p.rank} size={56} /><Tier trib={p.tribulation} /></span>
            <span className="podium__name">{p.player}</span>
            <span className="podium__guild"><Crest name={p.guild} size={28} />{p.guild || 'No guild'}</span>
            <span className="podium__foot">
              <span><small>Combat power</small><b className="cp" dangerouslySetInnerHTML={{ __html: cpHtml(formatCP(p.cp)) }} /></span>
              <span><small>Finals</small><b>{formatStat(p.totalFinals)}</b></span>
              {extra
                ? <span><small>{extra[0]}</small><b>{formatStat(p[extra[1]])}</b></span>
                : <span><small>Beast</small><b><Beast player={p} /></b></span>}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function Players() {
  const players = usePlayers();
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();
  const [params, setParams] = useSearchParams();
  const guild = params.get('guild') || 'all';
  const by = RANK_BY.find((r) => r.value === params.get('by')) || RANK_BY[0];
  const [dir, setDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [chaos, setChaos] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  const guilds = useMemo(() => [...new Set(players.map((p) => p.guild).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [players]);

  /* The rank is the place in the chosen order among the players in view: the region, or one guild,
     with or without a beast. A search only narrows the list; nobody's rank changes with it. */
  const ranked = useMemo(
    () => players
      .filter((p) => (guild === 'all' || p.guild === guild) && (chaos === 'all' || p.hasChaos === (chaos === 'yes')))
      .sort((a, b) => by.of(b) - by.of(a) || b.cp - a.cp || a.player.localeCompare(b.player))
      .map((p, i) => ({ ...p, rank: i + 1 })),
    [players, guild, chaos, by]
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? ranked.filter((p) => p.player.toLowerCase().includes(q) || p.uid.includes(q)) : ranked;
    return dir === 'desc' ? list : [...list].reverse();
  }, [ranked, search, dir]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const at = Math.min(page, pages);
  const rows = filtered.slice((at - 1) * perPage, at * perPage);
  const maxCP = Math.max(...rows.map((p) => p.cp), 0);
  const maxFinals = Math.max(...rows.map((p) => p.totalFinals), 1);
  const first = Math.max(1, Math.min(at - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => first + i);

  const change = (fn) => (v) => { fn(v); setPage(1); };
  const setParam = (k, v, empty) => setParams((p) => {
    const next = new URLSearchParams(p);
    if (v === empty) next.delete(k); else next.set(k, v);
    return next;
  }, { replace: true });
  const setGuild = change((v) => setParam('guild', v, 'all'));
  const setBy = change((v) => setParam('by', v, RANK_BY[0].value));
  const rankBy = change(({ key, dir: d }) => { setBy(key); setDir(d); });
  /* a column header ranks by its column; a second press turns the order round */
  const pressColumn = (key) => (key === by.value ? change(setDir)(dir === 'desc' ? 'asc' : 'desc') : rankBy({ key, dir: 'desc' }));
  const clear = () => { setSearch(''); change(setChaos)('all'); };

  const scope = guild === 'all' ? 'every tracked player' : `the ${ranked.length} members of ${guild}`;
  return (
    <>
      <PageHead
        title={guild === 'all' ? 'Players' : guild}
        crest={guild === 'all' ? undefined : guild}
        lead={`${by.lead} among ${scope}${chaos === 'all' ? '' : chaos === 'yes' ? ' with a chaos beast' : ' with no chaos beast'}. Open a player for the full record.`}
      >
        <div className="rankbar">
          <Select label="Guild" value={guild} onChange={setGuild} options={[{ value: 'all', label: 'All guilds' }, ...guilds.map((g) => ({ value: g, label: g }))]} />
          <SortBar label="Rank by" sort={{ key: by.value, dir }} onChange={rankBy} options={RANK_BY} />
        </div>
      </PageHead>
      {ranked.length > 0 && <Podium players={ranked.slice(0, 3)} by={by} />}
      <section className="card card--flush">
        <div className="filters filters--3">
          <Field label="Name or UID" type="search" value={search} onChange={(e) => change(setSearch)(e.target.value)} />
          <Select
            label="Chaos beast"
            value={chaos}
            onChange={change(setChaos)}
            options={[{ value: 'all', label: 'All players' }, { value: 'yes', label: 'Has a beast' }, { value: 'no', label: 'No beast' }]}
          />
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => { exportCsv(filtered, by); toast(`Saved ${filtered.length} players to nacc-players.csv`); }}
          >
            <Download size={16} aria-hidden="true" />Download CSV
          </button>
        </div>

        {rows.length === 0 ? (
          <Empty title="No players match">
            <p>Try a shorter name, or another guild.</p>
            <button type="button" className="btn btn--secondary" onClick={clear}>Clear the search</button>
          </Empty>
        ) : (
          <>
            <div className="table-wrap table-main">
              <table>
                <thead>
                  <tr>
                    <th className="rank" title={`Rank by ${by.label}`}>Rank</th>
                    {COLUMNS.map(({ key, label, right, wide, title }) => {
                      const cls = cx(right && 'r', wide && 'wide-lg') || undefined;
                      if (!RANK_BY.some((r) => r.value === key)) return <th key={key} className={cls}>{label}</th>;
                      const on = by.value === key;
                      const Arrow = dir === 'desc' ? ArrowDown : ArrowUp;
                      return (
                        <th key={key} className={cls} aria-sort={on ? (dir === 'desc' ? 'descending' : 'ascending') : undefined}>
                          <button type="button" title={title ? `${title}: rank by it` : `Rank by ${label}`} onClick={() => pressColumn(key)}>{label}{on && <Arrow size={14} aria-hidden="true" />}</button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.uid} className={`is-link top-${p.rank}`} onClick={() => navigate(`/player/${p.uid}`)}>
                      <td className="rank"><Rank rank={p.rank} /></td>
                      <td><Who guild={p.guild} name={p.player} sub={p.uid} to={`/player/${p.uid}`} /></td>
                      <td>{p.guild || <span className="muted">No guild</span>}</td>
                      <td><Tier trib={p.tribulation} /></td>
                      <td className="r"><Cp value={p.cp} max={maxCP} /></td>
                      <td className="r wide-lg">{formatStat(p.fdu)}</td>
                      <td className="r wide-lg">{formatStat(p.fdd)}</td>
                      <td className="r"><Finals p={p} max={maxFinals} /></td>
                      <td><Beast player={p} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rows-sm">
              <PlayerRows players={rows} sortKey={by.value} />
            </div>
          </>
        )}

        <div className="pager">
          <div className="pager__per">
            <span>{filtered.length} players</span>
            <Select label="Per page" value={perPage} onChange={change((v) => setPerPage(Number(v)))} options={PER_PAGE.map((n) => ({ value: n, label: String(n) }))} />
          </div>
          <nav className="pager__nums" aria-label="Table pages">
            <button type="button" disabled={at <= 1} onClick={() => setPage(at - 1)}>Previous</button>
            {numbers.map((n) => (
              <button key={n} type="button" aria-current={n === at ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>
            ))}
            <button type="button" disabled={at >= pages} onClick={() => setPage(at + 1)}>Next</button>
          </nav>
        </div>
      </section>
      <ToastContainer />
    </>
  );
}
