import { useContext, useMemo, useState } from 'react';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { TB } from '../utils/chartDefaults';
import { tribColor, TRIB_PREFIXES } from '../utils/tribulationSystem';
import { computeGuildStats } from '../utils/statsEngine';
import { bp, rGrid, rValueLabel } from '../utils/chartResponsive';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { FilterSelect } from '../components/FilterBar';
import { motion } from 'framer-motion';
import { Swords, Shield } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const CT = '#8B7E6A';
const COLOR_A = '#2E9BE5';
const COLOR_B = '#CB4335';

export default function GuildComparison() {
  const rawPlayers = useContext(PlayerContext);
  const guildStats = useMemo(() => computeGuildStats(rawPlayers || []), [rawPlayers]);
  const guildNames = useMemo(() => guildStats.map(g => g.name), [guildStats]);

  const [guildA, setGuildA] = useState('');
  const [guildB, setGuildB] = useState('');

  const dataA = useMemo(() => guildStats.find(g => g.name === guildA) || null, [guildStats, guildA]);
  const dataB = useMemo(() => guildStats.find(g => g.name === guildB) || null, [guildStats, guildB]);

  const guildOptions = [
    { value: '', label: '— Select Guild —' },
    ...guildNames.map(g => ({ value: g, label: g })),
  ];

  /* ── Population pyramid ─────────────────────────────────────────────── */
  const pyramidOption = useMemo(() => {
    if (!dataA || !dataB) return { series: [] };

    const activeTiers = TRIB_PREFIXES.filter(t => {
      const countA = Object.entries(dataA.tribBreakdown).filter(([k]) => k.startsWith(t)).reduce((s, [, v]) => s + v, 0);
      const countB = Object.entries(dataB.tribBreakdown).filter(([k]) => k.startsWith(t)).reduce((s, [, v]) => s + v, 0);
      return countA > 0 || countB > 0;
    });

    const countsA = activeTiers.map(t =>
      Object.entries(dataA.tribBreakdown).filter(([k]) => k.startsWith(t)).reduce((s, [, v]) => s + v, 0)
    );
    const countsB = activeTiers.map(t =>
      Object.entries(dataB.tribBreakdown).filter(([k]) => k.startsWith(t)).reduce((s, [, v]) => s + v, 0)
    );

    return (w) => {
      const { pick } = bp(w);
      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
          textStyle: { color: '#EDE0C4', fontSize: 10 },
          formatter: params => {
            const tier  = activeTiers[params[0].dataIndex];
            const lines = params.map(p => `<span style="color:${p.color}">${p.seriesName}</span>: <b>${Math.abs(p.value)}</b>`).join('<br/>');
            return `<b style="color:${tribColor(tier) || '#EDE0C4'}">${tier}</b><br/>${lines}`;
          },
        },
        grid: rGrid(w),
        xAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
          axisLabel: { ...rValueLabel(w), formatter: v => Math.abs(v) },
          splitLine: { lineStyle: { color: 'rgba(201,146,11,0.08)', type: 'dashed' } },
        },
        yAxis: {
          type: 'category',
          data: activeTiers,
          axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
          axisLabel: {
            color: (idx) => tribColor(activeTiers[idx]) || '#EDE0C4',
            fontSize: pick(8, 9),
          },
        },
        series: [
          {
            name: dataA.name, type: 'bar',
            data: countsA.map(v => -v),
            barWidth: '55%',
            itemStyle: { color: COLOR_A, borderRadius: [3, 0, 0, 3] },
            label: { show: true, position: 'insideLeft', color: '#EDE0C4', fontSize: pick(7, 8), formatter: p => Math.abs(p.value) || '' },
          },
          {
            name: dataB.name, type: 'bar',
            data: countsB,
            barWidth: '55%',
            itemStyle: { color: COLOR_B, borderRadius: [0, 3, 3, 0] },
            label: { show: true, position: 'insideRight', color: '#EDE0C4', fontSize: pick(7, 8), formatter: p => p.value || '' },
          },
        ],
      };
    };
  }, [dataA, dataB]);

  /* ── Power verdict ──────────────────────────────────────────────────── */
  const verdict = useMemo(() => {
    if (!dataA || !dataB) return null;
    const score = (d, other) => {
      const maxTotalCP = Math.max(d.totalCP, other.totalCP, 1);
      const maxAvgCP   = Math.max(d.avgCP, other.avgCP, 1);
      const maxFinals  = Math.max(d.avgFinals || 0, other.avgFinals || 0, 1);
      return (d.totalCP / maxTotalCP) * 40
           + (d.avgCP / maxAvgCP) * 30
           + ((d.chaosRate || 0)) * 15
           + ((d.avgFinals || 0) / maxFinals) * 15;
    };
    const sA = score(dataA, dataB);
    const sB = score(dataB, dataA);
    const diff = Math.abs(sA - sB).toFixed(1);
    if (sA > sB) return { winner: dataA.name, scoreA: sA.toFixed(1), scoreB: sB.toFixed(1), diff, winColor: COLOR_A };
    if (sB > sA) return { winner: dataB.name, scoreA: sA.toFixed(1), scoreB: sB.toFixed(1), diff, winColor: COLOR_B };
    return { winner: null, scoreA: sA.toFixed(1), scoreB: sB.toFixed(1), diff: '0.0', winColor: CT };
  }, [dataA, dataB]);

  const statRows = [
    { label: 'Total CP',   fmtA: d => formatCP(d.totalCP),                                fmtB: d => formatCP(d.totalCP) },
    { label: 'Avg CP',     fmtA: d => formatCP(d.avgCP),                                  fmtB: d => formatCP(d.avgCP) },
    { label: 'Members',    fmtA: d => d.memberCount,                                       fmtB: d => d.memberCount },
    { label: 'Chaos Rate', fmtA: d => `${((d.chaosRate || 0) * 100).toFixed(1)}%`,        fmtB: d => `${((d.chaosRate || 0) * 100).toFixed(1)}%` },
    { label: 'Avg FDU',    fmtA: d => d.avgFDU?.toFixed(1) ?? '—',                        fmtB: d => d.avgFDU?.toFixed(1) ?? '—' },
    { label: 'Avg FDD',    fmtA: d => d.avgFDD?.toFixed(1) ?? '—',                        fmtB: d => d.avgFDD?.toFixed(1) ?? '—' },
    { label: 'Avg Finals', fmtA: d => d.avgFinals?.toFixed(1) ?? '—',                     fmtB: d => d.avgFinals?.toFixed(1) ?? '—' },
  ];

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Guild Compare"
        subtitle="Side-by-side guild comparison & power analysis"
        char="战"
        accent="var(--jade-bright)"
      />

      {/* Guild selectors */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Swords size={15} style={{ color: 'var(--gold-bright)' }} />
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 14, fontWeight: 700, color: '#EDE0C4', letterSpacing: '0.1em' }}>
            Guild Comparison — Guild Showdown
          </h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} className="md:flex-row md:items-end">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: COLOR_A, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-title)', marginBottom: 4 }}>
              Guild A
            </div>
            <FilterSelect label="" value={guildA} onChange={setGuildA} options={guildOptions} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', fontSize: 20, color: 'var(--gold-bright)', fontFamily: 'var(--font-deco)', paddingBottom: 2 }}>
            戰
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: COLOR_B, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-title)', marginBottom: 4 }}>
              Guild B
            </div>
            <FilterSelect label="" value={guildB} onChange={setGuildB} options={guildOptions} />
          </div>
        </div>
      </GlassCard>

      {(!dataA || !dataB) && (
        <GlassCard style={{ textAlign: 'center', padding: '48px 28px' }}>
          <div style={{ fontSize: 52, color: 'var(--gold-bright)', fontFamily: 'var(--font-deco)', lineHeight: 1, marginBottom: 16, textShadow: '0 0 40px rgba(212,168,67,0.30)' }}>會</div>
          <div style={{ fontSize: 13, fontFamily: 'var(--font-title)', color: '#EDE0C4', letterSpacing: '0.08em', marginBottom: 20 }}>
            The Trial of Factions
          </div>
          {/* Step indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            {[
              { n: '①', label: 'Select Guild A', done: !!dataA },
              { n: '→', label: null, done: false, divider: true },
              { n: '②', label: 'Select Guild B', done: !!dataB },
              { n: '→', label: null, done: false, divider: true },
              { n: '③', label: 'Witness the Verdict', done: false },
            ].map((step, i) =>
              step.divider ? (
                <span key={i} style={{ color: 'rgba(212,168,67,0.25)', fontSize: 12 }}>→</span>
              ) : (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  opacity: step.done ? 1 : 0.55,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', fontSize: 14, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step.done ? 'rgba(212,168,67,0.18)' : 'rgba(255,255,255,0.04)',
                    border: step.done ? '1px solid rgba(212,168,67,0.55)' : '1px solid rgba(255,255,255,0.08)',
                    color: step.done ? 'var(--gold-bright)' : 'var(--muted)',
                    boxShadow: step.done ? '0 0 12px rgba(212,168,67,0.25)' : 'none',
                    fontFamily: 'var(--font-title)',
                  }}>{step.n}</div>
                  <div style={{ fontSize: 9, color: step.done ? 'var(--gold-pale)' : 'var(--muted)', fontFamily: 'var(--font-title)', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {step.label}
                  </div>
                </div>
              )
            )}
          </div>
        </GlassCard>
      )}

      {dataA && dataB && (
        <>
          {/* Verdict banner */}
          {verdict && (
            <GlassCard variant={verdict.winner ? 'gold' : 'default'}>
              <div style={{ textAlign: 'center', paddingTop: 4 }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-title)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>
                  Power Verdict
                </div>
                {verdict.winner ? (
                  <>
                    {/* Winner announcement */}
                    <div style={{ fontSize: 22, fontFamily: 'var(--font-title)', fontWeight: 700, color: verdict.winColor, textShadow: `0 0 28px ${verdict.winColor}55`, marginBottom: 4, letterSpacing: '0.05em' }}>
                      {verdict.winner}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 16, fontFamily: 'var(--font-title)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Prevails · Margin {verdict.diff} pts
                    </div>

                    {/* Side-by-side score display */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: COLOR_A, fontFamily: 'var(--font-title)', letterSpacing: '0.08em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dataA.name}</div>
                        <div style={{ fontSize: 28, fontFamily: 'var(--font-title)', fontWeight: 700, color: COLOR_A, lineHeight: 1, textShadow: `0 0 16px ${COLOR_A}55` }}>{verdict.scoreA}</div>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-deco)', padding: '0 4px' }}>對</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: COLOR_B, fontFamily: 'var(--font-title)', letterSpacing: '0.08em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dataB.name}</div>
                        <div style={{ fontSize: 28, fontFamily: 'var(--font-title)', fontWeight: 700, color: COLOR_B, lineHeight: 1, textShadow: `0 0 16px ${COLOR_B}55` }}>{verdict.scoreB}</div>
                      </div>
                    </div>

                    {/* Score ratio bar */}
                    {(()=>{
                      const total = parseFloat(verdict.scoreA) + parseFloat(verdict.scoreB) || 1;
                      const pctA  = (parseFloat(verdict.scoreA) / total) * 100;
                      return (
                        <div style={{ height: 6, background: `linear-gradient(90deg, ${COLOR_A}30, ${COLOR_B}30)`, borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
                          <motion.div
                            style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: `linear-gradient(90deg, ${COLOR_A}, ${COLOR_A}88)`, borderRadius: 999 }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pctA}%` }}
                            transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
                          />
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div style={{ fontSize: 16, fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--muted)' }}>
                    Equal Power — Deadlock
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Side-by-side stats */}
          <GlassCard>
            {/* Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ textAlign: 'center', fontSize: 13, fontFamily: 'var(--font-title)', fontWeight: 700, color: COLOR_A, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {dataA.name}
              </div>
              <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>vs</div>
              <div style={{ textAlign: 'center', fontSize: 13, fontFamily: 'var(--font-title)', fontWeight: 700, color: COLOR_B, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {dataB.name}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {statRows.map(({ label, fmtA, fmtB }) => {
                const vA = fmtA(dataA);
                const vB = fmtB(dataB);
                return (
                  <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 4, alignItems: 'center' }}>
                    <div style={{ textAlign: 'right', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: COLOR_A }}>{vA}</div>
                    <div style={{ textAlign: 'center', fontSize: 8, color: 'var(--muted)', fontFamily: 'var(--font-title)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                    <div style={{ textAlign: 'left', fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: COLOR_B }}>{vB}</div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Population pyramid */}
          <GlassCard variant="purple">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} style={{ color: 'var(--imperial-bright)' }} />
              <h2 className="text-sm font-display font-bold gradient-text">Tribulation Tier Breakdown</h2>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 9, flexShrink: 0 }}>
                <span style={{ color: COLOR_A }}>← {dataA.name}</span>
                <span style={{ color: COLOR_B }}>{dataB.name} →</span>
              </div>
            </div>
            <ChartContainer option={pyramidOption} ratio={1} maxHeight={380} />
          </GlassCard>
        </>
      )}
    </motion.div>
  );
}
