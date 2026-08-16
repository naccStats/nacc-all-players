import { useContext, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import Papa from 'papaparse';
import { PlayerContext } from '../App';
import { formatCP, normalizeGuild } from '../utils/formatters';
import { TB } from '../utils/chartDefaults';
import { tribColor, tribLabel } from '../utils/tribulationSystem';
import { bp, rGrid, rLabel, rValueLabel, rNameText } from '../utils/chartResponsive';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, Flame, Users, Zap, ScatterChart, BarChart2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const SL = { color: 'rgba(201,146,11,0.08)', type: 'dashed' };

/* Named limits */
const RADAR_TOP_N        = 10;
const LEADERBOARD_TOP_N  = 15;
const GUILD_AVG_TOP_N    = 10;

/* Shared metric color map — used in legend and bar rows */
const METRIC_COLORS = {
  'Heal Up':    '#1EBD82',
  'Heal Down':  '#14B8A6',
  'Beast Up':   '#00BFFF',
  'Beast Down': '#B026FF',
};

/* Divine Lakshana badge — single color/glyph, no per-name breakdown */
const DIVINE_COLOR = '#F4C95D';
const DIVINE_GLYPH = '✨';
const isDivine = v => v && v !== 'N' && v !== 'NO' && v !== '';

export default function VisualInsights() {
  const rawPlayers = useContext(PlayerContext);
  const players = useMemo(() => rawPlayers || [], [rawPlayers]);

  /* ── Load topPlayers.csv for the radar ─────────────────────────────── */
  const [topPlayers, setTopPlayers] = useState([]);
  const [hvRole, setHvRole] = useState(null); // 'Healer' | 'Fighter' | 'Balanced' | null
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
      .slice(0, RADAR_TOP_N);

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
        guild: normalizeGuild(row.Guild),
        trib: (row.Tribulation || '').toString().trim(),
        hasChaos: (row['Has Chaos'] || '').toString().trim(),
        divine: (row['Has Divine'] || '').toString().trim(),
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
        guild:      (() => { const g = (row.Guild || '').toString().trim(); return g.toLowerCase() === 'noguild' ? '' : g; })(),
        trib:       (row.Tribulation || '').toString().trim(),
        hasChaos:   (row['Has Chaos'] || '').toString().trim(),
        divine:     (row['Has Divine'] || '').toString().trim(),
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
      if (!p.guild) continue;
      const g = p.guild;
      if (!guildMap[g]) guildMap[g] = [];
      guildMap[g].push(p.cp || 0);
    }
    const guildAvgData = Object.entries(guildMap)
      .map(([name, cps]) => ({ name, avg: cps.reduce((s, v) => s + v, 0) / cps.length }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, GUILD_AVG_TOP_N);

    return { top5, guildAvgData };
  }, [players]);

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Visual Insights"
        subtitle="Combat attribute radar & cultivation leaderboards"
        char="悟"
        accent="var(--azure-bright)"
      />
      {/* SVG Radar */}
      <GlassCard variant="cyan">
        <div className="flex items-center gap-2 mb-3">
          <Radar size={15} style={{ color: 'var(--azure-bright)' }}/>
          <h2 className="text-sm font-display font-bold gradient-text">{`Top ${RADAR_TOP_N} Finals — Combat Attribute Radar`}</h2>
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
              const hasD = isDivine(p.divine);
              return (
                <div key={i} className="cultivator-row" style={{
                  border: hasD ? `1px solid ${DIVINE_COLOR}55` : '1px solid rgba(201,146,11,0.12)',
                  boxShadow: hasD ? `0 0 12px ${DIVINE_COLOR}30` : 'none',
                  padding: '8px 10px',
                }}>
                  {/* Row 1: rank + name + trib + chaos + divine */}
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
                    {hasC && <span style={{ fontSize: 9, color: '#CB4335', flexShrink: 0 }}>⚡{p.hasChaos}</span>}
                    {hasD && <span style={{ fontSize: 9, color: DIVINE_COLOR, fontWeight: 700, flexShrink: 0, textShadow: `0 0 6px ${DIVINE_COLOR}88` }}>{DIVINE_GLYPH}{p.divine}</span>}
                  </div>
                  {/* Row 2: stat grid 4 cols */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px 6px' }}>
                    {[
                      { l: 'CP',      v: formatCP(p.cp),               c: '#D4A843' },
                      { l: 'Finals',  v: p.totalFinals.toFixed(1),     c: '#CB4335' },
                      { l: 'FDU',     v: p.fdu.toFixed(1),             c: '#9B59B6' },
                      { l: 'FDD',     v: p.fdd.toFixed(1),             c: '#FF8C42' },
                      { l: 'Heal↑',   v: p.healUp.toFixed(1),          c: '#1EBD82' },
                      { l: 'Heal↓',   v: p.healDown.toFixed(1),        c: '#1EBD82' },
                      { l: 'Beast↑',  v: p.beastUp.toFixed(1),         c: '#2E9BE5' },
                      { l: 'Beast↓',  v: p.beastDown.toFixed(1),       c: '#2E9BE5' },
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
            <h2 className="text-sm font-display font-bold gradient-text">{`Guild Avg CP — Top ${GUILD_AVG_TOP_N}`}</h2>
          </div>
          <ChartContainer option={(w) => guildAvgChart(insights.guildAvgData, w)} type="bar" maxHeight={320} />
        </GlassCard>
      </div>

      {/* CP leaderboard race */}
      <GlassCard variant="red">
        <div className="flex items-center gap-2 mb-2">
          <Flame size={15} style={{ color: 'var(--cinnabar-bright)' }}/>
          <h2 className="text-sm font-display font-bold gradient-text">{`CP Leaderboard Race — Top ${LEADERBOARD_TOP_N}`}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[...players].sort((a, b) => (b.cp || 0) - (a.cp || 0)).slice(0, LEADERBOARD_TOP_N).map((p, i) => {
            const maxCP = insights.top5[0]?.cp || 1;
            const pct = (p.cp / maxCP) * 100;
            const barColor = i === 0
              ? 'linear-gradient(90deg, #D4A843, #CB4335)'
              : i === 1
              ? 'linear-gradient(90deg, #B33A2A, #D4813A)'
              : i === 2
              ? 'linear-gradient(90deg, #19A870, #2882C8)'
              : 'linear-gradient(90deg, rgba(0,191,255,0.3), rgba(0,191,255,0.08))';
            return (
              <div key={p.uid} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-title)', flexShrink: 0,
                  background: i === 0 ? 'rgba(201,146,11,0.2)' : i === 1 ? 'rgba(179,58,42,0.2)' : i === 2 ? 'rgba(25,168,112,0.2)' : 'rgba(0,0,0,0.3)',
                  color: i === 0 ? 'var(--gold-bright)' : i === 1 ? 'var(--cinnabar-bright)' : i === 2 ? 'var(--jade-bright)' : 'var(--muted)',
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

      {/* ── Healers vs Fighters + Beast Efficiency (from topPlayers.csv) ── */}
      {topPlayerRows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard variant="cyan">
            <div className="flex items-center gap-2 mb-2">
              <ScatterChart size={14} style={{ color: 'var(--azure-bright)' }} />
              <h2 className="text-sm font-display font-bold gradient-text">Healers vs Fighters</h2>
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}>X = Total Heal · Y = Total Beast · size = CP</div>
            <ChartContainer option={(w) => healerFighterChart(topPlayerRows, hvRole, w)} type="scatter" maxHeight={260} />
            {/* Role legend */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(46,155,229,0.1)', flexWrap: 'wrap' }}>
              {ROLE_ORDER.map(role => {
                const color = ROLE_COLOR[role];
                const isActive = hvRole === role;
                return (
                  <button
                    key={role}
                    onMouseEnter={() => setHvRole(role)}
                    onMouseLeave={() => setHvRole(null)}
                    onClick={() => setHvRole(isActive ? null : role)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 12px 4px 8px', borderRadius: 20,
                      background: isActive ? `${color}20` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.08)'}`,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: color,
                      boxShadow: isActive ? `0 0 10px ${color}` : 'none',
                      transition: 'box-shadow 0.15s',
                      flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: 10, fontFamily: 'var(--font-title)',
                      color: isActive ? color : 'var(--muted)',
                      fontWeight: isActive ? 700 : 400,
                      letterSpacing: '0.05em',
                      transition: 'color 0.15s',
                    }}>{role}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard variant="gold">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 size={14} style={{ color: 'var(--gold-bright)' }} />
              <h2 className="text-sm font-display font-bold gradient-text-gold">Heal &amp; Beast Efficiency</h2>
            </div>
            {/* Legend row */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              {Object.entries(METRIC_COLORS).map(([label, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: 'var(--muted)' }}>{label}</span>
                </div>
              ))}
            </div>
            {/* Player rows */}
            {(() => {
              const sorted = [...topPlayerRows].sort((a, b) => (b.totalHeal + b.totalBeast) - (a.totalHeal + a.totalBeast));
              const maxHU = Math.max(...sorted.map(r => r.healUp),  1);
              const maxHD = Math.max(...sorted.map(r => r.healDown), 1);
              const maxBU = Math.max(...sorted.map(r => r.beastUp),  1);
              const maxBD = Math.max(...sorted.map(r => r.beastDown),1);
              const metrics = [
                { key: 'healUp',    max: maxHU, color: METRIC_COLORS['Heal Up'] },
                { key: 'healDown',  max: maxHD, color: METRIC_COLORS['Heal Down'] },
                { key: 'beastUp',   max: maxBU, color: METRIC_COLORS['Beast Up'] },
                { key: 'beastDown', max: maxBD, color: METRIC_COLORS['Beast Down'] },
              ];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                  {sorted.map((p, i) => (
                    <div key={p.player} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '7px 10px', borderRadius: 8,
                      background: i === 0 ? 'rgba(201,146,11,0.07)' : 'rgba(5,0,15,0.35)',
                      border: `1px solid ${i === 0 ? 'rgba(201,146,11,0.2)' : 'rgba(255,255,255,0.04)'}`,
                    }}>
                      {/* Rank + name */}
                      <div style={{ width: 16, textAlign: 'right', fontSize: 9, color: 'var(--muted)', flexShrink: 0, fontFamily: 'monospace' }}>
                        {i + 1}
                      </div>
                      <div style={{ width: 76, flexShrink: 0, fontSize: 10, color: '#EDE0C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: i === 0 ? 700 : 400 }}>
                        {p.player}
                      </div>
                      {/* 4 metric bars */}
                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', minWidth: 0 }}>
                        {metrics.map(({ key, max, color }) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                            <div style={{ flex: 1, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', minWidth: 0 }}>
                              <div style={{
                                height: '100%', borderRadius: 999,
                                width: `${Math.round((p[key] / max) * 100)}%`,
                                background: color,
                                boxShadow: `0 0 4px ${color}88`,
                              }} />
                            </div>
                            <span style={{ fontSize: 8, color, fontFamily: 'monospace', flexShrink: 0, minWidth: 24, textAlign: 'right' }}>
                              {p[key].toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </GlassCard>
        </div>

      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pure SVG responsive radar — no ECharts, no squeezing
   ───────────────────────────────────────────────────────────────────────── */
const AXES = ['CP', 'Heal↑', 'Heal↓', 'FDU', 'FDD', 'Beast↑', 'Beast↓'];
const RC = ['#D4A843','#2E9BE5','#CB4335','#9B59B6','#1EBD82','#D4813A','#5D7FC2','#B03A8E','#17A272','#E8C46A'];
// Per-axis accent colors for radar labels
const AXIS_COLORS = ['#D4A843','#1EBD82','#1EBD82','#9B59B6','#D4813A','#2E9BE5','#2E9BE5'];
const SPLITS = 4;

function polarToXY(angle, r) {
  return [r * Math.cos(angle), r * Math.sin(angle)];
}

function SvgRadar({ data }) {
  const wrapRef = useRef(null);
  const chipRefs = useRef([]);
  const [size, setSize] = useState(300);
  const [hovered, setHovered] = useState(null);
  const [popoverPos, setPopoverPos] = useState(null);

  const POPOVER_W = 284;
  const POPOVER_H = 160;

  const calcPos = useCallback((rect) => {
    if (window.innerWidth < 640) return { mobile: true };
    const spaceBelow = window.innerHeight - rect.bottom;
    const above = spaceBelow < POPOVER_H + 10;
    const top = above ? rect.top - POPOVER_H - 8 : rect.bottom + 6;
    const idealLeft = rect.left + rect.width / 2 - POPOVER_W / 2;
    const left = Math.max(8, Math.min(idealLeft, window.innerWidth - POPOVER_W - 8));
    return { top, left, mobile: false };
  }, []);

  const openPopover = useCallback((si) => {
    const el = chipRefs.current[si];
    if (!el) return;
    setHovered(si);
    setPopoverPos(calcPos(el.getBoundingClientRect()));
  }, [calcPos]);

  const closePopover = useCallback(() => {
    setHovered(null);
    setPopoverPos(null);
  }, []);

  const updateSize = useCallback(() => {
    if (wrapRef.current) {
      // Cap at 520px so it doesn't become enormous on wide screens
      setSize(Math.min(wrapRef.current.offsetWidth, 650));
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

      {/* Player legend — hoverable chips, popover rendered via portal */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '6px 10px',
        justifyContent: 'center', marginTop: 14, padding: '0 4px',
      }}>
        {seriesPolygons.map(({ color, d }, si) => {
          const isHov = hovered === si;
          return (
            <div
              key={si}
              ref={el => { chipRefs.current[si] = el; }}
              onMouseEnter={() => openPopover(si)}
              onMouseLeave={closePopover}
              onClick={() => {
                if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 640) {
                  hovered === si ? closePopover() : openPopover(si);
                }
              }}
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

      {/* Portal popover — fixed-positioned, never clipped by any parent */}
      {ReactDOM.createPortal(
        <AnimatePresence>
          {hovered !== null && popoverPos && (() => {
            const d = seriesPolygons[hovered].d;
            const color = RC[hovered % RC.length];
            const raw = d.raw;
            const hasC = d.hasChaos && d.hasChaos !== 'N' && d.hasChaos !== 'NO' && d.hasChaos !== '';
            const hasD = isDivine(d.divine);
            const isMobile = popoverPos.mobile;
            return (
              <motion.div
                key={hovered}
                initial={{ opacity: 0, y: isMobile ? 16 : 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: isMobile ? 16 : 6 }}
                transition={{ duration: 0.16 }}
                style={isMobile ? {
                  position: 'fixed',
                  bottom: 16, left: 8, right: 8,
                  zIndex: 9999,
                  background: 'rgba(8,4,18,0.97)',
                  border: hasD ? `1px solid ${DIVINE_COLOR}70` : `1px solid ${color}55`,
                  borderRadius: 12,
                  padding: '14px 16px',
                  boxShadow: hasD ? `0 -4px 32px rgba(0,0,0,0.7), 0 0 16px ${color}22, 0 0 18px ${DIVINE_COLOR}40` : `0 -4px 32px rgba(0,0,0,0.7), 0 0 16px ${color}22`,
                } : {
                  position: 'fixed',
                  top: popoverPos.top,
                  left: popoverPos.left,
                  width: POPOVER_W,
                  zIndex: 9999,
                  background: 'rgba(8,4,18,0.97)',
                  border: hasD ? `1px solid ${DIVINE_COLOR}70` : `1px solid ${color}55`,
                  borderRadius: 10,
                  padding: '11px 13px',
                  boxShadow: hasD ? `0 8px 32px rgba(0,0,0,0.7), 0 0 14px ${color}22, 0 0 16px ${DIVINE_COLOR}40` : `0 8px 32px rgba(0,0,0,0.7), 0 0 14px ${color}22`,
                  pointerEvents: 'none',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 9 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: 13, fontWeight: 700, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                      {d.guild || '—'} · <span style={{ color: tribColor(d.trib) }}>{tribLabel(d.trib) || d.trib}</span>
                      {hasC && <span style={{ color: '#CB4335', marginLeft: 5, whiteSpace: 'nowrap' }}>⚡ {d.hasChaos}</span>}
                      {hasD && <span style={{ color: DIVINE_COLOR, marginLeft: 5, fontWeight: 700, whiteSpace: 'nowrap', textShadow: `0 0 6px ${DIVINE_COLOR}88` }}>{DIVINE_GLYPH} {d.divine}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#D4A843', flexShrink: 0, marginLeft: 8 }}>
                    {formatCP(raw.cp)}<span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 3 }}>CP</span>
                  </div>
                </div>
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px 10px' }}>
                  {[
                    { l: 'Heal Up',      v: raw.healUp.toFixed(1),      c: '#1EBD82' },
                    { l: 'Heal Down',    v: raw.healDown.toFixed(1),    c: '#1EBD82' },
                    { l: 'Total Heal',   v: raw.totalHeal.toFixed(1),   c: '#1EBD82' },
                    { l: 'Beast Up',     v: raw.beastUp.toFixed(1),     c: '#2E9BE5' },
                    { l: 'Beast Down',   v: raw.beastDown.toFixed(1),   c: '#2E9BE5' },
                    { l: 'Total Beast',  v: raw.totalBeast.toFixed(1),  c: '#2E9BE5' },
                    { l: 'FDU',          v: raw.fdu.toFixed(1),         c: '#9B59B6' },
                    { l: 'FDD',          v: raw.fdd.toFixed(1),         c: '#D4813A' },
                    { l: 'Total Finals', v: raw.totalFinals.toFixed(1), c: '#CB4335' },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span style={{ fontSize: 8, color: 'var(--muted)', letterSpacing: '0.06em' }}>{l}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function guildAvgChart(data, w = 400) {
  if (!data.length) return { series: [] };
  const { pick } = bp(w);
  return {
    tooltip: {
      trigger: 'axis', backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => `<b>${p[0].name}</b><br/>Avg CP: ${formatCP(p[0].value)}`,
    },
    grid: rGrid(w, { top: 10 }),
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { ...rValueLabel(w), formatter: v => formatCP(v) },
      splitLine: { lineStyle: SL },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: data.map(d => d.name),
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { color: '#EDE0C4', ...rLabel(w, { width: pick(70, 90) }) },
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

/* ─── Healers vs Fighters scatter ────────────────────────────────────────── */
const ROLE_COLOR = { Healer: '#1EBD82', Balanced: '#D4A843', Fighter: '#CB4335' };
const ROLE_ORDER = ['Healer', 'Balanced', 'Fighter'];

function getRole(totalHeal, totalBeast) {
  const ratio = totalHeal + totalBeast > 0 ? totalHeal / (totalHeal + totalBeast) : 0.5;
  return ratio > 0.53 ? 'Healer' : ratio < 0.47 ? 'Fighter' : 'Balanced';
}

function healerFighterChart(rows, hlRole = null, w = 400) {
  if (!rows.length) return { series: [] };
  const maxCP = Math.max(...rows.map(r => r.cp), 1);
  const hasHl = !!hlRole;
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(13,7,24,0.97)', borderColor: 'rgba(201,146,11,0.35)', borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => {
        const [totalHeal, totalBeast, name, guild, cp] = p.value;
        const role = getRole(totalHeal, totalBeast);
        return `<b>${name}</b><br/>${guild}<br/>Heal: ${totalHeal.toFixed(1)} · Beast: ${totalBeast.toFixed(1)}<br/>Role: <b style="color:${ROLE_COLOR[role]}">${role}</b><br/>CP: ${formatCP(cp)}`;
      },
    },
    grid: rGrid(w, { top: 24, bottom: bp(w).sm ? 32 : 24, left: bp(w).sm ? 24 : 16 }),
    xAxis: {
      name: 'Total Heal',
      nameLocation: 'middle',
      nameGap: bp(w).sm ? 22 : 26,
      nameTextStyle: { ...rNameText(w), color: '#7D7263' },
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { ...rValueLabel(w), hideOverlap: true },
      splitLine: { lineStyle: { color: 'rgba(201,146,11,0.08)', type: 'dashed' } },
    },
    yAxis: {
      name: 'Total Beast',
      nameLocation: 'middle',
      nameGap: bp(w).sm ? 32 : 42,
      nameTextStyle: { ...rNameText(w), color: '#7D7263' },
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { ...rValueLabel(w), hideOverlap: true },
      splitLine: { lineStyle: { color: 'rgba(201,146,11,0.08)', type: 'dashed' } },
    },
    // Split into 3 series (one per role) so shadowBlur/opacity are plain values — callbacks don't work for shadow props in ECharts
    series: ROLE_ORDER.map(role => {
      const color   = ROLE_COLOR[role];
      const isHl    = hasHl && role === hlRole;
      const opacity = !hasHl ? 0.85 : (isHl ? 1 : 0.07);
      return {
        name: role,
        type: 'scatter',
        selectedMode: false,
        data: rows
          .filter(r => getRole(r.totalHeal, r.totalBeast) === role)
          .map(r => [r.totalHeal, r.totalBeast, r.player, r.guild, r.cp]),
        symbolSize: v => Math.max(7, Math.min(22, (v[4] / maxCP) * 24 + 5)),
        itemStyle: {
          color,
          opacity,
          shadowBlur:  isHl ? 22 : 0,
          shadowColor: color,
        },
        emphasis: {
          disabled: false,
          itemStyle: { shadowBlur: 18, shadowColor: color, opacity: 1 },
        },
      };
    }),
  };
}

