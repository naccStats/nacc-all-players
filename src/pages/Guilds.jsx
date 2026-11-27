import React, { Fragment, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';
import { usePlayers } from '../context/DataContext';
import { computeGuildStats } from '../utils/statsEngine';
import { formatCP, formatStat } from '../utils/formatters';
import { TRIB_PREFIXES, tribName, tribPrefix, tribRank } from '../utils/tribulationSystem';
import { C, FONT, RAMP, catAxis, grid, guildAxisLabel, isNarrow, tip, tooltip, valueAxis } from '../utils/chartTheme';
import { Bars, Card, Cp, Crest, PageHead, RowDetails, Select, SortBar, Stats, Tier } from '../components/ui';
import Chart from '../components/Chart';

const COLUMNS = [
  { key: 'totalCP', label: 'Total CP', fmt: formatCP },
  { key: 'avgCP', label: 'Average CP', fmt: formatCP },
  { key: 'memberCount', label: 'Members', fmt: String },
  { key: 'chaosRate', label: 'Beast owners', fmt: (v) => `${(v * 100).toFixed(0)}%` },
  { key: 'avgFDU', label: 'Avg FDU', fmt: formatStat },
  { key: 'avgFDD', label: 'Avg FDD', fmt: formatStat },
  { key: 'avgFinals', label: 'Avg Finals', fmt: formatStat },
];

const byTier = (g) => {
  const out = {};
  Object.entries(g.tribBreakdown).forEach(([t, n]) => {
    const p = tribPrefix(t);
    if (p) out[p] = (out[p] || 0) + n;
  });
  return out;
};

/* Guild by tier, the count printed in every cell: readable without a hover. */
function tierMap(guilds, focus) {
  const counts = guilds.map(byTier);
  const tiers = TRIB_PREFIXES.filter((t) => counts.some((c) => c[t]));
  const data = guilds.flatMap((g, y) => tiers.map((t, x) => [x, y, counts[y][t] || 0]).filter((d) => d[2] > 0));
  const max = Math.max(...data.map((d) => d[2]));
  return (w) => ({
    tooltip: tooltip({
      formatter: (p) => tip(guilds[p.value[1]].name, [[tribName(tiers[p.value[0]]), `${p.value[2]} players`]]),
    }),
    grid: grid({ top: 4, right: 4, bottom: 4 }),
    xAxis: catAxis(tiers, { position: 'top', axisLine: { show: false }, axisLabel: { color: C.muted, interval: 0, hideOverlap: false, ...(isNarrow(w) && { rotate: 90, fontSize: 12 }) } }),
    yAxis: catAxis(guilds.map((g) => g.name), {
      inverse: true, axisLine: { show: false }, axisLabel: { ...guildAxisLabel(w), overflow: 'truncate' },
    }),
    visualMap: { show: false, min: 1, max, inRange: { color: RAMP } },
    series: [{
      type: 'heatmap',
      data: data.map((d) => ({
        value: d,
        itemStyle: { opacity: focus && guilds[d[1]].name !== focus ? 0.25 : 1 },
        label: { color: d[2] / max > 0.55 ? C.bg : C.ink },
      })),
      itemStyle: { borderColor: C.surface, borderWidth: 2, borderRadius: 4 },
      label: { show: !isNarrow(w), formatter: (p) => String(p.value[2]), fontSize: 13, fontFamily: FONT },
      emphasis: { itemStyle: { borderColor: C.ink } },
    }],
  });
}

function sizeMap(guilds, focus) {
  return (w) => ({
    tooltip: tooltip({
      formatter: (p) => {
        const g = guilds[p.dataIndex];
        return tip(g.name, [['Average CP', formatCP(g.avgCP)], ['Members', g.memberCount], ['Beast owners', `${(g.chaosRate * 100).toFixed(1)}%`]]);
      },
    }),
    grid: grid({ bottom: 30, left: 28, right: 28 }),
    xAxis: valueAxis({ name: 'Average combat power', nameGap: 34, splitNumber: isNarrow(w) ? 3 : 5, axisLabel: { formatter: (v) => (v ? formatCP(v) : '0') } }),
    yAxis: valueAxis({ name: 'Members', nameGap: 36, scale: true, minInterval: 1, min: (v) => Math.max(0, v.min - 3), max: (v) => v.max + 3 }),
    series: [{
      type: 'scatter',
      data: guilds.map((g) => ({
        value: [g.avgCP, g.memberCount],
        itemStyle: { opacity: focus && g.name !== focus ? 0.2 : 0.9 },
      })),
      symbolSize: (_, p) => 10 + guilds[p.dataIndex].chaosRate * 70,
      itemStyle: { color: C.gold, borderColor: C.surface, borderWidth: 2 },
      label: {
        show: !isNarrow(w), position: 'top', color: C.soft, fontSize: 13, fontFamily: FONT,
        formatter: (p) => guilds[p.dataIndex].name,
      },
      labelLayout: { hideOverlap: true },
    }],
  });
}

const topTier = (g) => Object.keys(g.tribBreakdown).sort((a, b) => tribRank(b) - tribRank(a))[0];

const Members = ({ guild }) => (
  <div className="members">
    {[...guild.members].sort((a, b) => b.cp - a.cp).slice(0, 5).map((m) => (
      <Link key={m.uid} to={`/player/${m.uid}`}><b>{m.player}</b><span className="muted">{formatCP(m.cp)}</span><Tier trib={m.tribulation} short /></Link>
    ))}
    <Link className="members__all link" to={`/rankings?guild=${encodeURIComponent(guild.name)}`}>All {guild.memberCount} members, ranked</Link>
  </div>
);

export default function Guilds() {
  const players = usePlayers();
  const [focus, setFocus] = useState('');
  const [open, setOpen] = useState(null);
  const [sort, setSort] = useState({ key: 'totalCP', dir: 'desc' });
  const sorted = COLUMNS.find((c) => c.key === sort.key);

  const guilds = useMemo(() => computeGuildStats(players), [players]);
  const total = guilds.reduce((s, g) => s + g.totalCP, 0);
  const members = guilds.reduce((s, g) => s + g.memberCount, 0);
  const byAvg = [...guilds].sort((a, b) => b.avgCP - a.avgCP)[0];
  const rows = useMemo(() => {
    const sign = sort.dir === 'desc' ? -1 : 1;
    return [...guilds].sort((a, b) => sign * (a[sort.key] - b[sort.key]));
  }, [guilds, sort]);

  return (
    <>
      <PageHead title="Guilds" lead="Power, roster and tribulation tiers of every guild in the region.">
        <Select
          label="Highlight a guild"
          value={focus}
          onChange={setFocus}
          options={[{ value: '', label: 'All guilds' }, ...guilds.map((g) => ({ value: g.name, label: g.name }))]}
        />
      </PageHead>
      <Stats
        items={[
          { label: 'Guilds', value: guilds.length, sub: `${members} members` },
          { label: 'Combined power', value: formatCP(total) },
          { label: 'Strongest guild', value: guilds[0].name, sub: `${((guilds[0].totalCP / total) * 100).toFixed(1)}% of the region's guild power` },
          { label: 'Highest average', value: byAvg.name, sub: `${formatCP(byAvg.avgCP)} a member` },
        ]}
      />

      <div className="cols">
        <Card className="s5" title="Total power and share" note="Share of all guild combat power">
          <Bars
            ranked
            focus={focus}
            rows={guilds.map((g) => ({
              key: g.name, crest: g.name, label: g.name, sub: `${((g.totalCP / total) * 100).toFixed(1)}% share`, value: g.totalCP, text: formatCP(g.totalCP),
              to: `/rankings?guild=${encodeURIComponent(g.name)}`,
            }))}
          />
        </Card>
        <Card className="s7" title="Players by tier" note="Strongest tiers on the left">
          <div className="fill"><Chart option={tierMap(guilds, focus)} ratio={0.82} narrowRatio={1.1} maxHeight={580} /></div>
        </Card>
      </div>

      <Card className="card--flush" title="Guild roster" note="Open a guild to see its five strongest members, or the whole guild ranked">
        <div className="table-wrap table-main table-main--wide" style={{ marginTop: -8 }}>
          <table>
            <thead>
              <tr>
                <th>Guild</th>
                {COLUMNS.map(({ key, label }) => {
                  const on = sort.key === key;
                  const Arrow = sort.dir === 'desc' ? ArrowDown : ArrowUp;
                  return (
                    <th key={key} className="r" aria-sort={on ? (sort.dir === 'desc' ? 'descending' : 'ascending') : undefined}>
                      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}>
                        {label}{on && <Arrow size={14} aria-hidden="true" />}
                      </button>
                    </th>
                  );
                })}
                <th>Top tier</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const isOpen = open === g.name;
                return (
                  <Fragment key={g.name}>
                    <tr className={`is-link${isOpen ? ' is-open' : ''}`} onClick={() => setOpen(isOpen ? null : g.name)}>
                      <td>
                        <button type="button" className="expand" aria-expanded={isOpen} onClick={(e) => { e.stopPropagation(); setOpen(isOpen ? null : g.name); }}>
                          <ChevronRight size={16} aria-hidden="true" /><Crest name={g.name} size={40} />{g.name}
                        </button>
                      </td>
                      {COLUMNS.map(({ key, fmt }) => (
                        <td key={key} className={`r${key === sort.key ? ' strong' : ''}`}>
                          {key === 'totalCP' ? <Cp value={g.totalCP} max={guilds[0].totalCP} /> : fmt(g[key])}
                        </td>
                      ))}
                      <td><Tier trib={topTier(g)} /></td>
                    </tr>
                    {isOpen && (
                      <tr className="sub">
                        <td colSpan={COLUMNS.length + 2}>
                          <Members guild={g} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rows-sm">
          <SortBar sort={sort} onChange={setSort} options={COLUMNS.map(({ key, label }) => ({ value: key, label }))} />
          {rows.map((g) => (
            <RowDetails
              key={g.name}
              mark={g.name}
              name={g.name}
              sub={sorted.key === 'totalCP' ? `${g.memberCount} members` : `${sorted.label} ${sorted.fmt(g[sorted.key])}`}
              value={<Cp value={g.totalCP} />}
              stats={[...COLUMNS.map(({ key, label, fmt }) => [label, fmt(g[key])]), ['Top tier', <Tier trib={topTier(g)} />]]}
            >
              <Members guild={g} />
            </RowDetails>
          ))}
        </div>
      </Card>

      <Card title="Average power against roster size" note="A larger dot means more members own a chaos beast">
        <Chart option={sizeMap(guilds, focus)} ratio={0.6} narrowRatio={0.9} maxHeight={420} />
      </Card>
    </>
  );
}
