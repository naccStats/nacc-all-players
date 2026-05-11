import { useContext, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { tribColor, tribLabel } from '../utils/tribulationSystem';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Flame, Users, Zap } from 'lucide-react';

const TB = { bg: 'rgba(13,7,24,0.97)', bc: 'rgba(201,146,11,0.35)' };
const SL = { color: 'rgba(201,146,11,0.08)', type: 'dashed' };
const TX = '#8B7E6A';

export default function VisualInsights() {
  const rawPlayers = useContext(PlayerContext);
  const players = useMemo(() => rawPlayers || [], [rawPlayers]);

  /* ── Load topPlayers.csv for the radar ─────────────────────────────── */
  const [topPlayers, setTopPlayers] = useState([]);
  useEffect(() => {
    const url = `${process.env.PUBLIC_URL}/data/topPlayers.csv`;
    fetch(url)
      .then(r => r.text())
      .then(text => {
        const clean = text.replace(/^\uFEFF/, '');
        const result = Papa.parse(clean, {
          header: true, skipEmptyLines: true,
          dynamicTyping: true, transformHeader: h => h.trim(),
        });
        setTopPlayers(result.data || []);
      })
      .catch(() => setTopPlayers([]));
  }, []);

  /* ── Radar data — top 10 by Total Finals, 7 axes ──────────────────── */
  const radarData = useMemo(() => {
    if (!topPlayers.length) return [];
    const num = (row, k) => { const v = Number(row[k]); return isNaN(v) ? 0 : v; };

    // Top 10 by Total Finals
    const top10 = [...topPlayers]
      .sort((a, b) => num(b, 'Total Finals') - num(a, 'Total Finals'))
      .slice(0, 10);

    const maxOf = k => Math.max(...top10.map(r => num(r, k)), 1);
    const maxCP       = maxOf('CP');
    const maxHealUp   = maxOf('Heal Up');
    const maxHealDown = maxOf('Heal Down');
    const maxFDU      = maxOf('FDU');
    const maxFDD      = maxOf('FDD');
    const maxBeastUp  = maxOf('Beast Up');
    const maxBeastDown= maxOf('Beast Down');

    return top10.map(row => {
      const n = k => num(row, k);
      return {
        name: (row.Player || '').toString().trim(),
        guild: (row.Guild || '').toString().trim(),
        trib: (row.Tribulation || '').toString().trim(),
        hasChaos: (row['Has Chaos'] || '').toString().trim(),
        raw: {
          cp:         n('CP'),
          healUp:     n('Heal Up'),
          healDown:   n('Heal Down'),
          totalHeal:  n('Total Heal'),
          beastUp:    n('Beast Up'),
          beastDown:  n('Beast Down'),
          totalBeast: n('Total Beast'),
          fdu:        n('FDU'),
          fdd:        n('FDD'),
          totalFinals: n('Total Finals'),
        },
        /* 7 normalised axes */
        value: [
          n('CP')         / maxCP,
          n('Heal Up')    / maxHealUp,
          n('Heal Down')  / maxHealDown,
          n('FDU')        / maxFDU,
          n('FDD')        / maxFDD,
          n('Beast Up')   / maxBeastUp,
          n('Beast Down') / maxBeastDown,
        ],
      };
    });
  }, [topPlayers]);

  /* ── Full topPlayers rows for the scrollable table ─────────────────── */
  const topPlayerRows = useMemo(() => {
    if (!topPlayers.length) return [];
    const num = (row, k) => { const v = Number(row[k]); return isNaN(v) ? 0 : v; };
    return [...topPlayers]
      .sort((a, b) => num(b, 'Total Finals') - num(a, 'Total Finals'))
      .map(row => ({
        player:     (row.Player || '').toString().trim(),
        guild:      (row.Guild  || '').toString().trim(),
        trib:       (row.Tribulation || '').toString().trim(),
        hasChaos:   (row['Has Chaos'] || '').toString().trim(),
        cp:         num(row, 'CP'),
        healUp:     num(row, 'Heal Up'),
        healDown:   num(row, 'Heal Down'),
        totalHeal:  num(row, 'Total Heal'),
        beastUp:    num(row, 'Beast Up'),
        beastDown:  num(row, 'Beast Down'),
        totalBeast: num(row, 'Total Beast'),
        fdu:        num(row, 'FDU'),
        fdd:        num(row, 'FDD'),
        totalFinals: num(row, 'Total Finals'),
      }));
  }, [topPlayers]);

  /* ── Insights from main players.csv (guild avg, leaderboard) ──────── */
  const insights = useMemo(() => {
    const top5 = [...players].sort((a, b) => (b.cp || 0) - (a.cp || 0)).slice(0, 5);

    // Guild avg CP top 10
    const guildMap = {};
    for (const p of players) {
      const g = p.guild || 'NoGuild';
      if (!guildMap[g]) guildMap[g] = [];
      guildMap[g].push(p.cp || 0);
    }
    const guildAvgData = Object.entries(guildMap)
      .map(([name, cps]) => ({ name, avg: cps.reduce((s, v) => s + v, 0) / cps.length }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);

    return { top5, guildAvgData };
  }, [players]);

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      {/* SVG Radar */}
      <GlassCard variant="cyan">
        <div className="flex items-center gap-2 mb-3">
          <Radar size={15} style={{ color: 'var(--azure-bright)' }}/>
          <h2 className="text-sm font-display font-bold gradient-text">Top 10 Finals — Combat Attribute Radar</h2>
        </div>
        {radarData.length === 0
          ? <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 12 }}>Loading radar data…</div>
          : <SvgRadar data={radarData} />
        }
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* topPlayers card list */}
        <GlassCard variant="gold">
          <div className="flex items-center gap-2 mb-2">
            <Users size={15} style={{ color: 'var(--gold-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text-gold">Top Cultivators — All Stats</h2>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 360, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topPlayerRows.map((p, i) => {
              const tc = tribColor(p.trib);
              const hasC = p.hasChaos && p.hasChaos !== 'N' && p.hasChaos !== 'NO' && p.hasChaos !== '';
              return (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(201,146,11,0.12)',
                  borderRadius: 8, padding: '8px 10px',
                }}>
                  {/* Row 1: rank + name + trib + chaos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, flexShrink: 0,
                      background: i === 0 ? 'rgba(201,146,11,0.2)' : 'rgba(0,0,0,0.3)',
                      color: i === 0 ? 'var(--gold-bright)' : 'var(--muted)',
                      border: i === 0 ? '1px solid rgba(201,146,11,0.4)' : '1px solid rgba(255,255,255,0.06)',
                    }}>{i + 1}</span>
                    <span style={{ fontWeight: 600, fontSize: 11, color: '#EDE0C4', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.player}</span>
                    <span style={{ fontSize: 9, color: tc, fontWeight: 600, flexShrink: 0 }}>{tribLabel(p.trib) || p.trib}</span>
                    {hasC && <span style={{ fontSize: 9, color: '#FF3B2B', flexShrink: 0 }}>⚡{p.hasChaos}</span>}
                  </div>
                  {/* Row 2: stat grid 4 cols */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px 6px' }}>
                    {[
                      { l: 'CP',      v: formatCP(p.cp),               c: '#C9920B' },
                      { l: 'Finals',  v: p.totalFinals.toFixed(1),     c: '#FF3B2B' },
                      { l: 'FDU',     v: p.fdu.toFixed(1),             c: '#B026FF' },
                      { l: 'FDD',     v: p.fdd.toFixed(1),             c: '#FF8C42' },
                      { l: 'Heal↑',   v: p.healUp.toFixed(1),          c: '#00E87C' },
                      { l: 'Heal↓',   v: p.healDown.toFixed(1),        c: '#00E87C' },
                      { l: 'Beast↑',  v: p.beastUp.toFixed(1),         c: '#00BFFF' },
                      { l: 'Beast↓',  v: p.beastDown.toFixed(1),       c: '#00BFFF' },
                    ].map(({ l, v, c }) => (
                      <div key={l} style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: '0.08em' }}>{l}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: c }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  {/* Row 3: guild */}
                  <div style={{ marginTop: 4, fontSize: 9, color: 'var(--muted)' }}>{p.guild || '—'}</div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Guild avg */}
        <GlassCard variant="purple">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={15} style={{ color: 'var(--imperial-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">Guild Avg CP — Top 10</h2>
          </div>
          <ChartContainer option={guildAvgChart(insights.guildAvgData)} ratio={9/16} maxHeight={320} />
        </GlassCard>
      </div>

      {/* CP leaderboard race */}
      <GlassCard variant="red">
        <div className="flex items-center gap-2 mb-2">
          <Flame size={15} style={{ color: 'var(--cinnabar-bright)' }}/>
          <h2 className="text-sm font-display font-bold gradient-text">CP Leaderboard Race — Top 15</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[...players].sort((a, b) => (b.cp || 0) - (a.cp || 0)).slice(0, 15).map((p, i) => {
            const maxCP = insights.top5[0]?.cp || 1;
            const pct = (p.cp / maxCP) * 100;
            const barColor = i === 0
              ? 'linear-gradient(90deg, #C9920B, #FF3B2B)'
              : i < 3
              ? 'linear-gradient(90deg, #00BFFF, #B026FF)'
              : 'linear-gradient(90deg, rgba(0,191,255,0.3), rgba(0,191,255,0.08))';
            return (
              <div key={p.uid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-title)', flexShrink: 0,
                  background: i === 0 ? 'rgba(201,146,11,0.2)' : i < 3 ? 'rgba(0,191,255,0.1)' : 'rgba(0,0,0,0.3)',
                  color: i === 0 ? 'var(--gold-bright)' : i < 3 ? 'var(--azure-bright)' : 'var(--muted)',
                  border: i < 3 ? '1px solid rgba(201,146,11,0.3)' : '1px solid rgba(255,255,255,0.04)',
                }}>{i + 1}</div>
                <div style={{ width: 120, fontSize: 10, color: '#EDE0C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {p.player}
                </div>
                <div style={{ flex: 1, height: 14, background: 'rgba(255,255,255,0.04)', borderRadius: 999, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <motion.div
                    style={{ height: '100%', background: barColor, borderRadius: 999 }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: i * 0.04, ease: 'easeOut' }}
                  />
                </div>
                <div style={{ width: 54, textAlign: 'right', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, color: i === 0 ? 'var(--gold-bright)' : 'var(--azure-bright)', flexShrink: 0 }}>
                  {formatCP(p.cp)}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pure SVG responsive radar — no ECharts, no squeezing
   ───────────────────────────────────────────────────────────────────────── */
const AXES = ['CP', 'Heal↑', 'Heal↓', 'FDU', 'FDD', 'Beast↑', 'Beast↓'];
const RC = ['#C9920B','#00BFFF','#FF3B2B','#B026FF','#00E87C','#FF8C42','#6B8AFF','#EC4899','#14B8A6','#F59E0B'];
// Per-axis accent colors for radar labels
const AXIS_COLORS = ['#C9920B','#00E87C','#00E87C','#B026FF','#FF8C42','#00BFFF','#00BFFF'];
const SPLITS = 4;

function polarToXY(angle, r) {
  return [r * Math.cos(angle), r * Math.sin(angle)];
}

function SvgRadar({ data }) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState(300);
  const [hovered, setHovered] = useState(null);

  const updateSize = useCallback(() => {
    if (wrapRef.current) {
      // Cap at 520px so it doesn't become enormous on wide screens
      setSize(Math.min(wrapRef.current.offsetWidth, 380));
    }
  }, []);

  useEffect(() => {
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [updateSize]);

  const n = AXES.length;           // 7 — number of axes
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;  // top

  // Axis labels sit just outside the polygon, well inside the SVG viewport
  // We use a larger viewBox coordinate space (size + 2*EXTRA) while rendering
  // the SVG element at exactly `size` pixels. This ensures labels that extend
  // beyond the polygon edge are still within the SVG element — so glass-card's
  // overflow:hidden never clips them.
  const EXTRA = 55;              // extra coordinate space on each side for labels
  const viewBoxSize = size + 2 * EXTRA;
  const cx = viewBoxSize / 2;   // radar center in viewBox coords
  const cy = viewBoxSize / 2;
  const radius = size / 2 - 12; // polygon fills ~the inner `size` zone
  const LABEL_OFFSET = 20;      // label sits this far outside polygon edge

  // Build grid rings
  const gridRings = Array.from({ length: SPLITS }, (_, i) => {
    const r = (radius * (i + 1)) / SPLITS;
    const pts = Array.from({ length: n }, (__, j) => {
      const a = startAngle + j * angleStep;
      const [dx, dy] = polarToXY(a, r);
      return `${cx + dx},${cy + dy}`;
    }).join(' ');
    return pts;
  });

  // Axis endpoints (for axis lines)
  const axisEndpoints = Array.from({ length: n }, (_, j) => {
    const a = startAngle + j * angleStep;
    const [dx, dy] = polarToXY(a, radius);
    return { x: cx + dx, y: cy + dy, angle: a };
  });

  // Build series polygons
  const seriesPolygons = data.map((d, si) => {
    const pts = d.value.map((v, j) => {
      const a = startAngle + j * angleStep;
      const r = (v || 0) * radius;
      const [dx, dy] = polarToXY(a, r);
      return `${cx + dx},${cy + dy}`;
    }).join(' ');
    return { pts, color: RC[si % RC.length], d };
  });

  return (
    <div ref={wrapRef} style={{ width: '100%', position: 'relative' }}>
      <svg width={size} height={size}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        style={{ display: 'block', margin: '0 auto' }}>
        {/* Grid rings */}
        {gridRings.map((pts, i) => (
          <polygon key={i} points={pts}
            fill={i % 2 === 0 ? 'rgba(201,146,11,0.03)' : 'transparent'}
            stroke="rgba(201,146,11,0.14)" strokeWidth={0.8} />
        ))}

        {/* Axis lines */}
        {axisEndpoints.map((ep, j) => (
          <line key={j} x1={cx} y1={cy} x2={ep.x} y2={ep.y}
            stroke="rgba(201,146,11,0.18)" strokeWidth={0.8} />
        ))}

        {/* Axis labels — glow style outside polygon */}
        {axisEndpoints.map((ep, j) => {
          const LR = radius + LABEL_OFFSET;
          const a = ep.angle;
          const [dx, dy] = polarToXY(a, LR);
          const lx = cx + dx;
          const ly = cy + dy;
          const anchor = lx < cx - 2 ? 'end' : lx > cx + 2 ? 'start' : 'middle';
          const axisColor = AXIS_COLORS[j % AXIS_COLORS.length];
          return (
            <text key={j} x={lx} y={ly + 4} textAnchor={anchor}
              fill={axisColor}
              fontSize={Math.max(8, size * 0.032)}
              fontFamily="Cinzel,serif" fontWeight="700"
              style={{ filter: `drop-shadow(0 0 5px ${axisColor}99)` }}>
              {AXES[j]}
            </text>
          );
        })}

        {/* Series polygons — non-hovered dimmed */}
        {seriesPolygons.map(({ pts, color, d }, si) => (
          <polygon key={si} points={pts}
            fill={color} fillOpacity={hovered === null || hovered === si ? 0.13 : 0.03}
            stroke={color} strokeWidth={hovered === si ? 2.5 : 1.2}
            strokeOpacity={hovered === null || hovered === si ? 1 : 0.25}
            style={{ transition: 'fill-opacity 0.2s, stroke-width 0.2s, stroke-opacity 0.2s' }}
          />
        ))}

        {/* Dots on each vertex for hovered series */}
        {hovered !== null && seriesPolygons[hovered]?.d.value.map((v, j) => {
          const a = startAngle + j * angleStep;
          const r = (v || 0) * radius;
          const [dx, dy] = polarToXY(a, r);
          const color = RC[hovered % RC.length];
          return (
            <circle key={j} cx={cx + dx} cy={cy + dy} r={3.5}
              fill={color} stroke="#0D0718" strokeWidth={1.5}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
          );
        })}


      </svg>

      {/* Player legend — hoverable chips below the SVG */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px 10px',
        justifyContent: 'center', marginTop: 14, padding: '0 4px',
      }}>
        {seriesPolygons.map(({ color, d }, si) => {
          const isHov = hovered === si;
          return (
            <div
              key={si}
              onMouseEnter={() => setHovered(si)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: isHov ? `${color}22` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isHov ? color : 'rgba(255,255,255,0.08)'}`,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                boxShadow: isHov ? `0 0 10px ${color}55` : 'none',
                userSelect: 'none',
              }}
            >
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: color,
                boxShadow: isHov ? `0 0 6px ${color}` : 'none',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 11, fontWeight: isHov ? 700 : 400,
                fontFamily: 'Inter,sans-serif',
                color: isHov ? color : 'rgba(237,224,196,0.75)',
                transition: 'color 0.15s, font-weight 0.15s',
              }}>
                {d.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stat detail panel — shown when hovering, rendered below SVG so always visible */}
      <AnimatePresence>
        {hovered !== null && (() => {
          const d = seriesPolygons[hovered].d;
          const color = RC[hovered % RC.length];
          const r = d.raw;
          const hasC = d.hasChaos && d.hasChaos !== 'N' && d.hasChaos !== 'NO' && d.hasChaos !== '';
          return (
            <motion.div
              key={hovered}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              style={{
                marginTop: 12,
                background: 'rgba(8,4,18,0.97)',
                border: `1px solid ${color}55`,
                borderRadius: 10,
                padding: '12px 14px',
                boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 12px ${color}22`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 700, color }}>{d.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                    {d.guild || '—'} · <span style={{ color: tribColor(d.trib) }}>{tribLabel(d.trib) || d.trib}</span>
                    {hasC && <span style={{ color: '#FF3B2B', marginLeft: 6 }}>⚡ {d.hasChaos}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#C9920B' }}>{formatCP(r.cp)}<span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 3 }}>CP</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px 12px' }}>
                {[
                  { l: 'Heal Up',      v: r.healUp.toFixed(1),      c: '#00E87C' },
                  { l: 'Heal Down',    v: r.healDown.toFixed(1),    c: '#00E87C' },
                  { l: 'Total Heal',   v: r.totalHeal.toFixed(1),   c: '#00E87C' },
                  { l: 'Beast Up',     v: r.beastUp.toFixed(1),     c: '#00BFFF' },
                  { l: 'Beast Down',   v: r.beastDown.toFixed(1),   c: '#00BFFF' },
                  { l: 'Total Beast',  v: r.totalBeast.toFixed(1),  c: '#00BFFF' },
                  { l: 'FDU Jade',     v: r.fdu.toFixed(1),         c: '#B026FF' },
                  { l: 'FDD Cinnabar', v: r.fdd.toFixed(1),         c: '#FF8C42' },
                  { l: 'Total Finals', v: r.totalFinals.toFixed(1), c: '#FF3B2B' },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }}>{l}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

function guildAvgChart(data) {
  if (!data.length) return { series: [] };
  return {
    tooltip: {
      trigger: 'axis', backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => `<b>${p[0].name}</b><br/>Avg CP: ${formatCP(p[0].value)}`,
    },
    grid: { left: 110, right: 24, top: 10, bottom: 28 },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { color: TX, fontSize: 9, formatter: v => formatCP(v) },
      splitLine: { lineStyle: SL },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map(d => d.name),
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { color: '#EDE0C4', fontSize: 9, width: 100, overflow: 'truncate' },
    },
    series: [{
      type: 'bar', data: data.map(d => d.avg), barWidth: 10,
      itemStyle: {
        borderRadius: [0, 5, 5, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: 'rgba(176,38,255,0.7)' },
            { offset: 1, color: 'rgba(0,191,255,0.8)' },
          ],
        },
      },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(176,38,255,0.4)' } },
    }],
  };
}
