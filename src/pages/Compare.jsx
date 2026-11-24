import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePlayers } from '../context/DataContext';
import { computeGuildStats } from '../utils/statsEngine';
import { SCORE_PARTS, guildScore } from '../utils/guildScore';
import { formatCP, formatStat } from '../utils/formatters';
import { TRIB_PREFIXES, tribName, tribPrefix } from '../utils/tribulationSystem';
import { C, FONT, PAIR, catAxis, grid, tip, tooltip, valueAxis } from '../utils/chartTheme';
import { Card, Crest, Legend, PageHead, Select } from '../components/ui';
import Chart from '../components/Chart';

const pct = (v) => `${((v || 0) * 100).toFixed(1)}%`;
const ROWS = [
  { key: 'totalCP', label: 'Total CP', fmt: formatCP },
  { key: 'avgCP', label: 'Average CP', fmt: formatCP },
  { key: 'memberCount', label: 'Members', fmt: String },
  { key: 'chaosRate', label: 'Beast owners', fmt: pct },
  { key: 'avgFDU', label: 'Average FDU', fmt: formatStat },
  { key: 'avgFDD', label: 'Average FDD', fmt: formatStat },
  { key: 'avgFinals', label: 'Average Finals', fmt: formatStat },
];

const tierCounts = (d) => {
  const out = {};
  Object.entries(d.tribBreakdown).forEach(([t, n]) => {
    const p = tribPrefix(t);
    if (p) out[p] = (out[p] || 0) + n;
  });
  return out;
};

function tierOption(a, b) {
  const [ca, cb] = [tierCounts(a), tierCounts(b)];
  const tiers = TRIB_PREFIXES.filter((t) => ca[t] || cb[t]);
  const side = (d, c, i) => ({
    name: d.name, type: 'bar', barMaxWidth: 18, barGap: '12%',
    data: tiers.map((t) => c[t] || 0),
    itemStyle: { color: PAIR[i], borderRadius: [4, 4, 0, 0] },
    label: { show: true, position: 'top', color: C.soft, fontSize: 13, fontFamily: FONT, formatter: (p) => p.value || '' },
  });
  return {
    tooltip: tooltip({
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.04)' } },
      formatter: (ps) => tip(tribName(tiers[ps[0].dataIndex]), ps.map((p) => [p.seriesName, p.value])),
    }),
    grid: grid({ top: 24, right: 4 }),
    xAxis: catAxis(tiers, { axisLabel: { interval: 0 } }),
    yAxis: valueAxis({ splitNumber: 4 }),
    series: [side(a, ca, 0), side(b, cb, 1)],
  };
}

export default function Compare() {
  const players = usePlayers();
  const guilds = useMemo(() => computeGuildStats(players), [players]);
  const [params, setParams] = useSearchParams();
  const find = (k, i) => guilds.find((g) => g.name === params.get(k)) || guilds[i];
  const a = find('a', 0);
  const b = find('b', a === guilds[1] ? 0 : 1);
  const set = (k, v) => setParams({ a: a.name, b: b.name, [k]: v }, { replace: true });

  const [sa, sb] = [guildScore(a, b), guildScore(b, a)];
  const diff = Math.abs(sa - sb);
  const option = useMemo(() => tierOption(a, b), [a, b]);
  const choices = (other) => guilds.filter((g) => g !== other).map((g) => ({ value: g.name, label: g.name }));

  return (
    <>
      <PageHead title="Compare guilds" lead="Two guilds side by side, with one score from power, Finals and chaos beasts." />
      <div className="filters filters--2">
        <Select label="First guild" value={a.name} onChange={(v) => set('a', v)} options={choices(b)} />
        <Select label="Second guild" value={b.name} onChange={(v) => set('b', v)} options={choices(a)} />
      </div>

      <div className="cols">
        <Card className="s6 card--spread" title={diff < 0.05 ? 'An even match' : `${sa > sb ? a.name : b.name} leads by ${diff.toFixed(1)} points`}>
          <div>
            <div className="duel">
              {[[a, sa, 0], [b, sb, 1]].map(([g, s, i]) => (
                <div className="duel__side" key={g.name}>
                  <Crest name={g.name} size={64} />
                  <span className="duel__name"><i style={{ background: PAIR[i] }} aria-hidden="true" />{g.name}</span>
                  <span className="duel__score num">{s.toFixed(1)}</span>
                </div>
              ))}
            </div>
            <div className="duel__bar" aria-hidden="true">
              <span style={{ width: `${(sa / (sa + sb)) * 100}%`, background: PAIR[0] }} />
              <span style={{ background: PAIR[1] }} />
            </div>
          </div>
          <table className="duel-table duel-table--tight">
            <tbody>
              {SCORE_PARTS.map(({ label, of }) => (
                <tr key={label}><td>{label}</td><td>{of(a, b).toFixed(1)}</td><td>{of(b, a).toFixed(1)}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card className="s6" title="Stat by stat" note="The dot marks the higher value">
          <div className="table-wrap">
            <table className="duel-table">
              <thead><tr><th><span className="sr-only">Stat</span></th><th>{a.name}</th><th>{b.name}</th></tr></thead>
              <tbody>
                {ROWS.map(({ key, label, fmt }) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td className={a[key] > b[key] ? 'win' : undefined}>{fmt(a[key])}</td>
                    <td className={b[key] > a[key] ? 'win' : undefined}>{fmt(b[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card
        title="Tribulation tiers"
        note="Players in each tier, strongest first"
        side={<Legend items={[{ label: a.name, color: PAIR[0] }, { label: b.name, color: PAIR[1] }]} />}
      >
        <Chart option={option} ratio={0.6} maxHeight={380} />
      </Card>
    </>
  );
}
