import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayers, useTopPlayers } from '../context/DataContext';
import { computeGuildStats } from '../utils/statsEngine';
import { formatCP, formatStat } from '../utils/formatters';
import { C, FONT, ROLE_COLORS, grid, tip, tooltip, valueAxis } from '../utils/chartTheme';
import { Bars, Card, Cp, Legend, PageHead, Rank, RowDetails, Seg, Tier, Who } from '../components/ui';
import Chart from '../components/Chart';
import { RADAR_AXES, radarOption } from '../components/radar';

const ROLES = Object.keys(ROLE_COLORS);
const roleOf = (p) => {
  const ratio = p.totalHeal + p.totalBeast > 0 ? p.totalHeal / (p.totalHeal + p.totalBeast) : 0.5;
  return ratio > 0.53 ? 'Healer' : ratio < 0.47 ? 'Fighter' : 'Balanced';
};

const METRICS = [
  { key: 'healUp', label: 'Heal up', color: C.aqua },
  { key: 'healDown', label: 'Heal down', color: C.aqua },
  { key: 'beastUp', label: 'Beast up', color: C.blue },
  { key: 'beastDown', label: 'Beast down', color: C.blue },
];

function roleScatter(rows, role) {
  const maxCP = Math.max(...rows.map((r) => r.cp));
  const low = (k) => Math.floor(Math.min(...rows.map((r) => r[k])) / 250) * 250;
  return {
    tooltip: tooltip({
      formatter: ({ data: { p } }) => tip(p.player, [
        ['Role', roleOf(p)], ['Total heal', formatStat(p.totalHeal)], ['Total beast', formatStat(p.totalBeast)], ['CP', formatCP(p.cp)],
      ]),
    }),
    grid: grid({ bottom: 30, left: 28 }),
    xAxis: valueAxis({ name: 'Total heal', nameGap: 34, min: low('totalHeal') }),
    yAxis: valueAxis({ name: 'Total beast', nameGap: 48, min: low('totalBeast') }),
    series: ROLES.map((r) => ({
      name: r,
      type: 'scatter',
      data: rows.filter((p) => roleOf(p) === r).map((p) => ({ value: [p.totalHeal, p.totalBeast], p })),
      symbolSize: (_, { data }) => 10 + (data.p.cp / maxCP) * 22,
      itemStyle: { color: ROLE_COLORS[r], opacity: role === 'all' || role === r ? 0.95 : 0.15, borderColor: C.surface, borderWidth: 2 },
      label: { show: role === r, position: 'top', color: C.soft, fontSize: 13, fontFamily: FONT, formatter: ({ data }) => data.p.player },
      labelLayout: { hideOverlap: true },
    })),
  };
}

function RadarCard({ top }) {
  const ten = useMemo(() => [...top].sort((a, b) => b.totalFinals - a.totalFinals).slice(0, 10), [top]);
  const [at, setAt] = useState(0);
  const { max, mean } = useMemo(() => ({
    max: Object.fromEntries(RADAR_AXES.map(([k]) => [k, Math.max(...ten.map((p) => p[k]), 1)])),
    mean: Object.fromEntries(RADAR_AXES.map(([k]) => [k, ten.reduce((s, p) => s + p[k], 0) / ten.length])),
  }), [ten]);
  const player = ten[at];
  const series = [{ name: player.player, row: player }, { name: 'Top 10 average', row: mean, color: '#8f8a84' }];

  return (
    <Card
      title="Top 10 by Finals"
      note="Pick a player to see their stats against the top 10 average. Each axis ends at the highest of the ten."
      side={<Legend items={[{ label: player.player, color: C.gold }, { label: 'Top 10 average', color: '#8f8a84' }]} />}
    >
      <div className="radar-grid">
        <div className="picker">
          {ten.map((p, i) => (
            <button key={p.uid || p.player} type="button" aria-pressed={i === at} onClick={() => setAt(i)}>
              <Rank rank={i + 1} size={30} /><b>{p.player}</b><span>{formatStat(p.totalFinals)}</span>
            </button>
          ))}
        </div>
        <Chart option={(w) => radarOption(series, max, w)} ratio={0.8} maxHeight={480} />
      </div>
    </Card>
  );
}

function StatsTable({ top, uids, guildNames }) {
  // the two files do not always spell a guild alike ("Downfall", "DownFall"): the player file's spelling wins
  const rows = useMemo(
    () => top.map((p) => ({ ...p, guild: guildNames.get(p.guild.toLowerCase()) || p.guild })).sort((a, b) => b.totalFinals - a.totalFinals),
    [top, guildNames]
  );
  const max = Object.fromEntries(METRICS.map(({ key }) => [key, Math.max(...rows.map((r) => r[key]), 1)]));
  return (
    <Card
      className="card--flush"
      title={`Every stat of the top ${rows.length}`}
      note="Ordered by total Finals. Bars are scaled to the highest value in their column."
      side={<Legend items={[{ label: 'Heal', color: C.aqua }, { label: 'Beast', color: C.blue }]} />}
    >
      <div className="table-wrap table-main table-main--wide">
        <table className="table--dense">
          <thead>
            <tr>
              <th className="rank">Rank</th><th>Player</th><th>Tier</th><th className="r">CP</th><th className="r">Finals</th>
              <th className="r">FDU</th><th className="r">FDD</th>
              {METRICS.map((m) => <th key={m.key} className="r">{m.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.uid || p.player} className={`top-${i + 1}`}>
                <td className="rank"><Rank rank={i + 1} /></td>
                <td><Who guild={p.guild} name={p.player} sub={p.guild || 'No guild'} to={uids.has(p.uid) ? `/player/${p.uid}` : null} size={36} /></td>
                <td><Tier trib={p.trib} short /></td>
                <td className="r"><Cp value={p.cp} /></td>
                <td className="r">{formatStat(p.totalFinals)}</td>
                <td className="r">{formatStat(p.fdu)}</td>
                <td className="r">{formatStat(p.fdd)}</td>
                {METRICS.map((m) => (
                  <td key={m.key} className="r">
                    <span className="micro" style={{ '--v': `${(p[m.key] / max[m.key]) * 100}%`, '--c': m.color }}>
                      <i aria-hidden="true" />{formatStat(p[m.key])}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rows-sm">
        {rows.map((p, i) => (
          <RowDetails
            key={p.uid || p.player}
            rank={i + 1}
            open={i === 0}
            mark={p.guild}
            name={p.player}
            sub={[p.guild || 'No guild', p.trib].filter(Boolean).join(', ')}
            value={<span className="row-sm__value">{formatStat(p.totalFinals)}</span>}
            stats={[
              ['CP', formatCP(p.cp)], ['Finals', formatStat(p.totalFinals)], ['FDU', formatStat(p.fdu)], ['FDD', formatStat(p.fdd)],
              ...METRICS.map((m) => [m.label, (
                <span className="micro" style={{ '--v': `${(p[m.key] / max[m.key]) * 100}%`, '--c': m.color }}>{formatStat(p[m.key])}<i aria-hidden="true" /></span>
              )]),
            ]}
          >
            {uids.has(p.uid) && <Link className="btn btn--secondary" to={`/player/${p.uid}`}>Open the full record</Link>}
          </RowDetails>
        ))}
      </div>
    </Card>
  );
}

export default function Insights() {
  const players = usePlayers();
  const top = useTopPlayers();
  const [role, setRole] = useState('all');
  const uids = useMemo(() => new Set(players.map((p) => p.uid)), [players]);
  const guildNames = useMemo(() => new Map(players.map((p) => [p.guild.toLowerCase(), p.guild])), [players]);
  const leaders = useMemo(() => [...players].sort((a, b) => b.cp - a.cp).slice(0, 15), [players]);
  const guilds = useMemo(() => computeGuildStats(players).sort((a, b) => b.avgCP - a.avgCP).slice(0, 10), [players]);

  return (
    <>
      <PageHead title="Insights" lead="Heal, beast and Finals stats of the strongest players, and where the power sits." />
      {top === null && <div className="skeleton" style={{ height: 560 }} />}
      {top?.length > 0 && <RadarCard top={top} />}
      {top?.length > 0 && <StatsTable top={top} uids={uids} guildNames={guildNames} />}

      <div className="cols">
        {top?.length > 0 && (
          <Card
            className="s6"
            title="Healers and fighters"
            note="A larger dot is a higher combat power"
            side={<Seg label="Role" value={role} onChange={setRole} options={[{ value: 'all', label: 'All' }, ...ROLES.map((r) => ({ value: r, label: r }))]} />}
          >
            <Chart option={roleScatter(top, role)} ratio={0.8} maxHeight={420} />
            <div style={{ marginTop: 16 }}><Legend items={ROLES.map((r) => ({ label: r, color: ROLE_COLORS[r] }))} /></div>
          </Card>
        )}
        <Card className="s6" title="Average power by guild" note="Combat power per member">
          <Bars
            ranked
            rows={guilds.map((g) => ({
              key: g.name, crest: g.name, label: g.name, value: g.avgCP, text: formatCP(g.avgCP), to: `/rankings?guild=${encodeURIComponent(g.name)}`,
            }))}
          />
        </Card>
      </div>

      <Card title="Top 15 by combat power">
        <Bars
          ranked
          rows={leaders.map((p) => ({ key: p.uid, crest: p.guild, label: p.player, value: p.cp, text: formatCP(p.cp), to: `/player/${p.uid}` }))}
        />
      </Card>
    </>
  );
}
