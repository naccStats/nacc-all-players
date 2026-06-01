import React, { useContext, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { PlayerContext } from '../App';
import { formatCP, formatCPShort } from '../utils/formatters';
import { tribColor } from '../utils/tribulationSystem';
import { computeGlobalStats } from '../utils/statsEngine';
import { bp, rGrid, rLabel, rValueLabel } from '../utils/chartResponsive';
import { T, baseTooltip } from '../utils/chartDefaults';
import GlassCard from '../components/GlassCard';
import StatCard from '../components/StatCard';
import { SectionHeader } from '../components/StatCard';
import ChartContainer from '../components/ChartContainer';
import { AnimatedCounter } from '../hooks/useAnimatedCounter';
import { motion } from 'framer-motion';
import {
  GiMeditation, GiImperialCrown, GiLightningTrio,
  GiScrollUnfurled, GiDragonOrb, GiHeartWings, GiCrystalBall,
} from 'react-icons/gi';

/* ─── Chart style constants ─────────────────────────────── */
const CHART_BORDER  = 'rgba(212,168,67,0.10)';

const RANKS_START = 3;
const RANKS_END   = 10;

/* ─── Single mountain SVG for hero ──────────────────────── */
function HeroMountain() {
  return (
    <svg viewBox="0 0 1440 280" preserveAspectRatio="xMidYMax slice" aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <linearGradient id="heroMistTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#060402" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#060402" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Far peaks — hazy, minimal */}
      <path
        d="M0,280 L0,175 L160,100 L310,138 L480,60 L650,112 L820,52 L990,100 L1160,70 L1310,105 L1440,85 L1440,280 Z"
        fill="rgba(28,16,6,0.42)"
        style={{ animation: 'mountain-drift 32s ease-in-out infinite' }}
      />
      {/* Mid silhouette */}
      <path
        d="M0,280 L0,210 L200,158 L420,188 L640,128 L860,172 L1080,135 L1300,165 L1440,148 L1440,280 Z"
        fill="rgba(14,8,3,0.72)"
        style={{ animation: 'mountain-drift 24s ease-in-out infinite reverse' }}
      />
      {/* Foreground — solid base */}
      <path
        d="M0,280 L0,248 L240,228 L480,242 L720,218 L960,236 L1200,222 L1440,232 L1440,280 Z"
        fill="rgba(6,4,2,0.98)"
      />
      {/* Mist veil at top */}
      <rect x="0" y="0" width="1440" height="160" fill="url(#heroMistTop)" />
    </svg>
  );
}

/* ─── Full hero section — cinematic, single mountain ────── */
function HeroSection({ stats }) {
  return (
    <div className="hero-section">
      {/* Single mountain illustration */}
      <div className="hero-mountains" aria-hidden="true">
        <HeroMountain />
      </div>

      {/* Ambient gold mist pool */}
      <div className="hero-mist-pool" aria-hidden="true" />

      {/* Centred content */}
      <div className="hero-content">
        {/* Decorative Chinese watermark — huge, behind */}
        <span className="hero-bg-char" aria-hidden="true">仙</span>

        {/* Giant NACC title — extreme scale */}
        <motion.h1
          className="hero-main-title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1,  y: 0  }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          NACC
        </motion.h1>

        {/* Subtitle — tight, tracked */}
        <motion.p
          className="hero-sub-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.38 }}
        >
          Immortal Cultivation Records
        </motion.p>

        {/* Four bare stats — no pills, editorial */}
        <motion.div
          className="hero-stat-row"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1,  y: 0  }}
          transition={{ duration: 0.6, delay: 0.58 }}
        >
          <div className="hero-stat-item">
            <span className="hero-stat-val"><AnimatedCounter value={stats.total} /></span>
            <span className="hero-stat-label">Cultivators</span>
          </div>
          <div className="hero-stat-divider" aria-hidden="true" />
          <div className="hero-stat-item">
            <span className="hero-stat-val"><AnimatedCounter value={stats.guildCount} /></span>
            <span className="hero-stat-label">Guilds</span>
          </div>
          <div className="hero-stat-divider" aria-hidden="true" />
          <div className="hero-stat-item">
            <span className="hero-stat-val">{formatCP(stats.maxCP)}</span>
            <span className="hero-stat-label">Peak CP</span>
          </div>
          <div className="hero-stat-divider" aria-hidden="true" />
          <div className="hero-stat-item">
            <span className="hero-stat-val">{formatCP(stats.avgCP)}</span>
            <span className="hero-stat-label">Avg CP</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Chart builders ─────────────────────────────────────── */
function buildGuildChart(topGuilds, w = 400) {
  if (!topGuilds?.length) return { series: [] };
  const { pick } = bp(w);
  const guilds   = topGuilds.slice(0, 15);
  const colors   = [
    '#D4A843','#CB4335','#9B59B6','#2E9BE5','#1EBD82',
    '#D4813A','#5D7FC2','#B03A8E','#17A272','#E8C46A',
    '#6B7FBD','#8A4FA8','#3AAD7A','#C07030','#9B7FD4',
  ];
  return {
    tooltip: {
      ...baseTooltip, trigger: 'axis',
      formatter: (p) => {
        const g = guilds[p[0].dataIndex];
        return `<b style="color:var(--gold-bright)">${g.name}</b><br/>Total CP: <b>${formatCP(g.totalCP)}</b><br/>Members: ${g.members}`;
      },
    },
    grid: rGrid(w, { right: 16, top: 8 }),
    xAxis: {
      type: 'value',
      splitNumber: bp(w).sm ? 3 : 5,
      axisLine:  { lineStyle: { color: CHART_BORDER } },
      axisLabel: { ...rValueLabel(w), color: T.color, formatter: v => formatCPShort(v), hideOverlap: true },
      splitLine: { lineStyle: { color: CHART_BORDER, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: guilds.map(g => g.name),
      axisLine:  { lineStyle: { color: CHART_BORDER } },
      axisLabel: { color: '#EDE0C4', ...rLabel(w, { width: pick(70, 100) }) },
    },
    series: [{
      type: 'bar',
      data: guilds.map(g => g.totalCP),
      barWidth: Math.max(4, Math.min(16, Math.round(120 / guilds.length))),
      itemStyle: {
        borderRadius: [0, 5, 5, 0],
        color: p => colors[p.dataIndex % colors.length],
      },
      emphasis: { itemStyle: { shadowBlur: 14, shadowColor: 'rgba(212,168,67,0.38)' } },
    }],
  };
}

function buildTribChart(tribDist) {
  const entries = Object.entries(tribDist)
    .map(([t, v]) => ({ name: t, value: v, color: tribColor(t) || '#4B5563' }))
    .sort((a, b) => b.value - a.value);
  if (!entries.length) return { series: [] };
  return {
    tooltip: {
      ...baseTooltip, trigger: 'item',
      formatter: p => `<b style="color:${p.color}">${p.name}</b><br/>${p.value} cultivators (${p.percent.toFixed(3)}%)`,
    },
    legend: {
      type: 'scroll', bottom: 4, left: 'center',
      textStyle: { color: T.color, fontSize: 9 },
      pageTextStyle: { color: T.color },
      itemWidth: 10, itemHeight: 8,
    },
    series: [{
      type: 'pie',
      radius: ['38%', '70%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#0D0718', borderWidth: 2 },
      label:     { show: false },
      labelLine: { show: false },
      emphasis: {
        itemStyle: { shadowBlur: 18, shadowColor: 'rgba(212,168,67,0.32)' },
        label:     { show: true, fontSize: 11, color: '#EDE0C4', fontWeight: 'bold' },
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
  const cps      = players.map(p => p.cp || 0).filter(v => v > 0).sort((a, b) => a - b);
  const bins     = 12;
  const logMin   = Math.log10(cps[0]);
  const logMax   = Math.log10(cps[cps.length - 1]);
  const logStep  = (logMax - logMin) / bins;
  const edges    = Array.from({ length: bins + 1 }, (_, i) => Math.pow(10, logMin + logStep * i));
  const labels   = edges.slice(0, bins).map(v => formatCP(v));
  const counts   = new Array(bins).fill(0);
  for (const v of cps) {
    const idx = Math.min(Math.floor((Math.log10(v) - logMin) / logStep), bins - 1);
    counts[idx]++;
  }
  return {
    tooltip: {
      ...baseTooltip, trigger: 'axis',
      formatter: p => {
        const i = p[0].dataIndex;
        return `CP: <b>${formatCP(edges[i])}</b> – <b>${formatCP(edges[i + 1])}</b><br/>Cultivators: <b>${p[0].value}</b>`;
      },
    },
    grid: rGrid(w),
    xAxis: {
      type: 'category', data: labels,
      axisLine:  { lineStyle: { color: CHART_BORDER } },
      axisLabel: { ...rLabel(w, { rotate: pick(45, 30) }), color: T.color },
    },
    yAxis: {
      type: 'value',
      axisLine:  { lineStyle: { color: CHART_BORDER } },
      axisLabel: { ...rValueLabel(w), color: T.color },
      splitLine: { lineStyle: { color: CHART_BORDER, type: 'dashed' } },
    },
    series: [{
      type: 'bar', data: counts, barWidth: '70%',
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0,   color: '#D4A843' },
            { offset: 0.6, color: 'rgba(201,151,58,0.55)' },
            { offset: 1,   color: 'rgba(201,151,58,0.12)' },
          ],
        },
        borderRadius: [3, 3, 0, 0],
      },
      emphasis: { itemStyle: { shadowBlur: 14, shadowColor: 'rgba(212,168,67,0.35)' } },
    }],
  };
}

/* ─── Cinematic Rank Cards ───────────────────────────────── */
const RANK_PALS = [
  { accent: '#C9973A', accentRgb: '201,151,58',  label: '1ST',  labelColor: '#F0E0A0' },
  { accent: '#9AAFC0', accentRgb: '154,175,192', label: '2ND',  labelColor: '#C8E0F0' },
  { accent: '#B87830', accentRgb: '184,120,48',  label: '3RD',  labelColor: '#F0C070' },
];

function RankCard({ player, rank, delay }) {
  const pal  = RANK_PALS[rank] || RANK_PALS[2];
  const tc   = tribColor(player.tribulation) || '#4B5563';
  const isFirst = rank === 0;

  return (
    <motion.div
      className={`rank-card${isFirst ? ' rank-card--first' : ''}`}
      style={{ '--rank-accent': pal.accent, '--rank-accent-rgb': pal.accentRgb }}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background mist glow */}
      <div className="rank-card-mist" aria-hidden="true" />

      {/* Rank numeral — large, watermark */}
      <span className="rank-card-numeral" aria-hidden="true">{rank + 1}</span>

      {/* Content */}
      <div className="rank-card-body">
        <span className="rank-card-badge">{pal.label}</span>
        <h3 className="rank-card-name" style={{ color: pal.labelColor }}>
          {player.player || '—'}
        </h3>
        <span className="rank-card-cp">{formatCP(player.cp)}</span>
        <div className="rank-card-meta">
          <span className="rank-card-guild">{player.guild || '—'}</span>
          <span
            className="rank-card-trib"
            style={{ color: tc, borderColor: `${tc}55`, background: `${tc}18` }}
          >
            {player.tribulation || '—'}
          </span>
        </div>
      </div>

      {/* Bottom accent line */}
      <div className="rank-card-line" aria-hidden="true" />
    </motion.div>
  );
}

/* ─── Quick Lookup widget ────────────────────────────────── */
function QuickLookup({ players }) {
  const [input, setInput]   = useState('');
  const [match, setMatch]   = useState(null);
  const timerRef            = useRef(null);

  const rankedPlayers = useMemo(
    () => [...players].sort((a, b) => (b.cp || 0) - (a.cp || 0)),
    [players]
  );
  const avgCP = useMemo(
    () => players.length ? players.reduce((s, p) => s + (p.cp || 0), 0) / players.length : 0,
    [players]
  );

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const q = input.trim().toLowerCase();
      if (!q) { setMatch(null); return; }
      const found = rankedPlayers.find(p =>
        p.player.toLowerCase() === q ||
        String(p.uid) === q ||
        p.player.toLowerCase().startsWith(q)
      );
      setMatch(found || null);
    }, 200);
    return () => clearTimeout(timerRef.current);
  }, [input, rankedPlayers]);

  const rank    = match ? rankedPlayers.findIndex(p => p.uid === match.uid) + 1 : null;
  const topPct  = rank  ? (rank / rankedPlayers.length) * 100 : null;
  const delta   = match ? (match.cp || 0) - avgCP : 0;
  const above   = delta >= 0;

  return (
    <GlassCard variant="gold">
      <div className="mb-3">
        <SectionHeader icon={<GiLightningTrio size={11} />} label="Quick Lookup" deco="搜" />
      </div>
      <input
        className="search-input"
        placeholder="Player name or UID…"
        value={input}
        onChange={e => setInput(e.target.value)}
        style={{ width: '100%', marginBottom: match ? 16 : 0 }}
      />
      {match && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          style={{
            display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start',
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(12,8,3,0.60)',
            border: '1px solid rgba(201,151,58,0.22)',
          }}
        >
          {/* Identity */}
          <div style={{ flex: '1 1 160px', minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 18, fontWeight: 700, color: 'var(--gold-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {match.player}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
              {match.guild || 'No Guild'}
              {match.tribulation && (
                <span style={{
                  marginLeft: 8, fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                  color: tribColor(match.tribulation) || 'var(--gold-bright)',
                  padding: '1px 6px', borderRadius: 4,
                  background: `${tribColor(match.tribulation) || 'var(--gold-bright)'}18`,
                  border: `1px solid ${tribColor(match.tribulation) || 'var(--gold-bright)'}44`,
                }}>
                  {match.tribulation}
                </span>
              )}
            </div>
          </div>

          {/* CP + rank */}
          <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: 22, fontWeight: 700, color: 'var(--bright-soft)' }}>
              {formatCP(match.cp)}
            </div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
              #{rank} of {rankedPlayers.length}
            </div>
          </div>

          {/* Percentile bar */}
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', marginBottom: 4 }}>
              <span>Realm Percentile</span>
              <span style={{ color: above ? 'var(--jade-bright)' : 'var(--cinnabar-bright)', fontWeight: 700 }}>
                Top {topPct ? topPct.toFixed(1) : '—'}%
              </span>
            </div>
            <div className="progress-track" style={{ height: 6 }}>
              <motion.div
                style={{ height: '100%', background: 'linear-gradient(90deg, var(--gold-bright), var(--cinnabar-bright))', borderRadius: 999 }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(1, 100 - (topPct || 100))}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* CP vs avg */}
          <div style={{ width: '100%', display: 'flex', gap: 16, fontSize: 10 }}>
            <div>
              <span style={{ color: 'var(--muted)' }}>CP vs Avg: </span>
              <span style={{ color: above ? 'var(--jade-bright)' : 'var(--cinnabar-bright)', fontWeight: 700 }}>
                {above ? '+' : ''}{formatCP(delta)}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--muted)' }}>Realm Avg: </span>
              <span style={{ color: 'var(--azure-bright)', fontWeight: 700 }}>{formatCP(avgCP)}</span>
            </div>
          </div>
        </motion.div>
      )}
      {input.trim() && !match && (
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>No cultivator found for "{input.trim()}"</div>
      )}
    </GlassCard>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function Dashboard() {
  const rawPlayers   = useContext(PlayerContext);
  const players      = useMemo(() => rawPlayers || [], [rawPlayers]);
  const stats        = useMemo(() => computeGlobalStats(players), [players]);
  const guildChartOption  = useCallback((w) => buildGuildChart(stats.topGuilds, w),  [stats.topGuilds]);
  const tribChartOption   = useMemo(() => buildTribChart(stats.tribDistribution),     [stats.tribDistribution]);
  const cpChartOption     = useCallback((w) => buildCPDistributionChart(players, w), [players]);

  return (
    <motion.div
      style={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}
      className="space-y-5"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      {/* ── Cinematic Hero Section ── */}
      <HeroSection stats={stats} />

      {/* ── Hero stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Cultivators"
          value={<AnimatedCounter value={stats.total} />}
          icon={<GiMeditation size={16} />}
          color="cyan" delay={0.05} gradient
          sub={`${stats.guildCount} guilds · ${((stats.activeCount / (stats.total || 1)) * 100).toFixed(0)}% active`}
        />
        <StatCard
          label="Peak CP"
          value={formatCP(stats.maxCP)}
          icon={<GiImperialCrown size={16} />}
          color="gold" delay={0.12} gradient
          sub={`Avg: ${formatCP(stats.avgCP)}`}
        />
        <StatCard
          label="Active"
          value={<AnimatedCounter value={stats.activeCount} />}
          icon={<GiLightningTrio size={16} />}
          color="jade" delay={0.19} gradient
          sub={`${stats.afkCount} AFK · ${((stats.chaosCount / (stats.total || 1)) * 100).toFixed(1)}% chaos`}
        />
        <StatCard
          label="Top Guild"
          value={
            <span style={{
              display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
              whiteSpace: 'nowrap', fontSize: 'clamp(14px, 1.8vw, 24px)', lineHeight: 1.2,
            }}>
              {stats.topGuilds[0]?.name || '—'}
            </span>
          }
          icon={<GiDragonOrb size={16} />}
          color="red" delay={0.26} gradient
          sub={stats.topGuilds[0] ? formatCP(stats.topGuilds[0].totalCP) : '—'}
        />
      </div>

      {/* Dragon divider */}
      <img src={process.env.PUBLIC_URL + '/assets/images/dragon-divider.svg'} alt="" className="dragon-divider" aria-hidden="true" />

      {/* ── Quick Lookup ── */}
      <QuickLookup players={players} />

      {/* ── Celestial Rankings ── */}
      <GlassCard variant="gold" delay={0.30}>
        <div className="mb-5">
          <SectionHeader icon={<GiImperialCrown size={12} />} label="Celestial Rankings — Top 10" deco="榜" />
        </div>

        {/* Top 3 — cinematic rank cards */}
        {(() => {
          const top3 = stats.topPlayers.slice(0, 3);
          if (!top3.length) return null;
          return (
            <div className="rank-podium">
              {/* First — full width spotlight */}
              <RankCard player={top3[0]} rank={0} delay={0.30} />
              {/* Second and third — side by side */}
              <div className="rank-podium-lower">
                {top3[1] && <RankCard player={top3[1]} rank={1} delay={0.42} />}
                {top3[2] && <RankCard player={top3[2]} rank={2} delay={0.54} />}
              </div>
            </div>
          );
        })()}

        {/* Ranks 4–10 */}
        {stats.topPlayers.length > RANKS_START && (
          <>
            <div style={{ marginBottom: 10, paddingTop: 14 }}>
              <SectionHeader icon={<GiScrollUnfurled size={10} />} label={`Ranks ${RANKS_START + 1} – ${RANKS_END}`} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {stats.topPlayers.slice(RANKS_START, RANKS_END).map((p, i) => {
                const rank     = i + RANKS_START + 1;
                const rankColor = rank <= 7 ? 'rgba(212,168,67,0.68)' : 'rgba(30,189,130,0.68)';
                const rankBg    = rank <= 7 ? 'rgba(212,168,67,0.09)' : 'rgba(30,189,130,0.07)';
                const rankBdr   = rank <= 7 ? 'rgba(212,168,67,0.22)' : 'rgba(30,189,130,0.20)';
                return (
                  <motion.div
                    key={p.uid}
                    initial={{ opacity: 0, x: -14 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.32, delay: 0.55 + i * 0.06 }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 13px', borderRadius: 10,
                      background: 'rgba(12,8,3,0.55)',
                      border: '1px solid rgba(212,168,67,0.09)',
                      backdropFilter: 'blur(8px)',
                      transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
                      position: 'relative', overflow: 'hidden',
                    }}
                    whileHover={{
                      backgroundColor: 'rgba(18,12,4,0.78)',
                      borderColor: 'rgba(212,168,67,0.25)',
                      boxShadow: '0 4px 18px rgba(0,0,0,0.40)',
                    }}
                  >
                    {/* Left rank stripe */}
                    <span style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                      background: `linear-gradient(180deg, ${rankColor}, transparent)`,
                      borderRadius: '10px 0 0 10px',
                    }} />

                    {/* Rank badge */}
                    <span style={{
                      width: 28, textAlign: 'center', flexShrink: 0, marginLeft: 7,
                      fontSize: 11, fontFamily: 'var(--font-title)', fontWeight: 700,
                      color: rankColor, background: rankBg, border: `1px solid ${rankBdr}`,
                      borderRadius: 6, padding: '1px 4px',
                    }}>#{rank}</span>

                    <span style={{
                      flex: 1, minWidth: 0, fontSize: 12, color: '#EDE0C4', fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{p.player}</span>

                    <span style={{
                      fontSize: 10, color: 'var(--muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: 90, flexShrink: 0,
                    }}>{p.guild || '—'}</span>

                    <span
                      className="badge-pill"
                      style={{
                        background: `${tribColor(p.tribulation) || '#4B5563'}22`,
                        borderColor: `${tribColor(p.tribulation) || '#4B5563'}55`,
                        color: tribColor(p.tribulation) || '#4B5563',
                        fontFamily: 'monospace',
                      }}
                    >{p.tribulation || '—'}</span>

                    <span style={{
                      fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                      color: 'var(--azure-bright)', flexShrink: 0,
                      minWidth: 58, textAlign: 'right',
                      textShadow: '0 0 10px rgba(46,155,229,0.48)',
                    }}>{formatCP(p.cp)}</span>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </GlassCard>

      {/* Dragon divider */}
      <img src={process.env.PUBLIC_URL + '/assets/images/dragon-divider.svg'} alt="" className="dragon-divider" aria-hidden="true" />

      {/* ── CP Distribution + Tribulation ── */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-8%' }}
        transition={{ duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <GlassCard variant="red" delay={0.40} className="glass-card--chart">
          <div className="mb-2">
            <SectionHeader icon={<GiCrystalBall size={11} />} label="CP Distribution" deco="力" />
          </div>
          <ChartContainer option={cpChartOption} type="bar" />
        </GlassCard>

        <GlassCard variant="gold" delay={0.45} className="glass-card--chart">
          <div className="mb-2">
            <SectionHeader icon={<GiHeartWings size={11} />} label="Tribulation Distribution" deco="道" />
          </div>
          <ChartContainer option={tribChartOption} type="pie" maxHeight={260} />
        </GlassCard>
      </motion.div>

      {/* ── Guild Rankings + Realm Summary ── */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 44 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-6%' }}
        transition={{ duration: 0.60, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <GlassCard variant="cyan" delay={0.50} className="lg:col-span-2 glass-card--chart">
          <div className="mb-2">
            <SectionHeader icon={<GiDragonOrb size={11} />} label="Guild Power Rankings" deco="宗" />
          </div>
          <ChartContainer option={guildChartOption} type="bar" maxHeight={320} />
        </GlassCard>

        <GlassCard variant="gold" delay={0.55}>
          <div className="mb-3">
            <SectionHeader icon={<GiScrollUnfurled size={11} />} label="Realm Summary" deco="界" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {(() => {
              const n = stats.total || 1;
              const chaosRate  = (stats.chaosCount  / n) * 100;
              const activeRate = (stats.activeCount / n) * 100;
              const bars = [
                { label: 'Chaos Rate',  val: chaosRate.toFixed(1)  + '%', pct: chaosRate,  color: 'var(--jade-bright)' },
                { label: 'Active Rate', val: activeRate.toFixed(1) + '%', pct: activeRate, color: 'var(--jade-bright)'     },
              ];
              const plain = [
                { label: 'Peak CP',          val: formatCP(stats.maxCP),  color: 'var(--gold-bright)'  },
                { label: 'Avg CP',           val: formatCP(stats.avgCP),  color: 'var(--azure-bright)' },
                { label: 'Total Guilds',     val: stats.guildCount,       color: 'var(--gold-bright)'  },
                { label: 'Avg Total Finals', val: players.length
                    ? (players.reduce((s, p) => s + (p.totalFinals || 0), 0) / players.length).toFixed(1)
                    : '—',                                                 color: 'var(--azure-bright)' },
              ];
              return (
                <>
                  {bars.map(({ label, val, pct, color }) => (
                    <div key={label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 10 }}>
                        <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-title)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
                        <span style={{ color, fontFamily: 'var(--font-title)', fontWeight: 700, fontSize: 11 }}>{val}</span>
                      </div>
                      <div className="progress-track" style={{ height: 5 }}>
                        <motion.div
                          style={{ height: '100%', background: color, borderRadius: 999 }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(pct, 100)}%` }}
                          transition={{ duration: 0.85, delay: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid rgba(201,146,11,0.12)', paddingTop: 9, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {plain.map(({ label, val, color }) => (
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
      </motion.div>
    </motion.div>
  );
}
