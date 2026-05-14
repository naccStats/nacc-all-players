import { useContext, useMemo } from 'react';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { bp, rGrid, rValueLabel } from '../utils/chartResponsive';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { motion } from 'framer-motion';
import { PawPrint, Shield, Zap, Users } from 'lucide-react';

const BEASTS = ['Luohou', 'Kunpeng', 'Diting', 'Anzu'];

const BEAST_COLORS = {
  Luohou:  '#CB4335',
  Kunpeng: '#2E9BE5',
  Diting:  '#9B59B6',
  Anzu:    '#1EBD82',
};

const BEAST_DESC = {
  Luohou:  '',
  Diting:  '',
  Kunpeng: '',
  Anzu:    '',
};

const TB = { bg: 'rgba(13,7,24,0.97)', bc: 'rgba(201,146,11,0.35)' };
const CT = '#8B7E6A';

export default function ChaosBestiary() {
  const rawPlayers = useContext(PlayerContext);
  const players    = useMemo(() => rawPlayers || [], [rawPlayers]);

  const beastData = useMemo(() => {
    const nonChaos = players.filter(p => !p.hasChaos);
    const noChaosAvgCP = nonChaos.length
      ? nonChaos.reduce((s, p) => s + (p.cp || 0), 0) / nonChaos.length
      : 0;

    const map = {};
    for (const beast of BEASTS) {
      const owners  = players.filter(p => p.chaosBeast === beast);
      const totalCP = owners.reduce((s, p) => s + (p.cp || 0), 0);
      const avgCP   = owners.length ? totalCP / owners.length : 0;

      const guildMap = {};
      for (const p of owners) {
        const g = p.guild || 'NoGuild';
        guildMap[g] = (guildMap[g] || 0) + 1;
      }
      const topGuilds = Object.entries(guildMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

      map[beast] = {
        count: owners.length,
        pct:   players.length ? (owners.length / players.length) * 100 : 0,
        avgCP,
        totalCP,
        topGuilds,
        cpDelta: avgCP - noChaosAvgCP,
      };
    }
    return { map, noChaosAvgCP };
  }, [players]);

  const totalChaos = BEASTS.reduce((s, b) => s + beastData.map[b].count, 0);

  /* ── Dominance bar chart ─────────────────────────────────────────────── */
  const dominanceOption = useMemo(() => {
    const sorted = [...BEASTS].sort((a, b) => beastData.map[b].totalCP - beastData.map[a].totalCP);
    return (w) => {
      const { pick } = bp(w);
      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
          textStyle: { color: '#EDE0C4', fontSize: 11 },
          formatter: p => {
            const b = sorted[p[0].dataIndex];
            const d = beastData.map[b];
            return `<b style="color:${BEAST_COLORS[b]}">${b}</b><br/>Total CP: <b>${formatCP(d.totalCP)}</b><br/>Owners: ${d.count}`;
          },
        },
        grid: rGrid(w),
        xAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
          axisLabel: { ...rValueLabel(w), formatter: v => formatCP(v) },
          splitLine: { lineStyle: { color: 'rgba(201,146,11,0.08)', type: 'dashed' } },
        },
        yAxis: {
          type: 'category', inverse: true, data: sorted,
          axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
          axisLabel: { color: '#EDE0C4', fontSize: pick(9, 11), fontWeight: 600 },
        },
        series: [{
          type: 'bar',
          data: sorted.map(b => ({ value: beastData.map[b].totalCP, itemStyle: { color: BEAST_COLORS[b] } })),
          barWidth: 22,
          itemStyle: { borderRadius: [0, 6, 6, 0] },
          emphasis: { itemStyle: { shadowBlur: 13 } },
        }],
      };
    };
  }, [beastData]);

  /* ── Popularity donut ────────────────────────────────────────────────── */
  const popularityOption = useMemo(() => {
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
        textStyle: { color: '#EDE0C4', fontSize: 11 },
        formatter: p => `<b style="color:${BEAST_COLORS[p.name]}">${p.name}</b><br/>${p.value} cultivators (${p.percent.toFixed(1)}%)`,
      },
      legend: {
        bottom: 4, left: 'center',
        textStyle: { color: CT, fontSize: 10 },
        itemWidth: 10, itemHeight: 8,
      },
      series: [{
        type: 'pie', radius: ['36%', '70%'], center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 5, borderColor: '#0D0718', borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 11, color: '#EDE0C4', fontWeight: 'bold' },
          itemStyle: { shadowBlur: 14, shadowColor: 'rgba(212,168,67,0.30)' },
        },
        data: BEASTS.map(b => ({
          name: b, value: beastData.map[b].count,
          itemStyle: { color: BEAST_COLORS[b] },
        })),
      }],
    };
  }, [beastData]);

  /* ── Avg CP comparison bar ───────────────────────────────────────────── */
  const avgCPOption = useMemo(() => {
    const labels = [...BEASTS, 'No Chaos'];
    const values = [...BEASTS.map(b => beastData.map[b].avgCP), beastData.noChaosAvgCP];
    const colors = [...BEASTS.map(b => BEAST_COLORS[b]), '#4B5563'];
    return (w) => {
      const { pick } = bp(w);
      return {
        tooltip: {
          trigger: 'axis',
          backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
          textStyle: { color: '#EDE0C4', fontSize: 11 },
          formatter: p => `<b style="color:${colors[p[0].dataIndex]}">${labels[p[0].dataIndex]}</b><br/>Avg CP: <b>${formatCP(p[0].value)}</b>`,
        },
        grid: rGrid(w, { top: 16 }),
        xAxis: {
          type: 'category', data: labels,
          axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
          axisLabel: { color: '#EDE0C4', fontSize: pick(8, 10) },
        },
        yAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
          axisLabel: { ...rValueLabel(w), formatter: v => formatCP(v) },
          splitLine: { lineStyle: { color: 'rgba(201,146,11,0.08)', type: 'dashed' } },
        },
        series: [{
          type: 'bar',
          data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] } })),
          barWidth: '50%',
          emphasis: { itemStyle: { shadowBlur: 13, shadowColor: 'rgba(212,168,67,0.28)' } },
        }],
      };
    };
  }, [beastData]);

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

      {/* Header */}
      <GlassCard variant="gold">
        <div className="flex items-center gap-2 mb-1">
          <PawPrint size={16} style={{ color: 'var(--gold-bright)' }} />
          <h1 style={{ fontFamily: 'var(--font-title)', fontSize: 16, fontWeight: 700, color: '#EDE0C4', letterSpacing: '0.1em' }}>
            Chaotic Beasts Compendium
          </h1>
        </div>
        <p style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.6 }}>
          {totalChaos} cultivators have bonded with an ancient chaos beast
          {players.length ? ` — ${((totalChaos / players.length) * 100).toFixed(1)}% of the realm.` : '.'}
        </p>
      </GlassCard>

      {/* Beast cards — 1 col mobile, 2 cols sm, 4 cols xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {[...BEASTS].sort((a, b) => beastData.map[b].count - beastData.map[a].count).map((beast, i) => {
          const d     = beastData.map[beast];
          const color = BEAST_COLORS[beast];
          const above = d.cpDelta >= 0;
          return (
            <GlassCard key={beast} delay={i * 0.06}>
              {/* Beast name + description */}
              <div style={{ borderBottom: `2px solid ${color}44`, paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 16, fontFamily: 'var(--font-title)', fontWeight: 700, color, marginBottom: 3 }}>{beast}</div>
                <div style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1.5 }}>{BEAST_DESC[beast]}</div>
              </div>

              {/* Stats 2-col */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Bonded</div>
                  <div style={{ fontSize: 20, fontFamily: 'var(--font-title)', fontWeight: 700, color }}>{d.count}</div>
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>{d.pct.toFixed(1)}% of realm</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Avg CP</div>
                  <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color }}>{formatCP(d.avgCP)}</div>
                  <div style={{ fontSize: 9, color: above ? 'var(--jade-bright)' : 'var(--cinnabar-bright)' }}>
                    {above ? '▲ +' : '▼ '}{formatCP(Math.abs(d.cpDelta))} vs no chaos
                  </div>
                </div>
              </div>

              {/* Popularity bar */}
              <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
                <motion.div
                  style={{ height: '100%', background: color, borderRadius: 999 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(d.pct * 4, 100)}%` }}
                  transition={{ duration: 0.9, delay: i * 0.1 }}
                />
              </div>

              {/* Top guilds */}
              <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Guilds</div>
              {d.topGuilds.length > 0 ? d.topGuilds.map(([guild, count]) => (
                <div key={guild} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3, alignItems: 'center' }}>
                  <span style={{ color: '#EDE0C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{guild}</span>
                  <span style={{ color, fontFamily: 'monospace', fontWeight: 700, flexShrink: 0, marginLeft: 4 }}>{count}</span>
                </div>
              )) : (
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>—</div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassCard variant="red">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} style={{ color: 'var(--cinnabar-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">Beast Dominance — Total CP</h2>
          </div>
          <ChartContainer option={dominanceOption} type="bar" maxHeight={260} />
        </GlassCard>

        <GlassCard variant="purple">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} style={{ color: 'var(--imperial-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">Beast Popularity</h2>
          </div>
          <ChartContainer option={popularityOption} type="pie" maxHeight={280} />
        </GlassCard>
      </div>

      {/* Avg CP comparison */}
      <GlassCard variant="cyan">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} style={{ color: 'var(--azure-bright)' }} />
          <h2 className="text-sm font-display font-bold gradient-text">Avg CP by Beast — vs No Chaos</h2>
        </div>
          <ChartContainer option={avgCPOption} type="bar" maxHeight={260} />
      </GlassCard>
    </motion.div>
  );
}
