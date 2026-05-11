import { useContext, useMemo } from 'react';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { tribRank, tribColor } from '../utils/tribulationSystem';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { motion } from 'framer-motion';
import { BarChart3, ScatterChart, TrendingUp, Zap, Target, Layers } from 'lucide-react';

const T = { color: '#8B7E6A' };
const TB = { bg: 'rgba(13,7,24,0.97)', bc: 'rgba(201,146,11,0.35)' };
const SL = { color: 'rgba(201,146,11,0.08)', type: 'dashed' };

export default function AdvancedStatistics() {
  const rawPlayers = useContext(PlayerContext);

  const stats = useMemo(() => {
    const players = rawPlayers || [];
    const cps = players.map(p => p.cp).filter(v => v > 0);
    const sorted = [...cps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    const q1 = sorted[Math.floor(sorted.length * 0.25)] || 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] || 0;
    const mean = cps.reduce((a, b) => a + b, 0) / (cps.length || 1);

    const scatterData = players
      .filter(p => p.totalFinals > 0 && p.cp > 0)
      .map(p => [p.totalFinals, p.cp, p.player, p.guild]);

    // Build tribulation avg CP sorted by correct rank order (DG strongest → BI weakest)
    const tribCP = {};
    for (const p of players) {
      if (!p.tribulation || !p.cp) continue;
      if (!tribCP[p.tribulation]) tribCP[p.tribulation] = { sum: 0, count: 0 };
      tribCP[p.tribulation].sum += p.cp;
      tribCP[p.tribulation].count++;
    }
    const tribAvg = Object.entries(tribCP)
      .map(([t, v]) => ({ trib: t, avgCP: v.sum / v.count, count: v.count }))
      .sort((a, b) => tribRank(a.trib) - tribRank(b.trib)); // ascending rank (BI→DG left→right)

    const chaosCPs = players.filter(p => p.hasChaos && p.cp > 0).map(p => p.cp);
    const noChaosCPs = players.filter(p => !p.hasChaos && p.cp > 0).map(p => p.cp);
    const chaosAvg = chaosCPs.reduce((a, b) => a + b, 0) / (chaosCPs.length || 1);
    const noChaosAvg = noChaosCPs.reduce((a, b) => a + b, 0) / (noChaosCPs.length || 1);

    const fduFdd = players.filter(p => p.fdu > 0 && p.fdd > 0).map(p => [p.fdu, p.fdd, p.player]);

    const scored = players.map(p => {
      const tr = tribRank(p.tribulation) || 0;
      const score = (p.cp || 0) * 0.4 + (p.totalFinals || 0) * 0.3 + ((p.fdu || 0) + (p.fdd || 0)) * 0.15 + tr * 500 * 0.15;
      return { ...p, compositeScore: score };
    }).sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 15);

    return { median, q1, q3, mean, scatterData, tribAvg, chaosAvg, noChaosAvg, chaosCount: chaosCPs.length, noChaosCount: noChaosCPs.length, fduFdd, scored, cps };
  }, [rawPlayers]);

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {/* Mini stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Target size={14}/>, label: 'Median CP',     val: formatCP(stats.median),   color: 'var(--azure-bright)' },
          { icon: <TrendingUp size={14}/>, label: 'Q3 CP',    val: formatCP(stats.q3),        color: 'var(--imperial-bright)' },
          { icon: <Zap size={14}/>, label: 'Chaos Avg CP',    val: formatCP(stats.chaosAvg),  color: 'var(--cinnabar-bright)', sub: `vs ${formatCP(stats.noChaosAvg)} (no chaos)` },
          { icon: <Layers size={14}/>, label: 'Top Composite', val: stats.scored[0]?.player || '—', color: 'var(--gold-bright)', sub: `Score: ${Math.round(stats.scored[0]?.compositeScore || 0)}` },
        ].map(({ icon, label, val, color, sub }) => (
          <GlassCard key={label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color, opacity: 0.8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              {icon}<span>{label}</span>
            </div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 18, fontWeight: 700, color, textShadow: `0 0 16px ${color}44`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {val}
            </div>
            {sub && <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard variant="cyan">
          <div className="flex items-center gap-2 mb-2">
            <ScatterChart size={15} style={{ color: 'var(--azure-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">Total Finals vs CP</h2>
          </div>
          <ChartContainer option={scatterChart(stats.scatterData)} ratio={9/16} maxHeight={340} />
        </GlassCard>

        <GlassCard variant="purple">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={15} style={{ color: 'var(--imperial-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">Avg CP by Tribulation Stage</h2>
          </div>
          <ChartContainer option={tribAvgChart(stats.tribAvg)} ratio={9/16} maxHeight={340} />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard variant="red">
          <div className="flex items-center gap-2 mb-2">
            <ScatterChart size={15} style={{ color: 'var(--cinnabar-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">FDU vs FDD Correlation</h2>
          </div>
          <ChartContainer option={fduFddChart(stats.fduFdd)} ratio={9/16} maxHeight={320} />
        </GlassCard>

        <GlassCard variant="gold">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} style={{ color: 'var(--gold-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text-gold">Composite Score Leaders</h2>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {stats.scored.map((p, i) => (
              <motion.div
                key={p.uid}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  borderRadius: 7, background: i === 0 ? 'rgba(201,146,11,0.08)' : 'rgba(5,0,15,0.4)',
                  border: `1px solid ${i === 0 ? 'rgba(201,146,11,0.3)' : 'rgba(255,255,255,0.04)'}`,
                }}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-title)', flexShrink: 0,
                  background: i === 0 ? 'rgba(201,146,11,0.2)' : 'rgba(0,0,0,0.3)',
                  color: i === 0 ? 'var(--gold-bright)' : 'var(--muted)',
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: '#EDE0C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.player}</div>
                  <div style={{ fontSize: 8, color: 'var(--muted)' }}>{p.guild || '—'}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--azure-bright)' }}>{formatCP(p.cp)}</div>
                  <div style={{ fontSize: 8, color: 'var(--muted)' }}>Σ {Math.round(p.compositeScore)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}

function scatterChart(data) {
  const maxCP = Math.max(...data.map(d => d[1]), 1);
  return {
    tooltip: {
      trigger: 'item', backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => `<b>${p.data[2]}</b><br/>Finals: ${p.data[0]}<br/>CP: ${formatCP(p.data[1])}`,
    },
    grid: { left: 56, right: 16, top: 16, bottom: 42 },
    xAxis: {
      name: 'Total Finals', nameTextStyle: { ...T, fontSize: 9 }, type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { ...T, fontSize: 9 },
      splitLine: { lineStyle: SL },
    },
    yAxis: {
      name: 'CP', nameTextStyle: { ...T, fontSize: 9 }, type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { ...T, fontSize: 9, formatter: v => formatCP(v) },
      splitLine: { lineStyle: SL },
    },
    series: [{
      type: 'scatter', data,
      symbolSize: v => Math.max(4, Math.min(14, v[1] / 200)),
      itemStyle: {
        color: p => {
          const norm = p.value[1] / maxCP;
          const r = Math.round(201 * norm + 0 * (1 - norm));
          const g = Math.round(146 * norm + 191 * (1 - norm));
          const b = Math.round(11 * norm + 255 * (1 - norm));
          return `rgba(${r},${g},${b},0.7)`;
        },
      },
    }],
  };
}

function tribAvgChart(tribAvg) {
  if (!tribAvg.length) return { series: [] };
  return {
    tooltip: {
      trigger: 'axis', backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => {
        const t = tribAvg[p[0].dataIndex];
        return `<b style="color:${tribColor(t.trib)}">${t.trib}</b><br/>Avg CP: ${formatCP(t.avgCP)}<br/>Cultivators: ${t.count}`;
      },
    },
    grid: { left: 56, right: 16, top: 16, bottom: 42 },
    xAxis: {
      type: 'category', data: tribAvg.map(t => t.trib),
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { color: '#EDE0C4', fontSize: 9, rotate: 30 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { ...T, fontSize: 9, formatter: v => formatCP(v) },
      splitLine: { lineStyle: SL },
    },
    series: [{
      type: 'bar', data: tribAvg.map(t => t.avgCP), barWidth: '60%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: p => tribColor(tribAvg[p.dataIndex].trib) || '#4B5563',
      },
      emphasis: { itemStyle: { shadowBlur: 14, shadowColor: 'rgba(201,146,11,0.4)' } },
    }],
  };
}

function fduFddChart(data) {
  return {
    tooltip: {
      trigger: 'item', backgroundColor: TB.bg, borderColor: 'rgba(201,34,24,0.35)', borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => `<b>${p.data[2]}</b><br/>FDU: ${p.data[0]}<br/>FDD: ${p.data[1]}`,
    },
    grid: { left: 56, right: 16, top: 16, bottom: 42 },
    xAxis: {
      name: 'FDU', nameTextStyle: { ...T, fontSize: 9 }, type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { ...T, fontSize: 9 },
      splitLine: { lineStyle: SL },
    },
    yAxis: {
      name: 'FDD', nameTextStyle: { ...T, fontSize: 9 }, type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { ...T, fontSize: 9 },
      splitLine: { lineStyle: SL },
    },
    series: [{
      type: 'scatter', data, symbolSize: 5,
      itemStyle: { color: 'rgba(201,34,24,0.55)' },
      emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(201,34,24,0.5)' } },
    }],
  };
}
