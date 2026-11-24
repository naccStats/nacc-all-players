import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import { usePlayers } from '../context/DataContext';
import { useToast } from '../hooks/useToast';
import { formatCP, formatStat } from '../utils/formatters';
import { tribRank } from '../utils/tribulationSystem';
import { Beast, Cp, Crest, Empty, Field, PageHead, PlayerRows, Rank, Select, Tier, Who, cx } from '../components/ui';
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
const SORTS = [
  { value: 'cp', label: 'Combat power' },
  { value: 'tribulation', label: 'Tribulation' },
  { value: 'fdu', label: 'FDU' },
  { value: 'fdd', label: 'FDD' },
  { value: 'totalFinals', label: 'Total Finals' },
  { value: 'player', label: 'Name' },
];

const sortValue = (p, key) => (key === 'tribulation' ? tribRank(p.tribulation) : p[key] ?? '');

function exportCsv(rows) {
  const head = ['Rank', 'Player', 'Guild', 'UID', 'CP', 'Tribulation', 'FDU', 'FDD', 'Total Finals', 'Has Chaos', 'Beast'];
  const body = rows.map((p) => [
    p.rank, p.player, p.guild, p.uid, p.cp, p.tribulation, p.fdu, p.fdd, p.totalFinals, p.hasChaos ? 'Yes' : 'No', p.chaosBeast || '',
  ]);
  const csv = [head, ...body].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'nacc-players.csv' });
  a.click();
  URL.revokeObjectURL(url);
}

/* The three strongest players, on the game's ink painting. */
function Podium({ players }) {
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
              <span><small>Beast</small><b><Beast player={p} /></b></span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/* Total Finals, with the two halves it is made of */
const Finals = ({ p, max }) => {
  if (!(p.totalFinals > 0)) return <span className="muted">-</span>;
  return (
    <span className="finals" title={`FDU ${formatStat(p.fdu)}, FDD ${formatStat(p.fdd)}`}>
      {formatStat(p.totalFinals)}
      <i aria-hidden="true"><b style={{ width: `${(p.fdu / max) * 100}%` }} /><b style={{ width: `${(p.fdd / max) * 100}%` }} /></i>
    </span>
  );
};

export default function Players() {
  const players = usePlayers();
  const navigate = useNavigate();
  const { toast, ToastContainer } = useToast();
  const [params, setParams] = useSearchParams();
  const guild = params.get('guild') || 'all';
  const [search, setSearch] = useState('');
  const [chaos, setChaos] = useState('all');
  const [sort, setSort] = useState({ key: 'cp', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(30);

  const ranked = useMemo(
    () => [...players].sort((a, b) => b.cp - a.cp).map((p, i) => ({ ...p, rank: i + 1 })),
    [players]
  );
  const guilds = useMemo(() => [...new Set(players.map((p) => p.guild).filter(Boolean))].sort(), [players]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sign = sort.dir === 'desc' ? -1 : 1;
    return ranked
      .filter((p) =>
        (!q || p.player.toLowerCase().includes(q) || p.guild.toLowerCase().includes(q) || p.uid.includes(q)) &&
        (guild === 'all' || p.guild === guild) &&
        (chaos === 'all' || p.hasChaos === (chaos === 'yes')))
      .sort((a, b) => {
        const [x, y] = [sortValue(a, sort.key), sortValue(b, sort.key)];
        return typeof x === 'string' ? sign * String(x).localeCompare(String(y)) : sign * (x - y);
      });
  }, [ranked, search, guild, chaos, sort]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const at = Math.min(page, pages);
  const rows = filtered.slice((at - 1) * perPage, at * perPage);
  const maxCP = Math.max(...rows.map((p) => p.cp), 0);
  const maxFinals = Math.max(...rows.map((p) => p.totalFinals), 1);
  const first = Math.max(1, Math.min(at - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => first + i);

  const change = (fn) => (v) => { fn(v); setPage(1); };
  const setGuild = change((v) => setParams(v === 'all' ? {} : { guild: v }, { replace: true }));
  const sortBy = change((key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: key === 'player' || key === 'guild' ? 'asc' : 'desc' })));
  const clear = () => { setSearch(''); setChaos('all'); setGuild('all'); };

  return (
    <>
      <PageHead title="Players" lead="Every tracked player. Sort or filter the list, or open a player for the full record." />
      <Podium players={ranked.slice(0, 3)} />
      <section className="card card--flush">
        <div className="filters">
          <Field label="Name, guild or UID" type="search" value={search} onChange={(e) => change(setSearch)(e.target.value)} />
          <Select label="Guild" value={guild} onChange={setGuild} options={[{ value: 'all', label: 'All guilds' }, ...guilds.map((g) => ({ value: g, label: g }))]} />
          <Select
            label="Chaos beast"
            value={chaos}
            onChange={change(setChaos)}
            options={[{ value: 'all', label: 'All players' }, { value: 'yes', label: 'Has a beast' }, { value: 'no', label: 'No beast' }]}
          />
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => { exportCsv(filtered); toast(`Saved ${filtered.length} players to nacc-players.csv`); }}
          >
            <Download size={16} aria-hidden="true" />Download CSV
          </button>
        </div>

        {rows.length === 0 ? (
          <Empty title="No players match">
            <p>Try a shorter name, or another guild.</p>
            <button type="button" className="btn btn--secondary" onClick={clear}>Clear filters</button>
          </Empty>
        ) : (
          <>
            <div className="table-wrap table-main">
              <table>
                <thead>
                  <tr>
                    <th className="rank">Rank</th>
                    {COLUMNS.map(({ key, label, right, wide, title }) => {
                      const on = sort.key === key;
                      const Arrow = sort.dir === 'desc' ? ArrowDown : ArrowUp;
                      return (
                        <th key={key} className={cx(right && 'r', wide && 'wide-lg') || undefined} aria-sort={on ? (sort.dir === 'desc' ? 'descending' : 'ascending') : undefined}>
                          <button type="button" title={title} onClick={() => sortBy(key)}>{label}{on && <Arrow size={14} aria-hidden="true" />}</button>
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
              <div className="rows-sm__sort">
                <Select label="Sort by" value={sort.key} onChange={change((key) => setSort({ key, dir: key === 'player' ? 'asc' : 'desc' }))} options={SORTS} />
              </div>
              <PlayerRows players={rows} />
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
