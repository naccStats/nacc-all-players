import { useContext, useMemo, useState } from 'react';
import { PlayerContext } from '../App';
import { formatCP, formatCPShort } from '../utils/formatters';
import { tribRank, tribColor } from '../utils/tribulationSystem';
import { bp, rGrid, rLabel, rValueLabel, rNameText, CHART_BREAKPOINTS } from '../utils/chartResponsive';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ScatterChart, TrendingUp, Zap, Target, Layers, Calculator, Thermometer, ZoomIn, ZoomOut, Search } from 'lucide-react';
import 'echarts-gl';

const T = { color: '#7D7263' };
const TB = { bg: 'rgba(13,7,24,0.97)', bc: 'rgba(212,168,67,0.32)' };
const SL = { color: 'rgba(212,168,67,0.08)', type: 'dashed' };

const COMPOSITE_TOP_N = 15; // composite score leaderboard
const AUTOCOMPLETE_MAX = 8;  // max autocomplete suggestions

/* 3D scatter camera constants */
const SCATTER3D_BASE_DIST  = 400;
const SCATTER3D_ZOOM_SCALE = 3.2;
const SCATTER3D_ELEVATION  = 20;
const SCATTER3D_AZIMUTH    = -35;

export default function AdvancedStatistics() {
  const rawPlayers = useContext(PlayerContext);
  const [calcCP, setCalcCP] = useState('');
  const [zoom3DScatter, setZoom3DScatter] = useState(() => window.innerWidth < CHART_BREAKPOINTS.sm ? 59 : 75);
  const [scatter3DSearch, setScatter3DSearch] = useState('');
  const [scatter3DDropdownOpen, setScatter3DDropdownOpen] = useState(false);

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
      .map(p => ({ value: [p.totalFinals, p.cp, p.fdu || 0, p.player], trib: p.tribulation, uid: p.uid }));

    // Build tribulation avg CP sorted by correct rank order (DG strongest → BI weakest)
    const tribCP = {};
    for (const p of players) {
      if (!p.tribulation || !p.cp) continue;
      // Group by prefix only (strip trailing digit) e.g. TI1/TI2/TI3 → TI
      const prefix = p.tribulation.replace(/\d+$/, '').toUpperCase();
      if (!tribCP[prefix]) tribCP[prefix] = { sum: 0, count: 0 };
      tribCP[prefix].sum += p.cp;
      tribCP[prefix].count++;
    }
    const tribAvg = Object.entries(tribCP)
      .map(([t, v]) => ({ trib: t, avgCP: v.sum / v.count, count: v.count }))
      .sort((a, b) => tribRank(a.trib) - tribRank(b.trib));

    const chaosCPs = players.filter(p => p.hasChaos && p.cp > 0).map(p => p.cp);
    const noChaosCPs = players.filter(p => !p.hasChaos && p.cp > 0).map(p => p.cp);
    const chaosAvg = chaosCPs.reduce((a, b) => a + b, 0) / (chaosCPs.length || 1);
    const noChaosAvg = noChaosCPs.reduce((a, b) => a + b, 0) / (noChaosCPs.length || 1);

    const fduFdd = players.filter(p => p.fdu > 0 && p.fdd > 0).map(p => [p.fdu, p.fdd, p.player]);

    const scored = players.map(p => {
      const tr = tribRank(p.tribulation) || 0;
      const score = (p.cp || 0) * 0.4 + (p.totalFinals || 0) * 0.3 + ((p.fdu || 0) + (p.fdd || 0)) * 0.15 + tr * 500 * 0.15;
      return { ...p, compositeScore: score };
    }).sort((a, b) => b.compositeScore - a.compositeScore).slice(0, COMPOSITE_TOP_N);

    /* ── Box plot: CP spread per tribulation prefix ── */
    // Derive tiers present in the data, ordered by tribRank descending (strongest first)
    const presentPrefixes = [...new Set(
      players
        .filter(p => p.tribulation)
        .map(p => p.tribulation.replace(/\d+$/, '').toUpperCase())
    )].sort((a, b) => tribRank(b) - tribRank(a));
    const boxData = presentPrefixes.map(tier => {
      const vals = players.filter(p => p.tribulation && p.tribulation.startsWith(tier) && p.cp > 0)
                          .map(p => p.cp).sort((a, b) => a - b);
      if (vals.length === 0) return null;
      const q = (pct) => vals[Math.max(0, Math.floor(pct * (vals.length - 1)))];
      // Single player: degenerate box (flat line at their CP)
      return { tier, count: vals.length, single: vals.length === 1, data: [q(0), q(0.25), q(0.5), q(0.75), q(1)] };
    }).filter(Boolean);

    /* ── Heatmap: FDU vs FDD density ── */
    const fduAll = players.filter(p => p.fdu > 0 && p.fdd > 0).map(p => p.fdu);
    const fddAll = players.filter(p => p.fdu > 0 && p.fdd > 0).map(p => p.fdd);
    const BINS = Math.max(5, Math.min(15, Math.ceil(Math.sqrt(fduAll.length || 25))));
    let heatData = [];
    if (fduAll.length > 0) {
      const minFDU = Math.min(...fduAll), maxFDU = Math.max(...fduAll);
      const minFDD = Math.min(...fddAll), maxFDD = Math.max(...fddAll);
      const fduStep = (maxFDU - minFDU) / BINS || 1;
      const fddStep = (maxFDD - minFDD) / BINS || 1;
      const matrix  = Array.from({ length: BINS }, () => Array(BINS).fill(0));
      players.filter(p => p.fdu > 0 && p.fdd > 0).forEach(p => {
        const xi = Math.min(Math.floor((p.fdu - minFDU) / fduStep), BINS - 1);
        const yi = Math.min(Math.floor((p.fdd - minFDD) / fddStep), BINS - 1);
        matrix[xi][yi]++;
      });
      heatData = matrix.flatMap((row, xi) => row.map((cnt, yi) => [xi, yi, cnt]));
      heatData._minFDU = minFDU; heatData._maxFDU = maxFDU;
      heatData._minFDD = minFDD; heatData._maxFDD = maxFDD;
      heatData._step   = Math.round((maxFDU - minFDU) / BINS);
      heatData._bins   = BINS;
    }

    return { median, q1, q3, mean, scatterData, tribAvg, chaosAvg, noChaosAvg, chaosCount: chaosCPs.length, noChaosCount: noChaosCPs.length, fduFdd, scored, cps, boxData, heatData };
  }, [rawPlayers]);

  /* ── 3D scatter highlight ────────────────────────────────────────────────
   * UID is always unique — exact match wins.
   * Name search is case-insensitive contains; multiple matches are all
   * highlighted so the ambiguity is visible rather than silent.
   */
  const scatter3DHighlights = useMemo(() => {
    const q = scatter3DSearch.trim().toLowerCase();
    if (!q) return new Set();
    const players = rawPlayers || [];
    const uidExact = players.find(p => String(p.uid).toLowerCase() === q);
    if (uidExact) return new Set([uidExact.uid]);
    return new Set(players.filter(p => p.player?.toLowerCase().includes(q)).map(p => p.uid));
  }, [scatter3DSearch, rawPlayers]);

  const scatter3DMatchInfo = useMemo(() => {
    if (!scatter3DSearch.trim()) return null;
    const count = scatter3DHighlights.size;
    if (count === 0) return { status: 'none' };

    const players = rawPlayers || [];
    const matched = [...scatter3DHighlights]
      .map(uid => players.find(p => p.uid === uid))
      .filter(Boolean)
      .sort((a, b) => (b.cp || 0) - (a.cp || 0));

    // Compute each matched player's CP rank across all players.
    const allCPs = [...players.map(p => p.cp || 0)].sort((a, b) => b - a);
    const withRank = matched.map(p => ({
      ...p,
      cpRank: allCPs.findIndex(c => c <= (p.cp || 0)) + 1,
    }));

    return { status: count === 1 ? 'single' : 'multi', players: withRank };
  }, [scatter3DSearch, scatter3DHighlights, rawPlayers]);

  /* Autocomplete suggestions — shown while typing, before a selection is made */
  const scatter3DSuggestions = useMemo(() => {
    const q = scatter3DSearch.trim().toLowerCase();
    if (!q) return [];
    const players = rawPlayers || [];
    // If it's already a UID exact match there's nothing more to suggest
    const uidExact = players.find(p => String(p.uid).toLowerCase() === q);
    if (uidExact) return [];
    return players
      .filter(p => p.player?.toLowerCase().includes(q))
      .sort((a, b) => (b.cp || 0) - (a.cp || 0))
      .slice(0, AUTOCOMPLETE_MAX);
  }, [scatter3DSearch, rawPlayers]);

  /* ── Percentile calculator ────────────────────────────────────────────── */
  const calcResult = useMemo(() => {
    const v = parseFloat(calcCP);
    if (!v || !stats.cps.length) return null;
    const sorted = [...stats.cps].sort((a, b) => a - b);
    const rank = sorted.filter(c => c > v).length + 1;
    const total = sorted.length;
    const pct = ((rank / total) * 100).toFixed(1);
    return { rank, total, pct };
  }, [calcCP, stats.cps]);

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
            <h2 className="text-sm font-display font-bold gradient-text">Finals · CP · FDU — 3D Scatter</h2>
          </div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}>Drag to rotate · Scroll/pinch to zoom · Color = Tribulation tier</div>
          <ChartContainer option={scatter3DChart(stats.scatterData, Math.round(SCATTER3D_BASE_DIST - zoom3DScatter * SCATTER3D_ZOOM_SCALE), scatter3DHighlights)} type="3d" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(46,155,229,0.08)' }}>
            <ZoomOut size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
            <input
              type="range" min={1} max={100} step={1} value={zoom3DScatter}
              onChange={e => setZoom3DScatter(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--azure-bright)', cursor: 'pointer', height: 22, touchAction: 'none' }}
            />
            <ZoomIn size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          </div>
          {/* Player highlight search */}
          <div style={{ position: 'relative', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Search size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
              <input
                type="text"
                value={scatter3DSearch}
                onChange={e => { setScatter3DSearch(e.target.value); setScatter3DDropdownOpen(true); }}
                onFocus={() => setScatter3DDropdownOpen(true)}
                onBlur={() => setTimeout(() => setScatter3DDropdownOpen(false), 150)}
                placeholder="Highlight by UID or player name…"
                style={{
                  flex: 1, padding: '5px 10px', borderRadius: 7,
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(46,155,229,0.2)',
                  color: '#EDE0C4', fontSize: 11, fontFamily: 'monospace', outline: 'none',
                  minWidth: 0,
                }}
              />
              {scatter3DSearch && (
                <button
                  onClick={() => { setScatter3DSearch(''); setScatter3DDropdownOpen(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                  aria-label="Clear search"
                >✕</button>
              )}
            </div>
            {/* Autocomplete dropdown */}
            {scatter3DDropdownOpen && scatter3DSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 18, right: 0, zIndex: 50,
                marginTop: 4, borderRadius: 8, overflow: 'hidden',
                background: 'rgba(10,5,20,0.96)', border: '1px solid rgba(46,155,229,0.25)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}>
                {scatter3DSuggestions.map((p, idx) => (
                  <button
                    key={p.uid}
                    onMouseDown={e => {
                      e.preventDefault();
                      setScatter3DSearch(String(p.uid));
                      setScatter3DDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '7px 10px', background: 'none', border: 'none',
                      borderBottom: idx < scatter3DSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      color: '#EDE0C4', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(46,155,229,0.10)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                  >
                    <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: tribColor(p.tribulation) || 'var(--azure-bright)' }} />
                    <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.player}</span>
                    <span style={{ fontSize: 9, color: 'var(--muted)', flexShrink: 0, marginLeft: 4 }}>{p.tribulation || '—'}</span>
                    <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--azure-bright)', flexShrink: 0, marginLeft: 6 }}>{formatCP(p.cp)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Match info panel */}
          <AnimatePresence>
            {scatter3DMatchInfo?.status === 'none' && (
              <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ fontSize: 9, color: 'var(--cinnabar-bright)', marginTop: 6, paddingLeft: 18 }}>
                No player found
              </motion.div>
            )}
            {scatter3DMatchInfo?.status === 'multi' && (
              <motion.div key="multi" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(46,155,229,0.15)' }}>
                <div style={{ fontSize: 9, color: 'var(--azure-bright)', marginBottom: 6, fontFamily: 'var(--font-title)', letterSpacing: '0.06em' }}>
                  {scatter3DMatchInfo.players.length} PLAYERS MATCHED
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
                  {scatter3DMatchInfo.players.map(p => (
                    <div key={p.uid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', borderRadius: 5, background: 'rgba(255,255,255,0.03)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: 'var(--azure-bright)' }} />
                      <span style={{ fontSize: 10, color: '#EDE0C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.player}</span>
                      <span style={{ fontSize: 9, color: 'var(--muted)', flexShrink: 0 }}>{p.tribulation || '—'}</span>
                      <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--azure-bright)', flexShrink: 0 }}>{formatCP(p.cp)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            {scatter3DMatchInfo?.status === 'single' && (() => {
              const p = scatter3DMatchInfo.players[0];
              if (!p) return null;
              return (
                <motion.div key={p.uid} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                  style={{ marginTop: 8, padding: '10px 12px', borderRadius: 8, background: 'rgba(0,0,0,0.32)', border: '1px solid rgba(212,168,67,0.2)' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontFamily: 'var(--font-title)', fontWeight: 700, color: '#FFD700' }}>{p.player}</span>
                    {p.guild && <span style={{ fontSize: 9, color: 'var(--muted)' }}>{p.guild}</span>}
                    {p.tribulation && (
                      <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: 'var(--imperial-bright)',
                        padding: '1px 6px', borderRadius: 4, background: 'rgba(201,67,169,0.12)', border: '1px solid rgba(201,67,169,0.25)' }}>
                        {p.tribulation}
                      </span>
                    )}
                  </div>
                  {/* Stat grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { label: 'CP',        val: formatCP(p.cp),                         color: 'var(--azure-bright)' },
                      { label: 'CP Rank',   val: `#${p.cpRank}`,                         color: 'var(--gold-bright)' },
                      { label: 'Finals',    val: p.totalFinals ?? '—',                   color: 'var(--imperial-bright)' },
                      { label: 'FDU',       val: p.fdu != null ? p.fdu : '—',            color: 'var(--jade-bright)' },
                      { label: 'FDD',       val: p.fdd != null ? p.fdd : '—',            color: 'var(--jade-bright)' },
                      { label: 'Chaos',     val: p.hasChaos ? 'Yes' : 'No',              color: p.hasChaos ? 'var(--cinnabar-bright)' : 'var(--muted)' },
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <div style={{ fontSize: 8, color: 'var(--muted)', marginBottom: 1, letterSpacing: '0.06em' }}>{label}</div>
                        <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </GlassCard>

        <GlassCard variant="purple">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={15} style={{ color: 'var(--imperial-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">Avg CP by Tribulation Stage</h2>
          </div>
          <ChartContainer option={(w) => tribAvgChart(stats.tribAvg, w)} type="bar" maxHeight={420} />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard variant="red">
          <div className="flex items-center gap-2 mb-2">
            <ScatterChart size={15} style={{ color: 'var(--cinnabar-bright)' }}/>
            <h2 className="text-sm font-display font-bold gradient-text">FDU vs FDD Correlation</h2>
          </div>
          <ChartContainer option={(w) => fduFddChart(stats.fduFdd, w)} type="bar" maxHeight={320} />
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

      {/* ── Box Plot + Heatmap ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard variant="purple">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={14} style={{ color: 'var(--imperial-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">CP Spread by Tribulation Tier</h2>
          </div>
          <ChartContainer option={(w) => boxPlotChart(stats.boxData, w)} type="box" />
        </GlassCard>

        <GlassCard variant="red">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer size={14} style={{ color: 'var(--cinnabar-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">FDU vs FDD Density Heatmap</h2>
          </div>
          <ChartContainer option={(w) => heatmapChart(stats.heatData, w)} type="heatmap" />
        </GlassCard>
      </div>

      {/* ── Percentile Calculator ── */}
      <GlassCard variant="cyan">
        <div className="flex items-center gap-2 mb-3">
          <Calculator size={14} style={{ color: 'var(--azure-bright)' }} />
          <h2 className="text-sm font-display font-bold gradient-text">Percentile Calculator</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="md:flex-row md:items-center">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-title)', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Enter CP - In Billion(s):</span>
            <input
              type="number"
              value={calcCP}
              onChange={e => setCalcCP(e.target.value)}
              placeholder="e.g. 3500"
              style={{
                flex: 1, padding: '7px 12px', borderRadius: 8,
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(201,146,11,0.25)',
                color: '#EDE0C4', fontSize: 12, fontFamily: 'monospace', outline: 'none',
                minWidth: 0,
              }}
            />
          </div>
          {calcResult ? (
            <motion.div
              key={calcCP}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}
            >
              <span style={{ fontSize: 22, fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--gold-bright)', whiteSpace: 'nowrap' }}>
                Rank #{calcResult.rank}
              </span>
              <div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>of {calcResult.total} cultivators</div>
                <div style={{ fontSize: 12, color: 'var(--azure-bright)', fontWeight: 700 }}>Top {calcResult.pct}%</div>
              </div>
            </motion.div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
              Enter a CP value to see where it ranks in the realm.
            </div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

function scatter3DChart(data, distance = 160, highlights = new Set()) {
  if (!data.length) return { series: [] };
  const isMobile = window.innerWidth < CHART_BREAKPOINTS.sm;
  const hasHighlight = highlights.size > 0;
  return {
    tooltip: {
      trigger: 'item', triggerOn: 'mousemove|click',
      backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => {
        const [finals, cp, fdu, player] = p.value;
        return `<b>${player}</b><br/>Finals: ${finals}<br/>CP: ${formatCP(cp)}<br/>FDU: ${fdu || 0}`;
      },
    },
    grid3D: {
      viewControl: { distance, elevation: SCATTER3D_ELEVATION, azimuth: SCATTER3D_AZIMUTH, autoRotate: false },
      environment: 'rgba(0,0,0,0)',
      light: { main: { intensity: 1.2 }, ambient: { intensity: 0.4 } },
      axisLine:    { lineStyle: { color: 'rgba(201,146,11,0.22)' } },
      splitLine:   { lineStyle: { color: 'rgba(201,146,11,0.06)' } },
      axisPointer: { lineStyle: { color: 'rgba(212,168,67,0.5)', width: 1 } },
    },
    xAxis3D: {
      name: isMobile ? 'Finals' : 'Total Finals', nameTextStyle: { ...T, fontSize: isMobile ? 8 : 9 },
      axisLabel: { ...T, fontSize: isMobile ? 7 : 8 },
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.2)' } },
    },
    yAxis3D: {
      name: 'CP', nameTextStyle: { ...T, fontSize: isMobile ? 8 : 9 },
      axisLabel: { ...T, fontSize: isMobile ? 7 : 8, formatter: v => formatCP(v) },
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.2)' } },
    },
    zAxis3D: {
      name: 'FDU', nameTextStyle: { ...T, fontSize: isMobile ? 8 : 9 },
      axisLabel: { ...T, fontSize: isMobile ? 7 : 8 },
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.2)' } },
    },
    series: [{
      type: 'scatter3D',
      data: data.map(d => {
        const isHit = hasHighlight && highlights.has(d.uid);
        const isDimmed = hasHighlight && !isHit;
        return {
          value: d.value,
          name: d.value[3],
          itemStyle: {
            color: isHit ? '#FFD700' : (tribColor(d.trib) || '#4B5563'),
            opacity: isDimmed ? 0.15 : (isHit ? 1 : 0.82),
          },
        };
      }),
      symbolSize: isMobile ? 4 : 5,
      emphasis: { itemStyle: { opacity: 1, shadowBlur: 12, shadowColor: 'rgba(212,168,67,0.38)' } },
    },
    // Highlighted points rendered as a second series on top so they're always
    // visible and get a larger symbol size without affecting the base series.
    ...(hasHighlight ? [{
      type: 'scatter3D',
      data: data.filter(d => highlights.has(d.uid)).map(d => ({
        value: d.value,
        name: d.value[3],
        itemStyle: { color: '#FFD700', opacity: 1 },
      })),
      symbolSize: isMobile ? 10 : 12,
      emphasis: { itemStyle: { opacity: 1, shadowBlur: 20, shadowColor: 'rgba(255,215,0,0.6)' } },
    }] : []),
    ],
  };
}

function tribAvgChart(tribAvg, w = 400) {
  if (!tribAvg.length) return { series: [] };
  const { sm } = bp(w);
  // Sort strongest (highest rank) at top
  const sorted = [...tribAvg].sort((a, b) => b.avgCP - a.avgCP);
  return {
    tooltip: {
      trigger: 'axis', backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      axisPointer: { type: 'shadow' },
      formatter: p => {
        const t = sorted[p[0].dataIndex];
        return `<b style="color:${tribColor(t.trib)}">${t.trib}</b><br/>Avg CP: <b>${formatCP(t.avgCP)}</b><br/>Cultivators: ${t.count}`;
      },
    },
    grid: rGrid(w, { top: 8, right: sm ? 24 : 16, left: 8 }),
    xAxis: {
      type: 'value',
      splitNumber: sm ? 3 : 5,
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { ...rValueLabel(w), formatter: v => formatCPShort(v), hideOverlap: true },
      splitLine: { lineStyle: SL },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: sorted.map(t => t.trib),
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { color: '#EDE0C4', fontSize: sm ? 9 : 10, fontFamily: 'monospace', fontWeight: 700 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(t => t.avgCP),
      barWidth: sm ? 8 : 11,
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: p => tribColor(sorted[p.dataIndex].trib) || '#4B5563',
      },
      label: {
        show: !sm,
        position: 'right',
        formatter: p => formatCPShort(sorted[p.dataIndex].avgCP),
        color: '#7D7263',
        fontSize: 9,
      },
      emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(212,168,67,0.30)' } },
    }],
  };
}

function fduFddChart(data, w = 400) {
  const { sm } = bp(w);
  return {
    tooltip: {
      trigger: 'item', backgroundColor: TB.bg, borderColor: 'rgba(201,34,24,0.35)', borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => `<b>${p.data[2]}</b><br/>FDU: ${p.data[0]}<br/>FDD: ${p.data[1]}`,
    },
    grid: rGrid(w, { top: 16, bottom: sm ? 32 : 24, left: sm ? 24 : 16 }),
    xAxis: {
      name: 'FDU', nameLocation: 'middle', nameGap: sm ? 22 : 26,
      nameTextStyle: { ...rNameText(w), color: '#7D7263' },
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { ...rValueLabel(w), hideOverlap: true },
      splitLine: { lineStyle: SL },
    },
    yAxis: {
      name: 'FDD', nameLocation: 'middle', nameGap: sm ? 32 : 42,
      nameTextStyle: { ...rNameText(w), color: '#7D7263' },
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      axisLabel: { ...rValueLabel(w), hideOverlap: true },
      splitLine: { lineStyle: SL },
    },
    series: [{
      type: 'scatter', data, symbolSize: 5,
      itemStyle: { color: 'rgba(203,67,53,0.55)' },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(203,67,53,0.38)' } },
    }],
  };
}

function boxPlotChart(boxData, w = 400) {
  if (!boxData || !boxData.length) return { series: [] };
  const { pick } = bp(w);
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(13,7,24,0.97)', borderColor: 'rgba(201,146,11,0.35)', borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: params => {
        const p = params[0];
        const entry = boxData[p.dataIndex];
        const tier = entry?.tier || '';
        const [, min, q1, med, q3, max] = p.value;
        const color = tribColor(tier) || '#EDE0C4';
        if (entry?.single) {
          return `<b style="color:${color}">${tier}</b> <span style="color:var(--muted);font-size:9px">(1 player)</span><br/>CP: <b>${formatCP(min)}</b>`;
        }
        return `<b style="color:${color}">${tier}</b> <span style="color:var(--muted);font-size:9px">(${entry?.count} players)</span><br/>
          Max: ${formatCP(max)}<br/>Q3: ${formatCP(q3)}<br/>Median: ${formatCP(med)}<br/>Q1: ${formatCP(q1)}<br/>Min: ${formatCP(min)}`;
      },
    },
    grid: rGrid(w, { bottom: pick(52, 36), right: pick(16, 10) }),
    xAxis: {
      type: 'category',
      data: boxData.map(b => b.tier),
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { color: '#EDE0C4', ...rLabel(w, { rotate: pick(40, 30), interval: 0 }) },
    },
    yAxis: {
      type: 'log',
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { ...rValueLabel(w), formatter: v => formatCP(v) },
      splitLine: { lineStyle: { color: 'rgba(201,146,11,0.08)', type: 'dashed' } },
    },
    series: [{
      type: 'boxplot',
      data: boxData.map(b => b.data),
      itemStyle: {
        color: p => (tribColor(boxData[p.dataIndex]?.tier) || '#4B5563') + '33',
        borderColor: p => tribColor(boxData[p.dataIndex]?.tier) || '#4B5563',
        borderWidth: 1.5,
      },
      emphasis: { itemStyle: { shadowBlur: 11, shadowColor: 'rgba(212,168,67,0.30)' } },
    }],
  };
}

function heatmapChart(heatData, w = 400) {
  if (!heatData || !heatData.length) return { series: [] };
  const { sm, pick } = bp(w);
  const BINS = heatData._bins || 10;
  const minFDU = heatData._minFDU || 0;
  const minFDD = heatData._minFDD || 0;
  const step   = heatData._step || 50;
  const maxCount = Math.max(...heatData.map(d => d[2]), 1);
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(13,7,24,0.97)', borderColor: 'rgba(201,146,11,0.35)', borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => {
        const fduMin = (minFDU + p.value[0] * step).toFixed(0);
        const fddMin = (minFDD + p.value[1] * step).toFixed(0);
        return `FDU ~${fduMin} · FDD ~${fddMin}<br/>Players: <b>${p.value[2]}</b>`;
      },
    },
    visualMap: {
      min: 0, max: maxCount,
      calculable: true,
      orient: 'horizontal', bottom: 0, left: 'center',
      inRange: { color: ['rgba(155,89,182,0.15)', '#9B59B6', '#D4A843'] },
      textStyle: rNameText(w),
      itemWidth: pick(10, 15), itemHeight: pick(80, 120),
    },
    grid: rGrid(w, { bottom: pick(64, 52), left: sm ? 24 : 16 }),
    xAxis: {
      type: 'category',
      data: Array.from({ length: BINS }, (_, i) => `${Math.round(minFDU + i * step)}`),
      name: 'FDU', nameLocation: 'middle', nameGap: sm ? 22 : 26,
      nameTextStyle: { ...rNameText(w), color: '#7D7263' },
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { ...rLabel(w, { rotate: pick(40, 30) }), fontSize: pick(7, 8), hideOverlap: true },
    },
    yAxis: {
      type: 'category',
      data: Array.from({ length: BINS }, (_, i) => `${Math.round(minFDD + i * step)}`),
      name: 'FDD', nameLocation: 'middle', nameGap: sm ? 32 : 42,
      nameTextStyle: { ...rNameText(w), color: '#7D7263' },
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
      axisLabel: { ...rLabel(w, { fontSize: pick(7, 8) }), hideOverlap: true },
    },
    series: [{
      type: 'heatmap',
      data: heatData.filter(d => typeof d[0] === 'number'),
      emphasis: { itemStyle: { shadowBlur: 11, shadowColor: 'rgba(212,168,67,0.30)' } },
    }],
  };
}
