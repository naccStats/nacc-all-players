import React, { useMemo } from 'react';
import { usePlayers } from '../context/DataContext';
import { formatCP } from '../utils/formatters';
import { beastColor, beastNames, C, FONT, catAxis, grid, guildAxisLabel, isNarrow, tip, tooltip, valueAxis } from '../utils/chartTheme';
import { Bars, Card, Crest, Legend, PageHead, Stats } from '../components/ui';
import { beastSvg } from '../brand/glyphs';
import Chart from '../components/Chart';

const avg = (list) => (list.length ? list.reduce((s, p) => s + p.cp, 0) / list.length : 0);
const countBy = (list) => Object.entries(
  list.reduce((m, p) => (p.guild ? { ...m, [p.guild]: (m[p.guild] || 0) + 1 } : m), {})
).sort((a, b) => b[1] - a[1]);

function armies(guilds, names) {
  return (w) => ({
    tooltip: tooltip({
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,255,255,0.04)' } },
      formatter: (ps) => tip(guilds[ps[0].dataIndex].name, ps.map((p) => [p.seriesName, p.value])),
    }),
    grid: grid({ top: 4, right: 28 }),
    xAxis: valueAxis({ splitNumber: isNarrow(w) ? 3 : 5 }),
    yAxis: catAxis(guilds.map((g) => g.name), {
      inverse: true, axisLabel: { ...guildAxisLabel(w), overflow: 'truncate' },
    }),
    series: names.map((b, i) => ({
      name: b, type: 'bar', stack: 'owners', barWidth: 16,
      data: guilds.map((g) => g.counts[b]),
      itemStyle: { color: beastColor(b), borderColor: C.surface, borderWidth: 1 },
      label: i === names.length - 1
        ? { show: true, position: 'right', color: C.soft, fontSize: 13, fontFamily: FONT, formatter: (p) => guilds[p.dataIndex].total }
        : { show: false },
    })),
  });
}

export default function Beasts() {
  const players = usePlayers();

  const { beasts, owners, without, guilds, names } = useMemo(() => {
    const names = beastNames(players);
    const own = players.filter((p) => p.hasChaos);
    const none = players.filter((p) => !p.hasChaos);
    const list = names.map((name) => {
      const of = players.filter((p) => p.chaosBeast === name);
      return { name, count: of.length, avgCP: avg(of), totalCP: of.reduce((s, p) => s + p.cp, 0), guilds: countBy(of).slice(0, 3) };
    }).sort((x, y) => y.count - x.count);
    const named = own.filter((p) => p.chaosBeast);
    const top = countBy(named).slice(0, 8).map(([name, total]) => ({
      name, total,
      counts: Object.fromEntries(names.map((b) => [b, named.filter((p) => p.guild === name && p.chaosBeast === b).length])),
    }));
    return { beasts: list, owners: own, without: none, guilds: top, names };
  }, [players]);

  const noneAvg = avg(without);
  const unnamed = owners.filter((p) => !p.chaosBeast).length;
  return (
    <>
      <PageHead title="Chaos beasts" lead="Who owns which beast, how strong their owners are, and which guilds hold the most." />
      <Stats
        items={[
          { label: 'Players with a beast', value: owners.length, sub: `${((owners.length / players.length) * 100).toFixed(1)}% of the region${unnamed ? `, ${unnamed} with no beast named` : ''}` },
          { label: 'Most owned', value: beasts[0].name, sub: `${beasts[0].count} players` },
          { label: 'Average CP with a beast', value: formatCP(avg(owners)) },
          { label: 'Average CP without', value: formatCP(noneAvg) },
        ]}
      />

      <div className="beasts">
        {beasts.map((b) => (
          <section className="card" key={b.name}>
            <h2 className="beast__name"><span className="raw" dangerouslySetInnerHTML={{ __html: beastSvg(b.name, beastColor(b.name), 44) }} />{b.name}</h2>
            <p className="beast__n num">{b.count}</p>
            <p className="muted">{b.count === 1 ? 'owner' : 'owners'}, {((b.count / players.length) * 100).toFixed(1)}% of players</p>
            <ul className="mini">
              {b.guilds.map(([g, n]) => <li key={g}><span><Crest name={g} size={26} />{g}</span><span>{n}</span></li>)}
            </ul>
          </section>
        ))}
      </div>

      <div className="cols">
        <Card className="s6" title="Average power by beast" note="Against players with no beast">
          <Bars
            rows={[...beasts].sort((x, y) => y.avgCP - x.avgCP)
              .map((b) => ({ key: b.name, label: b.name, value: b.avgCP, text: formatCP(b.avgCP), color: beastColor(b.name) }))
              .concat({ key: 'none', label: 'No beast', value: noneAvg, text: formatCP(noneAvg), color: '#6f6961' })}
          />
        </Card>
        <Card className="s6" title="Combined power by beast" note="Total combat power of each beast's owners">
          <Bars
            rows={[...beasts].sort((x, y) => y.totalCP - x.totalCP)
              .map((b) => ({ key: b.name, label: b.name, value: b.totalCP, text: formatCP(b.totalCP), color: beastColor(b.name) }))}
          />
        </Card>
      </div>

      <Card
        title="Beasts by guild"
        note="The eight guilds with the most owners"
        side={<Legend items={names.map((b) => ({ label: b, color: beastColor(b) }))} />}
      >
        <Chart option={armies(guilds, names)} ratio={0.9} maxHeight={380} />
      </Card>
    </>
  );
}
