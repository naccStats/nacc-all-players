import { useContext, useMemo, useState } from 'react';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { tribColor } from '../utils/tribulationSystem';
import { computeGuildStats } from '../utils/statsEngine';
import { bp, rGrid, rValueLabel } from '../utils/chartResponsive';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { FilterSelect } from '../components/FilterBar';
import { motion } from 'framer-motion';
import { Swords, Shield } from 'lucide-react';

const TB = { bg: 'rgba(13,7,24,0.97)', bc: 'rgba(201,146,11,0.35)' };
const CT = '#8B7E6A';
const COLOR_A = '#2E9BE5';
const COLOR_B = '#CB4335';

/* Tribulation tiers in display order (strongest first) */
const TRIB_TIERS = ['DG','SM','CE','CK','DL','GI','SI','CI','TI','GA','BI','VT','T','NS','QR'];

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

    const activeTiers = TRIB_TIERS.filter(t => {
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
        <GlassCard style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 28, color: 'var(--gold-bright)', fontFamily: 'var(--font-deco)', marginBottom: 8 }}>会</div>
          <p style={{ fontSize: 11, color: 'var(--muted)' }}>Select two guilds above to begin the trial.</p>
        </GlassCard>
      )}

      {dataA && dataB && (
        <>
          {/* Verdict banner */}
          {verdict && (
            <GlassCard variant={verdict.winner ? 'gold' : 'default'}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-title)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  Power Verdict
                </div>
                {verdict.winner ? (
                  <>
                    <div style={{ fontSize: 20, fontFamily: 'var(--font-title)', fontWeight: 700, color: verdict.winColor, textShadow: `0 0 20px ${verdict.winColor}55` }}>
                      {verdict.winner} Prevails
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
                      Score {verdict.scoreA} vs {verdict.scoreB} · margin {verdict.diff}
                    </div>
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
