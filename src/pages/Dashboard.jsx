import React, { useContext, useMemo } from 'react';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { tribColor } from '../utils/tribulationSystem';
import { computeGlobalStats } from '../utils/statsEngine';
import GlassCard from '../components/GlassCard';
import StatCard from '../components/StatCard';
import ChartContainer from '../components/ChartContainer';
import { motion } from 'framer-motion';
import {
  Users, Sword, Shield, Zap, Crown, Flame, Activity, TrendingUp,
} from 'lucide-react';

/* ─── Cultivation-themed ECharts base styles ─────────────────────────────── */
const CHART_TEXT   = '#8B7E6A';
const CHART_BORDER = 'rgba(201,146,11,0.12)';
const TOOLTIP_BG   = 'rgba(13,7,24,0.97)';
const TOOLTIP_BORDER = 'rgba(201,146,11,0.35)';

const baseTooltip = {
  backgroundColor: TOOLTIP_BG,
  borderColor: TOOLTIP_BORDER,
  borderWidth: 1,
  textStyle: { color: '#EDE0C4', fontSize: 11, fontFamily: 'Inter' },
};

/* ─── Tribulation color mapping ──────────────────────────────────────────── */
const TRIB_COLORS = {
  DG: '#C9920B', SM: '#FF3B2B', CE: '#FF8C42',
  CK: '#FF00FF', DL: '#B026FF', GI: '#00BFFF',
  SI: '#00E87C', CI: '#00E87C', TI: '#6B8AFF',
  GA: '#6B7280', BI: '#4B5563',
};

function getTribColor(t) {
  if (!t) return '#4B5563';
  const key = t.toString().toUpperCase().substring(0, 2);
  return TRIB_COLORS[key] || tribColor(t) || '#4B5563';
}

/* ─── Chart builders ─────────────────────────────────────────────────────── */
function buildGuildChart(topGuilds) {
  if (!topGuilds?.length) return { series: [] };
  const guilds = topGuilds.slice(0, 15);
  const colors = ['#C9920B','#FF3B2B','#B026FF','#00BFFF','#00E87C',
                  '#FF8C42','#6B8AFF','#EC4899','#14B8A6','#F59E0B',
                  '#6366F1','#8B5CF6','#84CC16','#FB923C','#A78BFA'];
  return {
    tooltip: { ...baseTooltip, trigger: 'axis',
      formatter: (p) => {
        const g = guilds[p[0].dataIndex];
        return `<b style="color:var(--gold-bright)">${g.name}</b><br/>
          Total CP: <b>${formatCP(g.totalCP)}</b><br/>
          Members: ${g.members}`;
      },
    },
    grid: { left: 120, right: 24, top: 8, bottom: 28 },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: CHART_BORDER } },
      axisLabel: { color: CHART_TEXT, fontSize: 9, formatter: v => formatCP(v) },
      splitLine: { lineStyle: { color: CHART_BORDER, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: guilds.map(g => g.name),
      axisLine: { lineStyle: { color: CHART_BORDER } },
      axisLabel: { color: '#EDE0C4', fontSize: 9, width: 110, overflow: 'truncate' },
    },
    series: [{
      type: 'bar', data: guilds.map(g => g.totalCP), barWidth: 11,
      itemStyle: {
        borderRadius: [0, 5, 5, 0],
        color: p => colors[p.dataIndex % colors.length],
      },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(201,146,11,0.4)' } },
    }],
  };
}

function buildTribChart(tribDist) {
  const entries = Object.entries(tribDist)
    .map(([t, v]) => ({ name: t, value: v, color: getTribColor(t) }))
    .sort((a, b) => b.value - a.value);

  if (!entries.length) return { series: [] };

  return {
    tooltip: { ...baseTooltip, trigger: 'item',
      formatter: p => `<b style="color:${p.color}">${p.name}</b><br/>${p.value} cultivators (${p.percent.toFixed(3)}%)`,
    },
    legend: {
      type: 'scroll', bottom: 4, left: 'center',
      textStyle: { color: CHART_TEXT, fontSize: 9 },
      pageTextStyle: { color: CHART_TEXT },
      itemWidth: 10, itemHeight: 8,
    },
    series: [{
      type: 'pie', radius: ['38%', '70%'], center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#0D0718', borderWidth: 2 },
      label: { show: false },
      labelLine: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 18, shadowColor: 'rgba(201,146,11,0.35)' },
        label: { show: true, fontSize: 11, color: '#EDE0C4', fontWeight: 'bold' },
      },
      data: entries.map(e => ({
        name: e.name, value: e.value,
        itemStyle: { color: e.color },
      })),
    }],
  };
}

function buildCPDistributionChart(players) {
  if (!players.length) return { series: [] };
  const cps = players.map(p => p.cp || 0).filter(v => v > 0).sort((a, b) => a - b);
  const bins = 20;
  const min = cps[0]; const max = cps[cps.length - 1];
  const step = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  const labels = [];
  for (let i = 0; i < bins; i++) {
    labels.push(formatCP(min + step * i));
  }
  for (const v of cps) {
    const idx = Math.min(Math.floor((v - min) / step), bins - 1);
    counts[idx]++;
  }
  return {
    tooltip: { ...baseTooltip, trigger: 'axis',
      formatter: p => `Range: ${labels[p[0].dataIndex]}<br/>Count: <b>${p[0].value}</b>`,
    },
    grid: { left: 44, right: 16, top: 12, bottom: 36 },
    xAxis: {
      type: 'category', data: labels,
      axisLine: { lineStyle: { color: CHART_BORDER } },
      axisLabel: { color: CHART_TEXT, fontSize: 8, rotate: 30 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: CHART_BORDER } },
      axisLabel: { color: CHART_TEXT, fontSize: 9 },
      splitLine: { lineStyle: { color: CHART_BORDER, type: 'dashed' } },
    },
    series: [{
      type: 'bar', data: counts, barWidth: '70%',
      itemStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0,   color: '#C9920B' },
            { offset: 0.6, color: '#B026FF' },
            { offset: 1,   color: '#00BFFF44' },
          ],
        },
        borderRadius: [3, 3, 0, 0],
      },
      emphasis: { itemStyle: { shadowBlur: 14, shadowColor: 'rgba(201,146,11,0.4)' } },
    }],
  };
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function Dashboard() {
  const rawPlayers = useContext(PlayerContext);
  const players = useMemo(() => rawPlayers || [], [rawPlayers]);
  const stats = useMemo(() => computeGlobalStats(players), [players]);

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── Hero stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Cultivators"   value={stats.total.toLocaleString()}     icon={<Users    size={16}/>} color="cyan"   delay={0.05}/>
        <StatCard label="Avg CP"        value={formatCP(stats.avgCP)}            icon={<Sword    size={16}/>} color="gold"   delay={0.10} sub={`peak ${formatCP(stats.maxCP)}`}/>
        <StatCard label="Peak CP"       value={formatCP(stats.maxCP)}            icon={<Crown    size={16}/>} color="red"    delay={0.15}/>
        <StatCard label="Active"        value={stats.activeCount.toLocaleString()} icon={<Zap   size={16}/>} color="jade"   delay={0.20} sub={`${Math.round(stats.activeCount/(stats.total||1)*100)}% active`}/>
        <StatCard label="Chaos Users"   value={stats.chaosCount.toLocaleString()} icon={<Flame  size={16}/>} color="purple" delay={0.25} sub={`${((stats.chaosCount/(stats.total||1))*100).toFixed(1)}%`}/>
        <StatCard label="Guilds"         value={stats.guildCount}                 icon={<Shield   size={16}/>} color="cyan"   delay={0.30}/>
        <StatCard label="AFK"           value={stats.afkCount}                   icon={<Activity size={16}/>} color="gold"   delay={0.35}/>
      </div>

      {/* ── Top cultivators ── */}
      <GlassCard variant="gold" delay={0.30}>
        <div className="flex items-center gap-2 mb-4">
          <Crown size={15} style={{ color: 'var(--gold-bright)' }}/>
          <h2 className="text-sm font-display font-bold gradient-text-gold">
            Celestial Rankings — Top 10
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {stats.topPlayers.slice(0, 10).map((p, i) => (
            <motion.div
              key={p.uid}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${
                i === 0 ? 'bg-cyber-gold/3 border-cyber-gold/30'
                : i < 3  ? 'bg-cyber-dark/60 border-cyber-gold/15'
                :           'bg-cyber-dark/40 border-gray-800'
              }`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.04 }}
              whileHover={{ scale: 1.03 }}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-display flex-shrink-0 ${
                  i === 0 ? 'bg-cyber-gold/20 text-cyber-gold'
                  : i < 3  ? 'bg-cyber-cyan/10 text-cyber-cyan'
                  :           'bg-gray-800 text-gray-400'
                }`}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-white truncate">{p.player}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-mono font-bold" style={{ color: getTribColor(p.tribulation) }}>
                    {p.tribulation || '—'}
                  </span>
                  <span className="text-[9px] text-gray-500">{formatCP(p.cp)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard variant="cyan" delay={0.40}>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={15} style={{ color: 'var(--azure-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">
              Guild Power Rankings
            </h2>
          </div>
          <ChartContainer option={buildGuildChart(stats.topGuilds)} ratio={9/16} maxHeight={320} />
        </GlassCard>

        <GlassCard variant="purple" delay={0.45}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} style={{ color: 'var(--imperial-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">
              Tribulation Distribution
            </h2>
          </div>
          <ChartContainer option={buildTribChart(stats.tribDistribution)} ratio={3/4} maxHeight={320} />
        </GlassCard>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard variant="red" delay={0.50} className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={15} style={{ color: 'var(--cinnabar-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">
              CP Distribution
            </h2>
          </div>
          <ChartContainer option={buildCPDistributionChart(players)} ratio={9/16} maxHeight={340} />
        </GlassCard>

        <GlassCard variant="gold" delay={0.55}>
          <h2 className="text-sm font-display font-bold gradient-text-gold mb-3">
            Realm Summary
          </h2>
          <div className="space-y-2" style={{ fontSize: 11 }}>
            {[
              { label: 'Avg Total Finals', val: players.length
                  ? (players.reduce((s,p)=>s+(p.totalFinals||0),0)/players.length).toFixed(1)
                  : '—', color: 'var(--azure-bright)' },
              { label: 'Chaos Rate', val: `${((stats.chaosCount/(stats.total||1))*100).toFixed(1)}%`, color: 'var(--imperial-bright)' },
              { label: 'Active Rate', val: `${((stats.activeCount/(stats.total||1))*100).toFixed(1)}%`, color: 'var(--jade-bright)' },
              { label: 'Avg FDU', val: players.length
                  ? (players.reduce((s,p)=>s+(p.fdu||0),0)/players.length).toFixed(1)
                  : '—', color: 'var(--azure-bright)' },
              { label: 'Avg FDD', val: players.length
                  ? (players.reduce((s,p)=>s+(p.fdd||0),0)/players.length).toFixed(1)
                  : '—', color: 'var(--azure-bright)' },
              { label: 'Total Guilds', val: stats.guildCount, color: 'var(--gold-bright)' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex justify-between" style={{ borderBottom: '1px solid rgba(201,146,11,0.07)', paddingBottom: 6 }}>
                <span style={{ color: 'var(--muted)' }}>{label}</span>
                <span style={{ color, fontFamily: 'var(--font-title)', fontSize: 12 }}>{val}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
