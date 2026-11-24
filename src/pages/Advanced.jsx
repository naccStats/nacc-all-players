import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import 'echarts-gl';
import { usePlayers } from '../context/DataContext';
import { formatCP, formatCPShort, formatInt, formatStat } from '../utils/formatters';
import { TRIB_PREFIXES, tribColor, tribName, tribPrefix, tribRank } from '../utils/tribulationSystem';
import { C, FONT, RAMP, catAxis, grid, isNarrow, tip, tooltip, valueAxis } from '../utils/chartTheme';
import { Bars, Card, Field, PageHead, Stats, Tier } from '../components/ui';
import Chart from '../components/Chart';

const COMPOSITE_TOP_N = 15;
const ZOOM = { base: 400, scale: 3.2 };

const mean = (list) => list.reduce((a, b) => a + b, 0) / (list.length || 1);
const at = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] || 0;

/* CP 40%, Finals 30%, FDU plus FDD 15%, tribulation rank 15% (scaled by 500 to sit beside CP). */
const composite = (p) => p.cp * 0.4 + p.totalFinals * 0.3 + (p.fdu + p.fdd) * 0.15 + tribRank(p.tribulation) * 500 * 0.15;

function analyse(players) {
  const cps = players.map((p) => p.cp).sort((a, b) => a - b);
  const tiers = TRIB_PREFIXES
    .map((t) => ({ tier: t, cps: players.filter((p) => tribPrefix(p.tribulation) === t).map((p) => p.cp).sort((a, b) => a - b) }))
    .filter((t) => t.cps.length)
    .map((t) => {
      const q = (x) => t.cps[Math.floor(x * (t.cps.length - 1))];
      return { ...t, avg: mean(t.cps), box: [q(0), q(0.25), q(0.5), q(0.75), q(1)] };
    });
  const finals = players.filter((p) => p.fdu > 0 && p.fdd > 0);
  const bins = Math.max(5, Math.min(15, Math.ceil(Math.sqrt(finals.length || 25))));
  const range = (k) => {
    const v = finals.map((p) => p[k]);
    const min = Math.min(...v);
    return { min, step: (Math.max(...v) - min) / bins || 1 };
  };
  const [ru, rd] = [range('fdu'), range('fdd')];
  const cells = {};
  finals.forEach((p) => {
    const x = Math.min(Math.floor((p.fdu - ru.min) / ru.step), bins - 1);
    const y = Math.min(Math.floor((p.fdd - rd.min) / rd.step), bins - 1);
    cells[`${x},${y}`] = (cells[`${x},${y}`] || 0) + 1;
  });
  return {
    cps, tiers, finals,
    heat: { bins, ru, rd, data: Object.entries(cells).map(([k, n]) => [...k.split(',').map(Number), n]) },
    scored: players.map((p) => ({ ...p, score: composite(p) })).sort((a, b) => b.score - a.score).slice(0, COMPOSITE_TOP_N),
    chaosAvg: mean(players.filter((p) => p.hasChaos).map((p) => p.cp)),
    noneAvg: mean(players.filter((p) => !p.hasChaos).map((p) => p.cp)),
  };
}

function scatter3D(players, zoom, hits) {
  const axis = (name, extra = {}) => ({
    name, nameTextStyle: { color: C.soft, fontSize: 13, fontFamily: FONT },
    axisLabel: { color: C.muted, fontSize: 12, fontFamily: FONT, ...extra },
    axisLine: { lineStyle: { color: 'rgba(255,255,255,0.24)' } },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.07)' } },
  });
  const point = (p, style) => ({ value: [p.totalFinals, p.cp, p.fdu, p.player, p.tribulation], name: p.player, itemStyle: style });
  const data = players.filter((p) => p.totalFinals > 0);
  return {
    tooltip: {
      ...tooltip({ trigger: 'item', triggerOn: 'mousemove|click' }),
      formatter: ({ value: [finals, cp, fdu, player, trib] }) =>
        tip(player, [['Tribulation', trib], ['CP', formatCP(cp)], ['Finals', formatStat(finals)], ['FDU', formatStat(fdu)]]),
    },
    grid3D: {
      viewControl: { distance: Math.round(ZOOM.base - zoom * ZOOM.scale), elevation: 20, azimuth: -35, autoRotate: false },
      environment: C.surface,
      light: { main: { intensity: 1.2 }, ambient: { intensity: 0.4 } },
      axisPointer: { lineStyle: { color: C.accent, width: 1 } },
    },
    xAxis3D: axis('Finals'),
    yAxis3D: axis('CP', { formatter: formatCPShort }),
    zAxis3D: axis('FDU'),
    series: [
      {
        type: 'scatter3D', symbolSize: 6,
        data: data.map((p) => point(p, { color: tribColor(p.tribulation), opacity: hits.size ? 0.2 : 0.9 })),
      },
      ...(hits.size
        ? [{ type: 'scatter3D', symbolSize: 14, data: data.filter((p) => hits.has(p.uid)).map((p) => point(p, { color: C.blue, opacity: 1 })) }]
        : []),
    ],
  };
}

const fduFdd = (players) => ({
  tooltip: tooltip({ formatter: (p) => tip(p.value[2], [['FDU', formatStat(p.value[0])], ['FDD', formatStat(p.value[1])]]) }),
  grid: grid({ bottom: 30, left: 28 }),
  xAxis: valueAxis({ name: 'FDU', nameGap: 34 }),
  yAxis: valueAxis({ name: 'FDD', nameGap: 48 }),
  series: [{
    type: 'scatter', symbolSize: 8, data: players.map((p) => [p.fdu, p.fdd, p.player]),
    itemStyle: { color: C.gold, opacity: 0.6 }, emphasis: { itemStyle: { opacity: 1, borderColor: C.ink, borderWidth: 2 } },
  }],
});

const boxPlot = (tiers) => ({
  tooltip: tooltip({
    trigger: 'item',
    formatter: (p) => {
      const t = tiers[p.dataIndex];
      const [min, q1, med, q3, max] = t.box;
      const rows = t.cps.length === 1
        ? [['CP', formatCP(min)]]
        : [['Highest', formatCP(max)], ['Upper quarter', formatCP(q3)], ['Median', formatCP(med)], ['Lower quarter', formatCP(q1)], ['Lowest', formatCP(min)]];
      return tip(`${tribName(t.tier)}, ${t.cps.length} ${t.cps.length === 1 ? 'player' : 'players'}`, rows);
    },
  }),
  grid: grid({ right: 4 }),
  xAxis: catAxis(tiers.map((t) => t.tier), { axisLabel: { interval: 0, hideOverlap: false } }),
  yAxis: valueAxis({ type: 'log', axisLabel: { formatter: formatCPShort } }),
  series: [{
    type: 'boxplot', data: tiers.map((t) => t.box), boxWidth: [8, 28],
    itemStyle: { color: 'rgba(184,137,58,0.28)', borderColor: C.accent, borderWidth: 1.5 },
  }],
});

const heatmap = ({ bins, ru, rd, data }) => (w) => {
  const edges = (r) => Array.from({ length: bins }, (_, i) => Math.round(r.min + i * r.step));
  const interval = isNarrow(w) ? 4 : 2;
  return {
    tooltip: tooltip({
      formatter: ({ value: [x, y, n] }) => tip(`${n} ${n === 1 ? 'player' : 'players'}`, [['FDU from', edges(ru)[x]], ['FDD from', edges(rd)[y]]]),
    }),
    grid: grid({ bottom: 30, left: 28, right: 4 }),
    visualMap: { show: false, min: 1, max: Math.max(...data.map((d) => d[2])), inRange: { color: RAMP } },
    xAxis: catAxis(edges(ru), { name: 'FDU, from', nameGap: 34, axisLabel: { color: C.muted, interval } }),
    yAxis: catAxis(edges(rd), { name: 'FDD, from', nameGap: 48, axisLabel: { color: C.muted, interval } }),
    series: [{ type: 'heatmap', data, itemStyle: { borderColor: C.surface, borderWidth: 2, borderRadius: 3 }, emphasis: { itemStyle: { borderColor: C.ink } } }],
  };
};

export default function Advanced() {
  const players = usePlayers();
  const d = useMemo(() => analyse(players), [players]);
  const [zoom, setZoom] = useState(() => (window.innerWidth < 640 ? 46 : 60));
  const [find, setFind] = useState('');
  const [cp, setCp] = useState('');

  const hits = useMemo(() => {
    const q = find.trim().toLowerCase();
    if (q.length < 2) return [];
    const exact = players.find((p) => p.uid === q);
    return exact ? [exact] : players.filter((p) => p.player.toLowerCase().includes(q)).sort((a, b) => b.cp - a.cp);
  }, [find, players]);
  const option3D = useMemo(() => scatter3D(players, zoom, new Set(hits.map((p) => p.uid))), [players, zoom, hits]);

  const value = parseFloat(cp);
  const rank = value > 0 ? d.cps.filter((c) => c > value).length + 1 : null;

  return (
    <>
      <PageHead title="Advanced" lead="How combat power, Finals and tribulation relate across all players." />
      <Stats
        items={[
          { label: 'Median CP', value: formatCP(at(d.cps, 0.5)) },
          { label: 'Upper quarter starts at', value: formatCP(at(d.cps, 0.75)) },
          { label: 'Average CP with a beast', value: formatCP(d.chaosAvg), sub: `${formatCP(d.noneAvg)} without` },
          { label: 'Highest composite score', value: formatInt(d.scored[0].score), sub: d.scored[0].player },
        ]}
      />

      <Card title="CP to rank">
        <div className="calc">
          <Field label="Combat power, in billions" type="number" min="0" inputMode="decimal" value={cp} onChange={(e) => setCp(e.target.value)} />
          <output className={rank ? undefined : 'is-idle'} aria-live="polite">
            {rank
              ? `Rank ${rank} of ${d.cps.length}, top ${Math.min(100, (rank / d.cps.length) * 100).toFixed(1)}%`
              : 'Type a value to see the rank it would hold. 1T is 1000.'}
          </output>
        </div>
      </Card>

      <div className="cols">
        <Card className="s7" title="Finals, CP and FDU in 3D" note="Drag to turn it. Lighter points are higher tribulation tiers.">
          <Chart option={option3D} type="3d" ratio={0.7} maxHeight={480} />
          <div className="tools">
            <Field label="Highlight a player by name or UID" type="search" value={find} onChange={(e) => setFind(e.target.value)} autoComplete="off" />
            <Field label="Zoom" type="range" min={1} max={100} step={1} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </div>
          {find.trim().length >= 2 && (
            <div className="hits">
              {hits.length === 0 && <p className="muted">No player matches.</p>}
              <ul className="mini" style={{ marginTop: 0 }}>
                {hits.slice(0, 20).map((p) => (
                  <li key={p.uid}>
                    <span><Link className="link" to={`/player/${p.uid}`}>{p.player}</Link></span>
                    <span><Tier trib={p.tribulation} short /> &nbsp; {formatCP(p.cp)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <Card className="s5" title="Average CP by tier" note="Strongest tier first">
          <Bars rows={d.tiers.map((t) => ({ key: t.tier, label: tribName(t.tier), sub: `${t.cps.length} players`, value: t.avg, text: formatCP(t.avg), color: tribColor(t.tier) }))} />
        </Card>
      </div>

      <div className="cols">
        <Card className="s6" title="FDU against FDD" note="One dot a player">
          <Chart option={fduFdd(d.finals)} ratio={0.8} maxHeight={400} />
        </Card>
        <Card className="s6" title="Where players cluster" note="Lighter cells hold more players">
          <Chart option={heatmap(d.heat)} ratio={0.8} maxHeight={400} />
        </Card>
      </div>

      <div className="cols">
        <Card className="s6" title="CP range in each tier" note="Box: the middle half. Line: the median. Log scale.">
          <div className="fill"><Chart option={boxPlot(d.tiers)} ratio={1} maxHeight={600} /></div>
        </Card>
        <Card className="s6" title="Composite score" note="CP 40%, Finals 30%, FDU and FDD 15%, tribulation 15%">
          <Bars
            ranked
            rows={d.scored.map((p) => ({ key: p.uid, crest: p.guild, label: p.player, value: p.score, text: formatInt(p.score), to: `/player/${p.uid}` }))}
          />
        </Card>
      </div>
    </>
  );
}
