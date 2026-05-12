import { useContext, useState, useMemo } from 'react';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { tribColor, tribRank } from '../utils/tribulationSystem';
import { computeGuildStats } from '../utils/statsEngine';
import GlassCard from '../components/GlassCard';
import SearchBar from '../components/SearchBar';
import ChartContainer from '../components/ChartContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Crown, LayoutGrid, BarChart2, Circle, ZoomIn, ZoomOut } from 'lucide-react';
import 'echarts-gl';

const TOOLTIP_BG = 'rgba(13,7,24,0.97)';
const TOOLTIP_BORDER = 'rgba(212,168,67,0.32)';
const CHART_TEXT = '#7D7263';
const CHART_GRID_LINE = 'rgba(212,168,67,0.08)';

const PALETTE = [
  '#D4A843','#CB4335','#9B59B6','#2E9BE5','#1EBD82',
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
    grid: { left: 8, right: 8, top: 10, bottom: 8, containLabel: true },
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
      axisLabel: { color: '#EDE0C4', fontSize: 9, width: 100, overflow: 'truncate' },
    },
    series: [{
      type: 'bar', data: guilds.map(g => g.totalCP), barWidth: 11,
      itemStyle: {
        borderRadius: [0, 5, 5, 0],
        color: p => PALETTE[p.dataIndex % PALETTE.length],
      },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(212,168,67,0.32)' } },
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
      orient: 'horizontal', bottom: 2, left: 'center', type: 'scroll',
      textStyle: { color: CHART_TEXT, fontSize: 9 },
      itemWidth: 8, itemHeight: 8, pageTextStyle: { color: CHART_TEXT },
    },
    series: [{
      type: 'pie', radius: ['32%', '62%'], center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#0D0718', borderWidth: 2 },
      label: { show: false },
      labelLine: { show: false },
      emphasis: { itemStyle: { shadowBlur: 14, shadowColor: 'rgba(212,168,67,0.28)' }, label: { show: true, fontSize: 11, color: '#EDE0C4', fontWeight: 'bold' } },
      data: pieData,
    }],
  };
}

export default function GuildAnalytics() {
  const rawPlayers = useContext(PlayerContext);
  const [search, setSearch] = useState('');
  const [selectedGuild, setSelectedGuild] = useState(null);
  const [hoveredGuild, setHoveredGuild] = useState(null);
  const [zoom3D, setZoom3D] = useState(() => window.innerWidth < 640 ? 53 : 69);

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

      <GlassCard>
        {/* Window panel header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(201,146,11,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={14} style={{ color: 'var(--azure-bright)' }} />
            <span style={{ fontSize: 12, fontFamily: 'var(--font-title)', fontWeight: 700, color: '#EDE0C4', letterSpacing: '0.05em' }}>Guild Roster</span>
          </div>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{filtered.length} guilds</span>
        </div>
        {/* Scrollable inner grid */}
        <div style={{ maxHeight: 580, overflowY: 'auto', paddingRight: 4 }}
          className="max-h-[420px] md:max-h-[580px]">
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
        </div>
      </GlassCard>

      {/* ── Treemap + Stacked Bar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard variant="cyan">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid size={14} style={{ color: 'var(--azure-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">Guild Realm Map</h2>
          </div>
          <ChartContainer option={guildTreemapChart(filtered)} ratio={9 / 16} maxHeight={360} />
          {/* Color legend */}
          {(() => {
            const validGuilds = filtered.slice(0, 20).filter(g => g.memberCount > 0);
            const minAvg = validGuilds.length ? Math.min(...validGuilds.map(g => g.avgCP)) : 0;
            const maxAvg = validGuilds.length ? Math.max(...validGuilds.map(g => g.avgCP)) : 0;
            return (
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 8, borderRadius: 999, background: 'linear-gradient(to right, #1a2744, #6C3483, #D4A843)', marginBottom: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: 'var(--muted)' }}>Low Avg CP · {formatCP(minAvg)}</span>
                  <span style={{ fontSize: 9, color: 'var(--muted)' }}>Cell size = member count</span>
                  <span style={{ fontSize: 9, color: 'var(--muted)' }}>High Avg CP · {formatCP(maxAvg)}</span>
                </div>
              </div>
            );
          })()}
        </GlassCard>

        <GlassCard variant="purple">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={14} style={{ color: 'var(--imperial-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">Guild Territory Map — Tier × Players</h2>
          </div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}>Drag to rotate · Scroll/pinch to zoom · X = Guild · Y = Trib tier · Z = Player count</div>
          <ChartContainer option={guild3DBarChart(filtered, Math.round(400 - zoom3D * 3.2))} ratio={3 / 4} maxHeight={430} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(201,146,11,0.08)' }}>
            <ZoomOut size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              type="range" min={1} max={100} step={1} value={zoom3D}
              onChange={e => setZoom3D(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--gold-bright)', cursor: 'pointer', height: 22, touchAction: 'none' }}
            />
            <ZoomIn size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          </div>
        </GlassCard>
      </div>

      {/* ── Bubble Chart ── */}
      <GlassCard variant="gold">
        <div className="flex items-center gap-2 mb-2">
          <Circle size={14} style={{ color: 'var(--gold-bright)' }} />
          <h2 className="text-sm font-display font-bold gradient-text-gold">Guild Power Profile — Avg CP vs Members</h2>
        </div>
        <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 8 }}>X = Avg CP · Y = Member count · Bubble size = Chaos rate · Hover a guild name to highlight</div>
        <div className="flex flex-col md:flex-row gap-3">
          {/* Chart */}
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <ChartContainer option={guildBubbleChart(filtered, hoveredGuild)} ratio={9 / 16} maxHeight={380} />
          </div>
          {/* Scrollable guild legend */}
          <div style={{
            width: 'auto', flexShrink: 0,
            background: 'rgba(13,7,24,0.55)',
            border: '1px solid rgba(201,146,11,0.12)',
            borderRadius: 10,
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }} className="w-full md:w-44">
            <div style={{
              padding: '7px 10px 6px',
              borderBottom: '1px solid rgba(201,146,11,0.1)',
              fontSize: 10, fontFamily: 'var(--font-title)', fontWeight: 700,
              color: '#EDE0C4', letterSpacing: '0.05em',
            }}>Guilds</div>
            <div style={{ overflowY: 'auto', maxHeight: 320, padding: '4px 0' }}>
              {filtered.slice(0, 15).map((g, i) => {
                const isHovered = hoveredGuild === i;
                return (
                  <div
                    key={g.name}
                    onMouseEnter={() => setHoveredGuild(i)}
                    onMouseLeave={() => setHoveredGuild(null)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '5px 10px',
                      cursor: 'default',
                      background: isHovered ? 'rgba(201,146,11,0.1)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
                      background: PALETTE[i % PALETTE.length],
                      boxShadow: isHovered ? `0 0 6px ${PALETTE[i % PALETTE.length]}` : 'none',
                      transition: 'box-shadow 0.15s',
                    }} />
                    <span style={{
                      fontSize: 10, color: isHovered ? '#EDE0C4' : 'var(--muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: isHovered ? 700 : 400,
                      transition: 'color 0.15s',
                    }}>{g.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ─── Treemap chart ─────────────────────────────────────────────────────── */
function guildTreemapChart(guilds) {
  if (!guilds.length) return { series: [] };
  const maxAvg = Math.max(...guilds.map(g => g.avgCP), 1);
  const minAvg = Math.min(...guilds.map(g => g.avgCP), 0);
  const range  = maxAvg - minAvg || 1;
  const lerpColor = (t) => {
    // 3-stop: dark navy (#1a2744) → deep amethyst (#6C3483) → gold (#D4A843)
    if (t <= 0.5) {
      const s = t * 2;
      const r = Math.round(26  + (108 - 26)  * s);
      const g = Math.round(39  + (52  - 39)  * s);
      const b = Math.round(68  + (131 - 68)  * s);
      return `rgb(${r},${g},${b})`;
    } else {
      const s = (t - 0.5) * 2;
      const r = Math.round(108 + (212 - 108) * s);
      const g = Math.round(52  + (168 - 52)  * s);
      const b = Math.round(131 + (67  - 131) * s);
      return `rgb(${r},${g},${b})`;
    }
  };
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(13,7,24,0.97)', borderColor: 'rgba(212,168,67,0.32)', borderWidth: 1,
      textStyle: { color: '#E8D9B8', fontSize: 11 },
      formatter: p => `<b style="color:var(--gold-bright)">${p.name}</b><br/>Members: <b>${p.value}</b><br/>Avg CP: ${formatCP(p.data?.avgCP || 0)}`,
    },
    series: [{
      type: 'treemap',
      data: guilds.slice(0, 20).map(g => ({
        name: g.name,
        value: g.memberCount,
        avgCP: g.avgCP,
        itemStyle: { color: lerpColor((g.avgCP - minAvg) / range) },
        label: { color: '#EDE0C4', fontSize: 10, fontFamily: 'Cinzel,serif', overflow: 'truncate' },
      })),
      breadcrumb: { show: false },
      roam: false,
      nodeClick: false,
      label: { show: true, position: 'inside', formatter: '{b}' },
      emphasis: { label: { fontSize: 11, fontWeight: 700 }, itemStyle: { shadowBlur: 13, shadowColor: 'rgba(212,168,67,0.35)' } },
    }],
  };
}

/* ─── 3D bar — guild territory map ─────────────────────────────────────── */
const TRIB_TIERS_3D = ['BI','TI','GA','CI','SI','GI','DL','CK','CE','SM','DG'];
function guild3DBarChart(guilds, distance = 180) {
  if (!guilds.length) return { series: [] };
  const isMobile = window.innerWidth < 640;
  const top8 = guilds.slice(0, 8);
  const truncate = name => isMobile && name.length > 7 ? name.slice(0, 7) + '\u2026' : name;
  const activeTiers = TRIB_TIERS_3D.filter(tier =>
    top8.some(g => Object.entries(g.tribBreakdown).some(([k]) => k.startsWith(tier)))
  );
  const data = [];
  top8.forEach((g, gi) => {
    activeTiers.forEach((tier, ti) => {
      const count = Object.entries(g.tribBreakdown)
        .filter(([k]) => k.startsWith(tier))
        .reduce((s, [, v]) => s + v, 0);
      if (count > 0) data.push({
        value: [gi, ti, count],
        itemStyle: { color: tribColor(tier) || '#4B5563', opacity: 0.88 },
      });
    });
  });
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: TOOLTIP_BG, borderColor: TOOLTIP_BORDER, borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => {
        const guild = top8[p.value[0]]?.name || '';
        const tier  = activeTiers[p.value[1]] || '';
        const color = tribColor(tier) || '#EDE0C4';
        return `<b style="color:${color}">${tier}</b> · <b>${guild}</b><br/>Players: <b>${p.value[2]}</b>`;
      },
    },
    grid3D: {
      boxWidth: isMobile ? 100 : 160, boxHeight: isMobile ? 60 : 80, boxDepth: isMobile ? 80 : 120,
      viewControl: { distance, elevation: 22, azimuth: -30, autoRotate: false },
      environment: 'rgba(0,0,0,0)',
      light: { main: { intensity: 1.1, shadow: false }, ambient: { intensity: 0.35 } },
      axisLine:    { lineStyle: { color: 'rgba(201,146,11,0.22)' } },
      splitLine:   { lineStyle: { color: 'rgba(201,146,11,0.06)' } },
      axisPointer: { lineStyle: { color: 'rgba(212,168,67,0.5)', width: 1 } },
    },
    xAxis3D: {
      type: 'category', data: top8.map(g => truncate(g.name)), name: 'Guild',
      nameTextStyle: { color: CHART_TEXT, fontSize: 9 },
      axisLabel: { color: '#EDE0C4', fontSize: isMobile ? 6 : 7, interval: 0 },
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.2)' } },
    },
    yAxis3D: {
      type: 'category', data: activeTiers, name: 'Tier',
      nameTextStyle: { color: CHART_TEXT, fontSize: 9 },
      axisLabel: { color: '#EDE0C4', fontSize: isMobile ? 7 : 8 },
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.2)' } },
    },
    zAxis3D: {
      type: 'value', name: 'Players',
      nameTextStyle: { color: CHART_TEXT, fontSize: 9 },
      axisLabel: { color: CHART_TEXT, fontSize: isMobile ? 7 : 8 },
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.2)' } },
      splitLine: { lineStyle: { color: 'rgba(201,146,11,0.06)' } },
    },
    series: [{
      type: 'bar3D', data, shading: 'lambert',
      label: { show: false },
      emphasis: { label: { show: false }, itemStyle: { opacity: 1 } },
      barSize: isMobile ? 1 : 1.5,
    }],
  };
}

/* ─── Bubble chart — guild power profile ───────────────────────────────── */
function guildBubbleChart(guilds, hoveredIndex = null) {
  if (!guilds.length) return { series: [] };
  const sliced = guilds.slice(0, 15);
  return {
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: 'rgba(13,7,24,0.97)', borderColor: 'rgba(201,146,11,0.35)', borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 11 },
      formatter: p => {
        const [avgCP, members, chaosRate, name] = p.value;
        return `<b style="color:var(--gold-bright)">${name}</b><br/>Avg CP: <b>${formatCP(avgCP)}</b><br/>Members: ${members}<br/>Chaos Rate: ${(chaosRate * 100).toFixed(1)}%`;
      },
    },
    grid: { left: 56, right: 24, top: 24, bottom: 48 },
    xAxis: {
      name: 'Avg CP', nameTextStyle: { color: '#8B7E6A', fontSize: 9 },
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { color: '#8B7E6A', fontSize: 9, formatter: v => formatCP(v) },
      splitLine: { lineStyle: { color: 'rgba(201,146,11,0.08)', type: 'dashed' } },
    },
    yAxis: {
      name: 'Members', nameTextStyle: { color: '#8B7E6A', fontSize: 9 },
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { color: '#8B7E6A', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(201,146,11,0.08)', type: 'dashed' } },
    },
    series: [{
      type: 'scatter',
      data: sliced.map((g, i) => ({
        value: [g.avgCP, g.memberCount, g.chaosRate, g.name],
        itemStyle: {
          color: PALETTE[i % PALETTE.length],
          opacity: hoveredIndex === null ? 0.82 : (i === hoveredIndex ? 1 : 0.12),
          borderWidth: i === hoveredIndex ? 2 : 0,
          borderColor: '#FFD700',
        },
      })),
      symbolSize: v => Math.max(10, Math.min(48, (v[2] || 0) * 100 + 10)),
      emphasis: { itemStyle: { shadowBlur: 16, shadowColor: 'rgba(212,168,67,0.38)', opacity: 1 } },
      label: { show: false },
    }],
  };
}
