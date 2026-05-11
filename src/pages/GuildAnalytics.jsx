import { useContext, useState, useMemo } from 'react';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { tribColor, tribRank } from '../utils/tribulationSystem';
import { computeGuildStats } from '../utils/statsEngine';
import GlassCard from '../components/GlassCard';
import SearchBar from '../components/SearchBar';
import ChartContainer from '../components/ChartContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Crown } from 'lucide-react';

const TOOLTIP_BG = 'rgba(13,7,24,0.97)';
const TOOLTIP_BORDER = 'rgba(201,146,11,0.35)';
const CHART_TEXT = '#8B7E6A';
const CHART_GRID_LINE = 'rgba(201,146,11,0.08)';

const PALETTE = [
  '#C9920B','#FF3B2B','#B026FF','#00BFFF','#00E87C',
  '#FF8C42','#6B8AFF','#EC4899','#14B8A6','#F59E0B',
  '#6366F1','#8B5CF6',
];

function guildBarChart(guilds) {
  if (!guilds?.length) return { series: [] };
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: TOOLTIP_BG,
      borderColor: TOOLTIP_BORDER,
      borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 11 },
      formatter: p => {
        const g = guilds[p[0].dataIndex];
        return `<b style="color:var(--gold-bright)">${g.name}</b><br/>
          Total CP: <b>${formatCP(g.totalCP)}</b><br/>
          Members: ${g.memberCount}`;
      },
    },
    grid: { left: 120, right: 24, top: 10, bottom: 28 },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: CHART_GRID_LINE } },
      axisLabel: { color: CHART_TEXT, fontSize: 9, formatter: v => formatCP(v) },
      splitLine: { lineStyle: { color: CHART_GRID_LINE, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: guilds.map(g => g.name),
      axisLine: { lineStyle: { color: CHART_GRID_LINE } },
      axisLabel: { color: '#EDE0C4', fontSize: 9, width: 110, overflow: 'truncate' },
    },
    series: [{
      type: 'bar', data: guilds.map(g => g.totalCP), barWidth: 11,
      itemStyle: {
        borderRadius: [0, 5, 5, 0],
        color: p => PALETTE[p.dataIndex % PALETTE.length],
      },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(201,146,11,0.4)' } },
    }],
  };
}

function guildPieChart(guilds) {
  if (!guilds?.length) return { series: [] };
  const top = guilds.slice(0, 9);
  const rest = guilds.slice(9);
  const otherCP = rest.reduce((s, g) => s + g.totalCP, 0);
  const pieData = [
    ...top.map((g, i) => ({ name: g.name, value: g.totalCP, itemStyle: { color: PALETTE[i % PALETTE.length] } })),
    ...(otherCP > 0 ? [{ name: `Others (${rest.length})`, value: otherCP, itemStyle: { color: '#4B5563' } }] : []),
  ];
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: TOOLTIP_BG, borderColor: TOOLTIP_BORDER, borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 11 },
      formatter: p => `<b style="color:${p.color}">${p.name}</b><br/>CP: ${formatCP(p.value)} (${p.percent.toFixed(3)}%)`,
    },
    legend: {
      orient: 'vertical', right: 8, top: 'middle',
      textStyle: { color: CHART_TEXT, fontSize: 9 },
      itemWidth: 8, itemHeight: 8,
    },
    series: [{
      type: 'pie', radius: ['32%', '66%'], center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#0D0718', borderWidth: 2 },
      label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: CHART_TEXT, fontSize: 8 },
      labelLine: { lineStyle: { color: 'rgba(201,146,11,0.2)' } },
      emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(201,146,11,0.35)' } },
      data: pieData,
    }],
  };
}

export default function GuildAnalytics() {
  const rawPlayers = useContext(PlayerContext);
  const [search, setSearch] = useState('');
  const [selectedGuild, setSelectedGuild] = useState(null);

  const guildStats = useMemo(() => computeGuildStats(rawPlayers || []), [rawPlayers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return guildStats;
    const q = search.toLowerCase();
    return guildStats.filter(g => g.name.toLowerCase().includes(q));
  }, [guildStats, search]);

  const totalCP = guildStats.reduce((s, g) => s + g.totalCP, 0);

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search guild..." />
          <div className="flex-1" />
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {guildStats.length} guilds · {formatCP(totalCP)} total CP
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard variant="cyan">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={15} style={{ color: 'var(--azure-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">Guild Power Rankings</h2>
          </div>
          <ChartContainer option={guildBarChart(filtered.slice(0, 12))} ratio={9/16} maxHeight={350} />
        </GlassCard>

        <GlassCard variant="gold">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={15} style={{ color: 'var(--gold-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text-gold">CP Market Share</h2>
          </div>
          <ChartContainer option={guildPieChart(filtered)} ratio={3/4} maxHeight={360} />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((g, i) => {
          const isSelected = selectedGuild === g.name;
          const share = totalCP > 0 ? (g.totalCP / totalCP * 100) : 0;
          const topTrib = Object.keys(g.tribBreakdown)
            .sort((a, b) => tribRank(b) - tribRank(a))[0];

          return (
            <GlassCard
              key={g.name}
              variant={i < 3 ? 'gold' : 'default'}
              delay={i * 0.025}
              onClick={() => setSelectedGuild(isSelected ? null : g.name)}
              style={{ cursor: 'pointer' }}
            >
              {/* Rank badge */}
              {i < 3 && (
                <div style={{
                  position: 'absolute', top: 10, right: 12,
                  fontFamily: 'var(--font-deco)', fontSize: 20, opacity: 0.15,
                  color: 'var(--gold-bright)',
                }}>
                  {i === 0 ? '一' : i === 1 ? '二' : '三'}
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0" style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-title)', fontWeight: 700, color: '#EDE0C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.name}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                    #{i + 1} · {g.memberCount} members
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: 'var(--azure-bright)' }}>
                    {formatCP(g.totalCP)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>{share.toFixed(2)}% share</div>
                </div>
              </div>

              {/* Progress bar for share */}
              <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 999, marginBottom: 10, overflow: 'hidden' }}>
                <motion.div
                  style={{ height: '100%', borderRadius: 999, background: i < 3 ? 'linear-gradient(90deg, var(--gold-bright), var(--cinnabar-bright))' : 'linear-gradient(90deg, var(--azure-bright), var(--imperial-bright))' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(share * 4, 100)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.03 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 9 }}>
                {[
                  { label: 'Avg CP',     val: formatCP(g.avgCP),           color: 'var(--azure-bright)' },
                  { label: 'Chaos',      val: `${g.chaosCount} (${g.chaosRate != null ? (g.chaosRate * 100).toFixed(0) : 0}%)`, color: 'var(--imperial-bright)' },
                  { label: 'Avg FDU',    val: g.avgFDU != null ? g.avgFDU.toFixed(1) : '—', color: 'var(--jade-bright)' },
                  { label: 'Avg FDD',    val: g.avgFDD != null ? g.avgFDD.toFixed(1) : '—', color: 'var(--jade-bright)' },
                  { label: 'Avg Finals', val: g.avgFinals != null ? g.avgFinals.toFixed(1) : '—', color: 'var(--gold-bright)' },
                  { label: 'Top Trib',   val: topTrib || '—', color: tribColor(topTrib) || 'var(--muted)' },
                ].map(({ label, val, color }) => (
                  <div key={label}>
                    <div style={{ color: 'var(--muted)', marginBottom: 1 }}>{label}</div>
                    <div style={{ color, fontFamily: 'monospace', fontWeight: 700 }}>{val}</div>
                  </div>
                ))}
              </div>

              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28 }}
                    style={{ borderTop: '1px solid rgba(201,146,11,0.12)', paddingTop: 10, marginTop: 10, overflow: 'hidden' }}
                  >
                    <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--font-title)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Top Members
                    </div>
                    {g.members.sort((a, b) => (b.cp || 0) - (a.cp || 0)).slice(0, 5).map(m => (
                      <div key={m.uid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4, alignItems: 'center' }}>
                        <span style={{ color: '#EDE0C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{m.player}</span>
                        <span style={{ color: 'var(--azure-bright)', fontFamily: 'monospace', fontWeight: 700 }}>{formatCP(m.cp)}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          );
        })}
      </div>
    </motion.div>
  );
}
