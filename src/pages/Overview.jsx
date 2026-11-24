import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlayers } from '../context/DataContext';
import { computeGlobalStats } from '../utils/statsEngine';
import { formatCP, formatInt, formatStat } from '../utils/formatters';
import { TRIB_PREFIXES, tribColor, tribName } from '../utils/tribulationSystem';
import { C, catAxis, grid, isNarrow, tip, tooltip, valueAxis } from '../utils/chartTheme';
import { Bars, Card, Cp, Field, PageHead, Rank, Stats, Tier, Who } from '../components/ui';
import Chart from '../components/Chart';

const BINS = 12;

/* Combat power spans six orders of magnitude, so the bins are equal on a log scale. */
function cpHistogram(players, w) {
  const cps = players.map((p) => p.cp).sort((a, b) => a - b);
  const lo = Math.log10(cps[0]);
  const step = (Math.log10(cps[cps.length - 1]) - lo) / BINS;
  const edges = Array.from({ length: BINS + 1 }, (_, i) => 10 ** (lo + step * i));
  const counts = new Array(BINS).fill(0);
  cps.forEach((v) => { counts[Math.min(Math.floor((Math.log10(v) - lo) / step), BINS - 1)] += 1; });
  return {
    tooltip: tooltip({
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.04)' } },
      formatter: ([p]) => tip(`${formatCP(edges[p.dataIndex])} to ${formatCP(edges[p.dataIndex + 1])}`, [['Players', p.value]]),
    }),
    grid: grid({ right: 4, bottom: 30 }),
    xAxis: catAxis(edges.slice(0, BINS).map(formatCP), {
      name: 'Combat power, from', nameGap: 34, axisLabel: { interval: isNarrow(w) ? 2 : 1, color: C.muted },
    }),
    yAxis: valueAxis({ splitNumber: 4 }),
    series: [{ type: 'bar', data: counts, barCategoryGap: 2, itemStyle: { color: C.gold, borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { color: C.accent } } }],
  };
}

function Lookup({ players }) {
  const [input, setInput] = useState('');
  const ranked = useMemo(() => [...players].sort((a, b) => b.cp - a.cp), [players]);
  const q = input.trim().toLowerCase();
  const at = q
    ? [
        (p) => p.uid === q || p.player.toLowerCase() === q,
        (p) => p.player.toLowerCase().startsWith(q),
        (p) => p.player.toLowerCase().includes(q),
      ].map((f) => ranked.findIndex(f)).find((i) => i >= 0) ?? -1
    : -1;
  const player = ranked[at];
  const below = player ? ((ranked.length - at - 1) / (ranked.length - 1)) * 100 : 0;

  return (
    <Card title="Find your rank">
      <div className="lookup">
        <Field label="Player name or UID" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" />
        <div className="lookup__out" aria-live="polite">
          {player ? (
            <>
              <div className="lookup__line">
                <b><Link to={`/player/${player.uid}`}>{player.player}</Link></b>
                <span>Rank <span className="num">{at + 1}</span> of {ranked.length}</span>
              </div>
              <div className="scale" role="img" aria-label={`Ahead of ${below.toFixed(1)}% of players`}>
                <span style={{ width: `${Math.max(below, 0.5)}%` }} />
              </div>
              <div className="lookup__line muted">
                <span>{formatCP(player.cp)} combat power, {player.guild || 'no guild'}</span>
                <span>Ahead of {below.toFixed(1)}%</span>
              </div>
            </>
          ) : (
            <p className="muted">
              {q ? `No player matches "${input.trim()}".` : 'Your place among every tracked player, by combat power.'}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Overview() {
  const navigate = useNavigate();
  const players = usePlayers();
  const stats = useMemo(() => computeGlobalStats(players), [players]);
  const avgFinals = players.reduce((s, p) => s + p.totalFinals, 0) / players.length;
  const pct = (n) => `${((n / stats.total) * 100).toFixed(0)}%`;
  const top10 = stats.topPlayers.slice(0, 10);
  const tiers = TRIB_PREFIXES.filter((t) => stats.tribDistribution[t]);

  return (
    <>
      <PageHead title="Overview" lead="Every tracked player and guild in the North America region." />
      <Stats
        items={[
          { label: 'Players', value: formatInt(stats.total), sub: `${stats.activeCount} active, ${stats.afkCount} AFK` },
          { label: 'Guilds', value: stats.guildCount, sub: `${stats.topGuilds[0].name} leads` },
          { label: 'Highest combat power', value: formatCP(stats.maxCP), sub: stats.topPlayers[0].player },
          { label: 'Average combat power', value: formatCP(stats.avgCP), sub: `Average Finals ${formatStat(avgFinals)}` },
          { label: 'With a chaos beast', value: pct(stats.chaosCount), sub: `${stats.chaosCount} players` },
        ]}
      />

      <Lookup players={players} />

      <div className="cols">
        <Card
          className="s7 card--flush"
          title="Top 10 players"
          side={<Link className="link" to="/rankings">See all {stats.total}</Link>}
        >
          <div className="table-wrap" style={{ marginTop: -8 }}>
            <table>
              <thead>
                <tr><th className="rank">Rank</th><th>Player</th><th className="wide">Tribulation</th><th className="r">CP</th></tr>
              </thead>
              <tbody>
                {top10.map((p, i) => (
                  <tr key={p.uid} className={`is-link top-${i + 1}`} onClick={() => navigate(`/player/${p.uid}`)}>
                    <td className="rank"><Rank rank={i + 1} /></td>
                    <td><Who guild={p.guild} name={p.player} sub={p.guild || 'No guild'} to={`/player/${p.uid}`} /></td>
                    <td className="wide"><Tier trib={p.tribulation} /></td>
                    <td className="r"><Cp value={p.cp} max={top10[0].cp} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="s5" title="Tribulation tiers" note="Players in each tier, strongest first">
          <Bars
            rows={tiers.map((t) => ({
              key: t, label: tribName(t), value: stats.tribDistribution[t], text: stats.tribDistribution[t], color: tribColor(t),
            }))}
          />
        </Card>
      </div>

      <div className="cols">
        <Card className="s6" title="Guilds by total power" side={<Link className="link" to="/guilds">See all guilds</Link>}>
          <Bars
            ranked
            rows={stats.topGuilds.map((g) => ({
              key: g.name, crest: g.name, label: g.name, value: g.totalCP, text: formatCP(g.totalCP),
              to: `/rankings?guild=${encodeURIComponent(g.name)}`,
            }))}
          />
        </Card>
        <Card className="s6" title="Combat power spread" note="How many players sit in each power band, on a log scale">
          <div className="fill"><Chart option={(w) => cpHistogram(players, w)} type="bar" maxHeight={400} /></div>
        </Card>
      </div>
    </>
  );
}
