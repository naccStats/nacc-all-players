import { useContext, useMemo } from 'react';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { bp, rGrid, rValueLabel } from '../utils/chartResponsive';
import { TB } from '../utils/chartDefaults';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { motion } from 'framer-motion';
import { PawPrint, Shield, Zap, Users, TrendingUp, TrendingDown } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const BEASTS = ['Luohou', 'Kunpeng', 'Diting', 'Anzu'];

const BEAST_CHARS = { Luohou: '罗', Kunpeng: '鹏', Diting: '谛', Anzu: '祖' };

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
        if (!p.guild) continue;
        const g = p.guild;
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

  /* ── Guild beast armies ─────────────────────────────────────────────── */
  const guildBeastData = useMemo(() => {
    const guilds = {};
    for (const p of players) {
      if (!p.chaosBeast || !BEASTS.includes(p.chaosBeast)) continue;
      if (!p.guild) continue;
      const g = p.guild;
      if (!guilds[g]) guilds[g] = { Luohou: 0, Kunpeng: 0, Diting: 0, Anzu: 0, total: 0 };
      guilds[g][p.chaosBeast]++;
      guilds[g].total++;
    }
    return Object.entries(guilds)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 8)
      .map(([name, counts]) => ({ name, ...counts }));
  }, [players]);

  const guildBeastOption = useMemo(() => {
    if (!guildBeastData.length) return null;
    return (w) => {
      const { pick } = bp(w);
      return {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
          textStyle: { color: '#EDE0C4', fontSize: 11 },
          formatter: params => {
            const d = guildBeastData[params[0].dataIndex];
            return `<b style="color:var(--gold-bright)">${d.name}</b><br/>` +
              params.map(p => `<span style="color:${BEAST_COLORS[p.seriesName]}">■</span> ${p.seriesName}: <b>${p.value}</b>`).join('<br/>');
          },
        },
        grid: { top: 10, bottom: pick(36, 28), left: pick(80, 110), right: pick(16, 24) },
        xAxis: {
          type: 'value',
          axisLabel: { color: '#7D7263', fontSize: 9 },
          axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
          splitLine: { lineStyle: { color: 'rgba(201,146,11,0.06)', type: 'dashed' } },
        },
        yAxis: {
          type: 'category', data: guildBeastData.map(d => d.name),
          axisLabel: { color: '#EDE0C4', fontSize: pick(9, 10) },
          axisLine: { lineStyle: { color: 'rgba(201,146,11,0.1)' } },
        },
        series: BEASTS.map(beast => ({
          name: beast,
          type: 'bar',
          data: guildBeastData.map(d => d[beast] || 0),
          barCategoryGap: '30%',
          itemStyle: { color: BEAST_COLORS[beast], borderRadius: [0, 3, 3, 0] },
          emphasis: { itemStyle: { shadowBlur: 10, shadowColor: BEAST_COLORS[beast] } },
        })),
      };
    };
  }, [guildBeastData]);

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <PageHeader
        title="Chaos Bestiary"
        subtitle="Legendary beast unlock tracker & dominance analytics"
        char="兽"
        accent="var(--cinnabar-bright)"
      />

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
            <GlassCard key={beast} delay={i * 0.03}>
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
                  <div style={{ fontSize: 9, color: above ? 'var(--jade-bright)' : 'var(--cinnabar-bright)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    {above
                      ? <TrendingUp size={10} color="var(--jade-bright)" />
                      : <TrendingDown size={10} color="var(--cinnabar-bright)" />
                    }
                    {above ? '+' : ''}{formatCP(Math.abs(d.cpDelta))} vs no chaos
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
              {d.topGuilds.length > 0 ? d.topGuilds.map(([guild, count]) => {
                const pct = d.count > 0 ? ((count / d.count) * 100).toFixed(0) : 0;
                return (
                  <div key={guild} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4, alignItems: 'center', gap: 4 }}>
                    <span style={{ color: '#EDE0C4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{guild}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 8, padding: '1px 5px', borderRadius: 10,
                        background: `${color}18`, color, border: `1px solid ${color}35`,
                        fontFamily: 'monospace', fontWeight: 700,
                      }}>{pct}%</span>
                      <span style={{ color, fontFamily: 'monospace', fontWeight: 700, fontSize: 10 }}>{count}</span>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>—</div>
              )}

              {/* Beast deco watermark */}
              <span aria-hidden="true" style={{
                position: 'absolute', bottom: 8, right: 10,
                fontFamily: 'var(--font-deco)', fontSize: 54,
                color: `${color}14`,
                pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
              }}>{BEAST_CHARS[beast]}</span>
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

        <GlassCard variant="gold">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} style={{ color: 'var(--jade-bright)' }} />
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

      {/* Guild Beast Armies */}
      {guildBeastOption && (
        <GlassCard variant="red">
          <div className="flex items-center gap-2 mb-2">
            <PawPrint size={14} style={{ color: 'var(--cinnabar-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">Guild Beast Armies</h2>
          </div>
          <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 10 }}>
            Top 8 guilds by chaos beast count — hover for breakdown
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
            {BEASTS.map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: BEAST_COLORS[b] }} />
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>{b}</span>
              </div>
            ))}
          </div>
          <ChartContainer option={guildBeastOption} type="bar" maxHeight={280} />
        </GlassCard>
      )}
    </motion.div>
  );
}
