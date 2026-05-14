import React, { useContext, useMemo } from 'react';
import { PlayerContext } from '../App';
import { formatCP, formatCPShort } from '../utils/formatters';
import { tribColor } from '../utils/tribulationSystem';
import { computeGlobalStats } from '../utils/statsEngine';
import { bp, rGrid, rLabel, rValueLabel } from '../utils/chartResponsive';
import GlassCard from '../components/GlassCard';
import StatCard from '../components/StatCard';
import { SectionHeader } from '../components/StatCard';
import ChartContainer from '../components/ChartContainer';
import { AnimatedCounter } from '../hooks/useAnimatedCounter';
import { motion } from 'framer-motion';
import {
  Users, Shield, Zap, Crown, Activity, TrendingUp, Trophy, Award, Building2,
} from 'lucide-react';

/* ─── Cultivation-themed ECharts base styles ─────────────────────────────── */
const CHART_TEXT   = '#7D7263';
const CHART_BORDER = 'rgba(212,168,67,0.10)';
const TOOLTIP_BG   = 'rgba(13,7,24,0.97)';
const TOOLTIP_BORDER = 'rgba(212,168,67,0.32)';

const baseTooltip = {
  backgroundColor: TOOLTIP_BG,
  borderColor: TOOLTIP_BORDER,
  borderWidth: 1,
  textStyle: { color: '#EDE0C4', fontSize: 11, fontFamily: 'Inter' },
};

/* ─── Leaderboard display range ────────────────────────────────────────── */
const RANKS_START = 3;  // 0-based: index 3 = rank 4
const RANKS_END   = 10; // exclusive: ranks 4–10

/* ─── Chart builders ─────────────────────────────────────────────────────── */
function buildGuildChart(topGuilds, w = 400) {
  if (!topGuilds?.length) return { series: [] };
  const { pick } = bp(w);
  const guilds = topGuilds.slice(0, 15);
  const colors = ['#D4A843','#CB4335','#9B59B6','#2E9BE5','#1EBD82',
                  '#D4813A','#5D7FC2','#B03A8E','#17A272','#E8C46A',
                  '#6B7FBD','#8A4FA8','#3AAD7A','#C07030','#9B7FD4'];
  return {
    tooltip: { ...baseTooltip, trigger: 'axis',
      formatter: (p) => {
        const g = guilds[p[0].dataIndex];
        return `<b style="color:var(--gold-bright)">${g.name}</b><br/>
          Total CP: <b>${formatCP(g.totalCP)}</b><br/>
          Members: ${g.members}`;
      },
    },
    grid: rGrid(w, { right: 16, top: 8 }),
    xAxis: {
      type: 'value',
      splitNumber: bp(w).sm ? 3 : 5,
      axisLine: { lineStyle: { color: CHART_BORDER } },
      axisLabel: { ...rValueLabel(w), color: CHART_TEXT, formatter: v => formatCPShort(v), hideOverlap: true },
      splitLine: { lineStyle: { color: CHART_BORDER, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: guilds.map(g => g.name),
      axisLine: { lineStyle: { color: CHART_BORDER } },
      axisLabel: { color: '#EDE0C4', ...rLabel(w, { width: pick(70, 100) }) },
    },
    series: [{
      type: 'bar', data: guilds.map(g => g.totalCP),
      barWidth: Math.max(4, Math.min(16, Math.round(120 / guilds.length))),
      itemStyle: {
        borderRadius: [0, 5, 5, 0],
        color: p => colors[p.dataIndex % colors.length],
      },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(212,168,67,0.35)' } },
    }],
  };
}

function buildTribChart(tribDist) {
  const entries = Object.entries(tribDist)
    .map(([t, v]) => ({ name: t, value: v, color: tribColor(t) || '#4B5563' }))
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
        itemStyle: { shadowBlur: 16, shadowColor: 'rgba(212,168,67,0.28)' },
        label: { show: true, fontSize: 11, color: '#EDE0C4', fontWeight: 'bold' },
      },
      data: entries.map(e => ({
        name: e.name, value: e.value,
        itemStyle: { color: e.color },
      })),
    }],
  };
}

function buildCPDistributionChart(players, w = 400) {
  if (!players.length) return { series: [] };
  const { pick } = bp(w);
  const cps = players.map(p => p.cp || 0).filter(v => v > 0).sort((a, b) => a - b);

  // Log-scale binning: data spans ~4 orders of magnitude (1B–12T),
  // so linear bins pack 70%+ of players into the first bucket.
  const bins = 12;
  const logMin = Math.log10(cps[0]);
  const logMax = Math.log10(cps[cps.length - 1]);
  const logStep = (logMax - logMin) / bins;

  const edges  = Array.from({ length: bins + 1 }, (_, i) => Math.pow(10, logMin + logStep * i));
  const labels = edges.slice(0, bins).map(v => formatCP(v));
  const counts = new Array(bins).fill(0);

  for (const v of cps) {
    const idx = Math.min(Math.floor((Math.log10(v) - logMin) / logStep), bins - 1);
    counts[idx]++;
  }

  return {
    tooltip: { ...baseTooltip, trigger: 'axis',
      formatter: p => {
        const i = p[0].dataIndex;
        return `CP: <b>${formatCP(edges[i])}</b> – <b>${formatCP(edges[i + 1])}</b><br/>Cultivators: <b>${p[0].value}</b>`;
      },
    },
    grid: rGrid(w),
    xAxis: {
      type: 'category', data: labels,
      axisLine: { lineStyle: { color: CHART_BORDER } },
      axisLabel: { ...rLabel(w, { rotate: pick(45, 30) }), color: CHART_TEXT },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: CHART_BORDER } },
      axisLabel: { ...rValueLabel(w), color: CHART_TEXT },
      splitLine: { lineStyle: { color: CHART_BORDER, type: 'dashed' } },
    },
    series: [{
      type: 'bar', data: counts, barWidth: '70%',
      itemStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0,   color: '#D4A843' },
            { offset: 0.6, color: '#9B59B6' },
            { offset: 1,   color: '#2E9BE544' },
          ],
        },
        borderRadius: [3, 3, 0, 0],
      },
      emphasis: { itemStyle: { shadowBlur: 13, shadowColor: 'rgba(212,168,67,0.32)' } },
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
      style={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}
      className="space-y-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── Hero stat cards — 4 large premium cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Cultivators"
          value={<AnimatedCounter value={stats.total} />}
          icon={<Users size={16}/>}
          color="cyan"
          delay={0.05}
          gradient
          sub={`${stats.guildCount} guilds · ${((stats.activeCount/(stats.total||1))*100).toFixed(0)}% active`}
        />
        <StatCard
          label="Peak CP"
          value={formatCP(stats.maxCP)}
          icon={<Crown size={16}/>}
          color="gold"
          delay={0.12}
          gradient
          sub={`Avg: ${formatCP(stats.avgCP)}`}
        />
        <StatCard
          label="Active"
          value={<AnimatedCounter value={stats.activeCount} />}
          icon={<Zap size={16}/>}
          color="jade"
          delay={0.19}
          gradient
          sub={`${stats.afkCount} AFK · ${((stats.chaosCount/(stats.total||1))*100).toFixed(1)}% chaos`}
        />
        <StatCard
          label="Top Guild"
          value={
            <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'clamp(14px, 1.8vw, 24px)', lineHeight: 1.2 }}>
              {stats.topGuilds[0]?.name || '—'}
            </span>
          }
          icon={<Building2 size={16}/>}
          color="red"
          delay={0.26}
          sub={stats.topGuilds[0] ? formatCP(stats.topGuilds[0].totalCP) : '—'}
          gradient
        />
      </div>

      {/* ── Top cultivators ── */}
      <GlassCard variant="gold" delay={0.30}>
        <div className="mb-5">
          <SectionHeader icon={<Crown size={12} />} label="Celestial Rankings — Top 10" />
        </div>

        {/* ── Podium — positions 1·2·3 ── */}
        {(() => {
          const top3 = stats.topPlayers.slice(0, 3);
          if (top3.length < 1) return null;
          // display order: 2nd · 1st · 3rd
          const order = [top3[1], top3[0], top3[2]].filter(Boolean);
          const RANK_OF = p => top3.indexOf(p); // 0-based index back to rank
          const COLORS  = ['#D4A843', '#C0C0C0', '#CD7F32'];
          const GLOWS   = ['rgba(212,168,67,0.60)', 'rgba(192,192,192,0.30)', 'rgba(205,127,50,0.48)'];
          const NUMERALS = ['一', '二', '三'];
          const LABELS   = ['1st', '2nd', '3rd'];
          // pillar heights for 2nd · 1st · 3rd
          const HEIGHTS  = [130, 175, 110];

          return (
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
              padding: '0 8px',
              width: '100%',
              overflowX: 'hidden',
              boxSizing: 'border-box',
            }}>
              {order.map((p, colIdx) => {
                const rank = RANK_OF(p); // 0=1st, 1=2nd, 2=3rd
                const color = COLORS[rank];
                const glow  = GLOWS[rank];
                const pillarH = HEIGHTS[colIdx];
                const isFirst = rank === 0;

                return (
                  <motion.div
                    key={p.uid}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 + colIdx * 0.08 }}
                    style={{ flex: 1, minWidth: 0, maxWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    {/* Rank icon badge — floating above pillar */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: colIdx * 0.5 }}
                      style={{
                        width:  isFirst ? 64 : 50,
                        height: isFirst ? 64 : 50,
                        borderRadius: '50%',
                        background: `radial-gradient(circle at 35% 35%, ${color}50, ${color}10 70%)`,
                        border: `2px solid ${color}AA`,
                        boxShadow: `0 0 24px ${glow}, 0 0 8px ${color}70, inset 0 1px 0 ${color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 8,
                      }}
                    >
                      {rank === 0
                        ? <Trophy size={isFirst ? 24 : 20} color={color} strokeWidth={1.8} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
                        : <Award  size={isFirst ? 24 : 20} color={color} strokeWidth={1.8} style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
                      }
                    </motion.div>

                    {/* Player card — floats above the pillar */}
                    <div style={{
                      width: '100%',
                      background: `linear-gradient(160deg, ${color}22, rgba(13,7,24,0.90))`,
                      border: `1px solid ${color}66`,
                      borderRadius: 12,
                      padding: '12px 12px 10px',
                      marginBottom: 0,
                      boxShadow: `0 0 28px ${glow}, 0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 ${color}20, inset 0 0 28px ${color}08`,
                      textAlign: 'center',
                      position: 'relative',
                    }}>
                      {/* Decorative Chinese numeral watermark */}
                      <span style={{
                        position: 'absolute', bottom: 4, right: 8,
                        fontFamily: 'var(--font-deco)', fontSize: 32,
                        color, opacity: 0.08, lineHeight: 1, pointerEvents: 'none',
                        userSelect: 'none',
                      }}>{NUMERALS[rank]}</span>

                      {/* Rank label */}
                      <div style={{
                        fontSize: 9, fontFamily: 'var(--font-title)', letterSpacing: '0.15em',
                        color, textTransform: 'uppercase', marginBottom: 5,
                        textShadow: `0 0 8px ${color}`,
                      }}>{LABELS[rank]}</div>

                      {/* Player name */}
                      <div style={{
                        fontSize: isFirst ? 11 : 10,
                        fontFamily: 'var(--font-title)', fontWeight: 700,
                        color: '#EDE0C4', lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 7,
                        letterSpacing: '0.03em',
                        maxWidth: '100%',
                      }}>{p.player}</div>

                      {/* CP */}
                      <div style={{
                        fontSize: isFirst ? 17 : 13,
                        fontFamily: 'monospace', fontWeight: 700,
                        color, marginBottom: 6,
                        textShadow: `0 0 14px ${color}99, 0 0 4px ${color}60`,
                        letterSpacing: '0.03em',
                      }}>{formatCP(p.cp)}</div>

                      {/* Tribulation badge */}
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px', borderRadius: 20, fontSize: 9,
                        background: `${tribColor(p.tribulation) || '#4B5563'}22`,
                        border: `1px solid ${tribColor(p.tribulation) || '#4B5563'}55`,
                        color: tribColor(p.tribulation) || '#4B5563',
                        fontFamily: 'monospace', fontWeight: 700,
                      }}>{p.tribulation || '—'}</span>

                      {/* Guild */}
                      {p.guild && (
                        <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.guild}
                        </div>
                      )}
                    </div>

                    {/* Podium pillar */}
                    <div style={{
                      width: '100%',
                      height: pillarH,
                      background: `linear-gradient(180deg, ${color}32 0%, ${color}14 50%, ${color}05 85%, transparent 100%)`,
                      border: `1px solid ${color}40`,
                      borderTop: `2px solid ${color}80`,
                      borderRadius: '0 0 8px 8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 12px 32px -6px ${color}38, 0 2px 12px -2px ${color}28, inset 0 1px 0 ${color}20`,
                      position: 'relative',
                      overflow: 'visible',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-deco)', fontSize: isFirst ? 40 : 30,
                        color, opacity: 0.18, userSelect: 'none',
                      }}>{NUMERALS[rank]}</span>
                      {/* Floor glow reflection */}
                      <div style={{
                        position: 'absolute',
                        bottom: -8,
                        left: '10%',
                        right: '10%',
                        height: 16,
                        background: `radial-gradient(ellipse at center, ${color}40 0%, transparent 70%)`,
                        filter: 'blur(4px)',
                        pointerEvents: 'none',
                      }} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Ranks 4–10 leaderboard ── */}
        {stats.topPlayers.length > RANKS_START && (
          <>
            <div style={{ marginBottom: 10, paddingTop: 12 }}>
              <SectionHeader icon={<TrendingUp size={10} />} label={`Ranks ${RANKS_START + 1} – ${RANKS_END}`} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {stats.topPlayers.slice(RANKS_START, RANKS_END).map((p, i) => {
                const rank = i + RANKS_START + 1;
                const rankColor = rank <= 7 ? 'rgba(212,168,67,0.65)' : 'rgba(30,189,130,0.65)';
                const rankBg    = rank <= 7 ? 'rgba(212,168,67,0.08)' : 'rgba(30,189,130,0.06)';
                const rankBdr   = rank <= 7 ? 'rgba(212,168,67,0.20)' : 'rgba(30,189,130,0.18)';
                return (
                  <motion.div
                    key={p.uid}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.30, delay: 0.55 + i * 0.05 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      background: 'rgba(20,13,36,0.50)',
                      border: `1px solid rgba(212,168,67,0.08)`,
                      backdropFilter: 'blur(8px)',
                      transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
                      cursor: 'default',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    whileHover={{
                      backgroundColor: 'rgba(28,18,50,0.75)',
                      borderColor: 'rgba(212,168,67,0.22)',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                    }}
                  >
                    {/* Left rank stripe */}
                    <span style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: 3,
                      background: `linear-gradient(180deg, ${rankColor}, transparent)`,
                      borderRadius: '10px 0 0 10px',
                    }} />

                    {/* Rank number */}
                    <span style={{
                      width: 26, textAlign: 'center', flexShrink: 0, marginLeft: 6,
                      fontSize: 11, fontFamily: 'var(--font-title)', fontWeight: 700,
                      color: rankColor,
                      background: rankBg,
                      border: `1px solid ${rankBdr}`,
                      borderRadius: 6,
                      padding: '1px 4px',
                    }}>#{rank}</span>

                    {/* Player name */}
                    <span style={{
                      flex: 1, minWidth: 0,
                      fontSize: 12, color: '#EDE0C4', fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.player}</span>

                    {/* Guild (dim) */}
                    <span style={{
                      fontSize: 10, color: 'var(--muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 88, flexShrink: 0,
                    }}>{p.guild || '—'}</span>

                    {/* Tribulation badge */}
                    <span style={{
                      padding: '2px 8px', borderRadius: 20, fontSize: 9,
                      background: `${tribColor(p.tribulation) || '#4B5563'}22`,
                      border: `1px solid ${tribColor(p.tribulation) || '#4B5563'}55`,
                      color: tribColor(p.tribulation) || '#4B5563',
                      fontFamily: 'monospace', fontWeight: 700,
                      flexShrink: 0,
                    }}>{p.tribulation || '—'}</span>

                    {/* CP */}
                    <span style={{
                      fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                      color: 'var(--azure-bright)', flexShrink: 0, minWidth: 56, textAlign: 'right',
                      textShadow: '0 0 10px rgba(46,155,229,0.45)',
                    }}>{formatCP(p.cp)}</span>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </GlassCard>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard variant="cyan" delay={0.40} className="glass-card--chart">
          <div className="mb-2">
            <SectionHeader icon={<Shield size={11} />} label="Guild Power Rankings" />
          </div>
          <ChartContainer option={(w) => buildGuildChart(stats.topGuilds, w)} type="bar" maxHeight={320} />
        </GlassCard>

        <GlassCard variant="purple" delay={0.45} className="glass-card--chart">
          <div className="mb-2">
            <SectionHeader icon={<TrendingUp size={11} />} label="Tribulation Distribution" />
          </div>
          <ChartContainer option={buildTribChart(stats.tribDistribution)} type="pie" maxHeight={260} />
        </GlassCard>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard variant="red" delay={0.50} className="lg:col-span-2 glass-card--chart">
          <div className="mb-2">
            <SectionHeader icon={<Activity size={11} />} label="CP Distribution" />
          </div>
          <ChartContainer option={(w) => buildCPDistributionChart(players, w)} type="bar" />
        </GlassCard>

        <GlassCard variant="gold" delay={0.55}>
          <div className="mb-3">
            <SectionHeader icon={<TrendingUp size={11} />} label="Realm Summary" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(()=>{
              const n = stats.total || 1;
              const chaosRate  = (stats.chaosCount / n) * 100;
              const activeRate = (stats.activeCount / n) * 100;
              const bars = [
                { label: 'Chaos Rate',  val: chaosRate.toFixed(1)  + '%', pct: chaosRate,  color: 'var(--imperial-bright)' },
                { label: 'Active Rate', val: activeRate.toFixed(1) + '%', pct: activeRate, color: 'var(--jade-bright)' },
              ];
              const plain = [
                { label: 'Peak CP',         val: formatCP(stats.maxCP),     color: 'var(--gold-bright)' },
                { label: 'Avg CP',          val: formatCP(stats.avgCP),     color: 'var(--azure-bright)' },
                { label: 'Total Guilds',    val: stats.guildCount,          color: 'var(--gold-bright)' },
                { label: 'Avg Total Finals',val: players.length
                    ? (players.reduce((s,p)=>s+(p.totalFinals||0),0)/players.length).toFixed(1)
                    : '—',                                                  color: 'var(--azure-bright)' },
              ];
              return (
                <>
                  {bars.map(({label, val, pct, color}) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 10 }}>
                        <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-title)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
                        <span style={{ color, fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: 11 }}>{val}</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden' }}>
                        <motion.div
                          style={{ height: '100%', background: color, borderRadius: 999 }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(201,146,11,0.10)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {plain.map(({label, val, color}) => (
                      <div key={label} className="flex justify-between" style={{ fontSize: 11 }}>
                        <span style={{ color: 'var(--muted)' }}>{label}</span>
                        <span style={{ color, fontFamily: 'var(--font-title)', fontWeight: 700 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
