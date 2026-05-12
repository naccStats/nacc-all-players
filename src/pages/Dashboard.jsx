import React, { useContext, useMemo } from 'react';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { tribColor } from '../utils/tribulationSystem';
import { computeGlobalStats } from '../utils/statsEngine';
import { bp, rGrid, rLabel, rValueLabel } from '../utils/chartResponsive';
import GlassCard from '../components/GlassCard';
import StatCard from '../components/StatCard';
import ChartContainer from '../components/ChartContainer';
import { AnimatedCounter } from '../hooks/useAnimatedCounter';
import { motion } from 'framer-motion';
import {
  Users, Sword, Shield, Zap, Crown, Flame, Activity, TrendingUp, Trophy, Award,
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

/* ─── Tribulation color mapping ──────────────────────────────────────────── */
const TRIB_COLORS = {
  DG: '#D4A843', SM: '#CB4335', CE: '#D4813A',
  CK: '#B03A8E', DL: '#9B59B6', GI: '#2E9BE5',
  SI: '#1EBD82', CI: '#1EBD82', TI: '#5D7FC2',
  GA: '#A07830', BI: '#7A5C3A',
};

function getTribColor(t) {
  if (!t) return '#4B5563';
  const key = t.toString().toUpperCase().substring(0, 2);
  return TRIB_COLORS[key] || tribColor(t) || '#4B5563';
}

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
      axisLine: { lineStyle: { color: CHART_BORDER } },
      axisLabel: { ...rValueLabel(w), color: CHART_TEXT, formatter: v => formatCP(v) },
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
      type: 'bar', data: guilds.map(g => g.totalCP), barWidth: 11,
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
      className="space-y-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ── Hero stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Cultivators"   value={<AnimatedCounter value={stats.total} />}         icon={<Users    size={16}/>} color="cyan"   delay={0.05}/>
        <StatCard label="Avg CP"        value={formatCP(stats.avgCP)}            icon={<Sword    size={16}/>} color="gold"   delay={0.10} sub={`peak ${formatCP(stats.maxCP)}`}/>
        <StatCard label="Peak CP"       value={formatCP(stats.maxCP)}            icon={<Crown    size={16}/>} color="red"    delay={0.15}/>
        <StatCard label="Active"        value={<AnimatedCounter value={stats.activeCount} />}    icon={<Zap   size={16}/>} color="jade"   delay={0.20} sub={`${Math.round(stats.activeCount/(stats.total||1)*100)}% active`}/>
        <StatCard label="Chaos Users"   value={<AnimatedCounter value={stats.chaosCount} />}    icon={<Flame  size={16}/>} color="purple" delay={0.25} sub={`${((stats.chaosCount/(stats.total||1))*100).toFixed(1)}%`}/>
        <StatCard label="Guilds"         value={<AnimatedCounter value={stats.guildCount} />}    icon={<Shield   size={16}/>} color="cyan"   delay={0.30}/>
        <StatCard label="AFK"           value={<AnimatedCounter value={stats.afkCount} />}       icon={<Activity size={16}/>} color="gold"   delay={0.35}/>
      </div>

      {/* ── Top cultivators ── */}
      <GlassCard variant="gold" delay={0.30}>
        <div className="flex items-center gap-2 mb-5">
          <Crown size={15} style={{ color: 'var(--gold-bright)' }}/>
          <h2 className="text-sm font-display font-bold gradient-text-gold">
            Celestial Rankings — Top 10
          </h2>
        </div>

        {/* ── Podium — positions 1·2·3 ── */}
        {(() => {
          const top3 = stats.topPlayers.slice(0, 3);
          if (top3.length < 1) return null;
          // display order: 2nd · 1st · 3rd
          const order = [top3[1], top3[0], top3[2]].filter(Boolean);
          const RANK_OF = p => top3.indexOf(p); // 0-based index back to rank
          const COLORS  = ['#D4A843', '#A8A8A8', '#A07830'];
          const GLOWS   = ['rgba(212,168,67,0.50)', 'rgba(168,168,168,0.22)', 'rgba(160,120,48,0.38)'];
          const NUMERALS = ['一', '二', '三'];
          const LABELS   = ['1st', '2nd', '3rd'];
          // pillar heights for 2nd · 1st · 3rd
          const HEIGHTS  = [120, 160, 100];

          return (
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
              padding: '0 8px',
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
                    style={{ flex: 1, maxWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    {/* Rank icon badge — floating above pillar */}
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: colIdx * 0.5 }}
                      style={{
                        width:  isFirst ? 52 : 42,
                        height: isFirst ? 52 : 42,
                        borderRadius: '50%',
                        background: `radial-gradient(circle at 35% 35%, ${color}40, ${color}0A 70%)`,
                        border: `1.5px solid ${color}88`,
                        boxShadow: `0 0 18px ${glow}, 0 0 6px ${color}60`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 6,
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
                      background: `linear-gradient(160deg, ${color}18, rgba(13,7,24,0.85))`,
                      border: `1px solid ${color}55`,
                      borderRadius: 10,
                      padding: '10px 10px 8px',
                      marginBottom: 0,
                      boxShadow: `0 0 18px ${glow}, inset 0 0 24px ${color}0A`,
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
                        fontSize: isFirst ? 13 : 11,
                        fontFamily: 'var(--font-title)', fontWeight: 700,
                        color: '#EDE0C4', lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        marginBottom: 6,
                      }}>{p.player}</div>

                      {/* CP */}
                      <div style={{
                        fontSize: isFirst ? 15 : 12,
                        fontFamily: 'monospace', fontWeight: 700,
                        color, marginBottom: 5,
                        textShadow: `0 0 10px ${color}88`,
                      }}>{formatCP(p.cp)}</div>

                      {/* Tribulation badge */}
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px', borderRadius: 20, fontSize: 9,
                        background: `${getTribColor(p.tribulation)}22`,
                        border: `1px solid ${getTribColor(p.tribulation)}55`,
                        color: getTribColor(p.tribulation),
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
                      background: `linear-gradient(180deg, ${color}28 0%, ${color}10 60%, transparent 100%)`,
                      border: `1px solid ${color}33`,
                      borderTop: `2px solid ${color}66`,
                      borderRadius: '0 0 6px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-deco)', fontSize: isFirst ? 40 : 30,
                        color, opacity: 0.18, userSelect: 'none',
                      }}>{NUMERALS[rank]}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Ranks 4–10 leaderboard ── */}
        {stats.topPlayers.length > 3 && (
          <>
            <div style={{
              borderTop: '1px solid rgba(201,146,11,0.15)',
              marginBottom: 10,
              paddingTop: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <TrendingUp size={11} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-title)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                Ranks 4 – 10
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {stats.topPlayers.slice(3, 10).map((p, i) => {
                const rank = i + 4;
                const isEven = i % 2 === 0;
                return (
                  <motion.div
                    key={p.uid}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.28, delay: 0.55 + i * 0.04 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 10px', borderRadius: 7,
                      background: isEven ? 'rgba(201,146,11,0.03)' : 'transparent',
                      border: '1px solid transparent',
                      transition: 'background 0.15s, border-color 0.15s',
                      cursor: 'default',
                    }}
                    whileHover={{ backgroundColor: 'rgba(201,146,11,0.06)', borderColor: 'rgba(201,146,11,0.12)' }}
                  >
                    {/* Rank badge */}
                    <span style={{
                      width: 22, textAlign: 'right', flexShrink: 0,
                      fontSize: 10, fontFamily: 'var(--font-title)', fontWeight: 700,
                      color: 'var(--muted)',
                    }}>#{rank}</span>

                    {/* Player name */}
                    <span style={{
                      flex: 1, minWidth: 0,
                      fontSize: 11, color: '#EDE0C4',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.player}</span>

                    {/* Guild (dim) */}
                    <span style={{
                      fontSize: 9, color: 'var(--muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 80, flexShrink: 0,
                    }}>{p.guild || '—'}</span>

                    {/* Tribulation badge */}
                    <span style={{
                      padding: '1px 7px', borderRadius: 20, fontSize: 9,
                      background: `${getTribColor(p.tribulation)}18`,
                      border: `1px solid ${getTribColor(p.tribulation)}44`,
                      color: getTribColor(p.tribulation),
                      fontFamily: 'monospace', fontWeight: 700,
                      flexShrink: 0,
                    }}>{p.tribulation || '—'}</span>

                    {/* CP */}
                    <span style={{
                      fontSize: 11, fontFamily: 'monospace', fontWeight: 700,
                      color: 'var(--azure-bright)', flexShrink: 0, minWidth: 52, textAlign: 'right',
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
        <GlassCard variant="cyan" delay={0.40}>
          <div className="flex items-center gap-2 mb-2">
            <Shield size={15} style={{ color: 'var(--azure-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">
              Guild Power Rankings
            </h2>
          </div>
          <ChartContainer option={(w) => buildGuildChart(stats.topGuilds, w)} type="bar" maxHeight={320} />
        </GlassCard>

        <GlassCard variant="purple" delay={0.45}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} style={{ color: 'var(--imperial-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">
              Tribulation Distribution
            </h2>
          </div>
          <ChartContainer option={buildTribChart(stats.tribDistribution)} type="pie" maxHeight={260} />
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
          <ChartContainer option={(w) => buildCPDistributionChart(players, w)} type="bar" />
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
