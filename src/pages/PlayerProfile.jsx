import { useContext, useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { tribColor, tribLabel } from '../utils/tribulationSystem';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { SkeletonCard, SkeletonBar, SkeletonStatCard } from '../components/Skeleton';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Zap, Crown, User } from 'lucide-react';

const BEAST_COLORS = { Luohou: '#CB4335', Kunpeng: '#2E9BE5', Diting: '#9B59B6', Anzu: '#1EBD82' };
const TIER_COLORS  = { SS: '#D4A843', S: '#CB4335', A: '#9B59B6', B: '#2E9BE5', C: '#7D7263' };
const TB = { bg: 'rgba(13,7,24,0.97)', bc: 'rgba(201,146,11,0.35)' };
const AXES_6 = ['Heal↑', 'Heal↓', 'FDU', 'FDD', 'Beast↑', 'Beast↓'];

function getTier(pctRank) {
  if (pctRank <= 2)  return 'SS';
  if (pctRank <= 10) return 'S';
  if (pctRank <= 30) return 'A';
  if (pctRank <= 60) return 'B';
  return 'C';
}

export default function PlayerProfile() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const rawPlayers = useContext(PlayerContext);
  const players    = useMemo(() => rawPlayers || [], [rawPlayers]);

  const [topPlayers, setTopPlayers] = useState([]);
  useEffect(() => {
    fetch(`${process.env.PUBLIC_URL}/data/topPlayers.csv`)
      .then(r => r.text())
      .then(text => {
        const result = Papa.parse(text.replace(/^\uFEFF/, ''), {
          header: true, skipEmptyLines: true, dynamicTyping: true,
          transformHeader: h => h.trim(),
        });
        setTopPlayers(result.data || []);
      })
      .catch(() => {});
  }, []);

  const player = useMemo(
    () => players.find(p => String(p.uid) === String(uid)),
    [players, uid]
  );

  const { rank, pctRank, realmAvg } = useMemo(() => {
    if (!players.length) return { rank: null, pctRank: null, realmAvg: {} };
    const sorted = [...players].sort((a, b) => (b.cp || 0) - (a.cp || 0));
    const idx    = sorted.findIndex(p => String(p.uid) === String(uid));
    const rank   = idx + 1;
    const pctRank = (rank / sorted.length) * 100;
    const n = players.length || 1;
    const realmAvg = {
      cp:          players.reduce((s, p) => s + (p.cp || 0), 0) / n,
      fdu:         players.reduce((s, p) => s + (p.fdu || 0), 0) / n,
      fdd:         players.reduce((s, p) => s + (p.fdd || 0), 0) / n,
      totalFinals: players.reduce((s, p) => s + (p.totalFinals || 0), 0) / n,
    };
    return { rank, pctRank, realmAvg };
  }, [players, uid]);

  const topData = useMemo(() => {
    if (!topPlayers.length || !player) return null;
    const num = (row, k) => { const v = Number(row[k]); return isNaN(v) ? 0 : v; };
    const row = topPlayers.find(
      r => String(r.UID) === String(uid) ||
           (r.Player || '').toString().trim() === player.player
    );
    if (!row) return null;
    const vals = [
      num(row, 'Heal Up'), num(row, 'Heal Down'),
      num(row, 'FDU'), num(row, 'FDD'), num(row, 'Beast Up'), num(row, 'Beast Down'),
    ];
    const maxV = Math.max(...vals, 1);
    return {
      normalized: vals.map(v => v / maxV),
      raw: {
        healUp:     num(row, 'Heal Up'),
        healDown:   num(row, 'Heal Down'),
        totalHeal:  num(row, 'Total Heal'),
        beastUp:    num(row, 'Beast Up'),
        beastDown:  num(row, 'Beast Down'),
        totalBeast: num(row, 'Total Beast'),
      },
    };
  }, [topPlayers, player, uid]);

  if (!players.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header skeleton */}
        <GlassCard style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SkeletonBar width={40} height={40} borderRadius="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBar width="40%" height={16} />
            <SkeletonBar width="25%" height={10} />
          </div>
        </GlassCard>
        {/* Stat cards skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} delay={i * 0.05} />)}
        </div>
        {/* Chart skeleton */}
        <SkeletonCard lines={1} height={200} delay={0.2} />
      </div>
    );
  }

  if (!player) {
    return (
      <GlassCard style={{ textAlign: 'center', padding: '40px 20px' }}>
        <User size={32} style={{ color: '#4B5563', margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--cinnabar-bright)', fontSize: 13, marginBottom: 8 }}>
          Cultivator not found.
        </p>
        <button
          onClick={() => navigate('/rankings')}
          style={{ fontSize: 11, color: 'var(--gold-bright)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          ← Back to Rankings
        </button>
      </GlassCard>
    );
  }

  const tc         = tribColor(player.tribulation);
  const tier       = rank ? getTier(pctRank) : 'C';
  const tierColor  = TIER_COLORS[tier];
  const beastColor = BEAST_COLORS[player.chaosBeast] || 'var(--muted)';

  const statBars = [
    { label: 'Combat Power',    val: player.cp          || 0, avg: realmAvg.cp,          fmt: formatCP,         color: '#D4A843' },
    { label: 'Finals Dmg Up',   val: player.fdu         || 0, avg: realmAvg.fdu,         fmt: v => v.toFixed(1), color: '#9B59B6' },
    { label: 'Finals Dmg Down', val: player.fdd         || 0, avg: realmAvg.fdd,         fmt: v => v.toFixed(1), color: '#FF8C42' },
    { label: 'Total Finals',    val: player.totalFinals || 0, avg: realmAvg.totalFinals, fmt: v => v.toFixed(1), color: '#2E9BE5' },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--muted)', fontSize: 11,
          fontFamily: 'var(--font-title)', letterSpacing: '0.08em', padding: 0,
        }}
      >
        <ArrowLeft size={13} /> Back
      </button>

      {/* Hero card */}
      <GlassCard variant="gold">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Name + rank */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 20, fontFamily: 'var(--font-title)', fontWeight: 700, color: '#EDE0C4', lineHeight: 1.2, wordBreak: 'break-word' }}>
                {player.player}
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                {player.guild || 'No Guild'} · UID {player.uid}
              </div>
            </div>
            {rank && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', fontFamily: 'var(--font-title)', textTransform: 'uppercase' }}>Rank</div>
                <div style={{ fontSize: 28, fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--gold-bright)', lineHeight: 1 }}>
                  #{rank}
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>of {players.length}</div>
              </div>
            )}
          </div>

          {/* Badges — row 1: tier + percentile */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{
              padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              fontFamily: 'var(--font-title)', letterSpacing: '0.1em',
              background: `${tierColor}22`, border: `1px solid ${tierColor}66`, color: tierColor,
              boxShadow: `0 0 12px ${tierColor}30`,
            }}>{tier}</span>
            {rank && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, background: 'rgba(201,146,11,0.08)', border: '1px solid rgba(201,146,11,0.25)', color: 'var(--gold-pale)' }}>
                Top {pctRank.toFixed(1)}%
              </span>
            )}
          </div>
          {/* Badges — row 2: tribulation + chaos beast + updated status */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 600,
              background: `${tc}22`, border: `1px solid ${tc}66`, color: tc,
            }}>{tribLabel(player.tribulation) || player.tribulation || '—'}</span>
            {player.hasChaos && player.chaosBeast && (
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 10,
                background: `${beastColor}22`, border: `1px solid ${beastColor}66`, color: beastColor,
              }}>⚡ {player.chaosBeast}</span>
            )}
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 10,
              background: player.updated === 'Y' ? 'rgba(0,232,124,0.08)' : 'rgba(139,126,106,0.08)',
              border: player.updated === 'Y' ? '1px solid rgba(0,232,124,0.3)' : '1px solid rgba(139,126,106,0.2)',
              color: player.updated === 'Y' ? 'var(--jade-bright)' : 'var(--muted)',
            }}>
              {player.updated === 'Y' ? '✓ Updated' : 'Not Updated'}
            </span>
          </div>

          {/* CP hero value */}
          <div style={{ fontSize: 32, fontFamily: 'var(--font-title)', fontWeight: 700, color: 'var(--gold-bright)', textShadow: '0 0 24px rgba(201,146,11,0.4)' }}>
            {formatCP(player.cp)}
            <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8, fontWeight: 400 }}>CP</span>
          </div>
        </div>
      </GlassCard>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stat comparison bars */}
        <GlassCard variant="cyan">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={14} style={{ color: 'var(--azure-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">Stats vs Realm Average</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {statBars.map(({ label, val, avg, fmt, color }) => {
              const maxVal = Math.max(val, avg) * 1.15 || 1;
              const playerPct = (val / maxVal) * 100;
              const avgPct    = (avg / maxVal) * 100;
              const above     = val >= avg;
              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 10, gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--muted)', letterSpacing: '0.06em', fontFamily: 'var(--font-title)', textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
                    <span style={{ color, fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>
                      {fmt(val)}
                      <span style={{ color: above ? 'var(--jade-bright)' : 'var(--cinnabar-bright)', marginLeft: 6, fontSize: 9 }}>
                        {above ? '▲ +' : '▼ '}{(((val - avg) / (avg || 1)) * 100).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 999 }}>
                    {/* avg tick mark — stays within bar bounds */}
                    <div style={{
                      position: 'absolute',
                      left: `${Math.min(avgPct, 97)}%`,
                      top: -3, bottom: -3,
                      width: 2,
                      background: 'rgba(139,126,106,0.75)',
                      transform: 'translateX(-50%)',
                      borderRadius: 1,
                      zIndex: 3,
                      pointerEvents: 'none',
                    }} />
                    <motion.div
                      style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: color, borderRadius: 999 }}
                      initial={{ width: 0 }}
                      animate={{ width: `${playerPct}%` }}
                      transition={{ duration: 0.9, ease: 'easeOut' }}
                    />
                  </div>
                  <div style={{ textAlign: 'right', marginTop: 4, fontSize: 9, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 2, background: 'rgba(139,126,106,0.65)', borderRadius: 1, flexShrink: 0 }} />
                    realm avg {fmt(avg)}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Combat record */}
        <GlassCard variant="purple">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} style={{ color: 'var(--imperial-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">Combat Record</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { label: 'Combat Power',  val: formatCP(player.cp),                              color: '#D4A843' },
              { label: 'Tribulation',   val: player.tribulation || '—',                        color: tc       },
              { label: 'Finals Dmg Up', val: player.fdu != null ? player.fdu.toFixed(1) : '—', color: '#9B59B6' },
              { label: 'Finals Dmg Dn', val: player.fdd != null ? player.fdd.toFixed(1) : '—', color: '#FF8C42' },
              { label: 'Total Finals',  val: player.totalFinals != null ? player.totalFinals.toFixed(1) : '—', color: '#2E9BE5' },
              { label: 'Chaos Beast',   val: player.chaosBeast || 'None',                      color: beastColor },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color, wordBreak: 'break-word' }}>{val}</div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Extended profile from topPlayers.csv */}
      {topData && (
        <GlassCard variant="cyan">
          <div className="flex items-center gap-2 mb-4">
            <Crown size={14} style={{ color: 'var(--azure-bright)' }} />
            <h2 className="text-sm font-display font-bold gradient-text">Extended Combat Profile</h2>
            <span style={{ fontSize: 9, color: 'var(--muted)', marginLeft: 4 }}>(Elite cultivator data)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { label: 'Heal Up',     val: topData.raw.healUp.toFixed(1),     color: '#1EBD82' },
                { label: 'Heal Down',   val: topData.raw.healDown.toFixed(1),   color: '#1EBD82' },
                { label: 'Total Heal',  val: topData.raw.totalHeal.toFixed(1),  color: '#1EBD82' },
                { label: 'Beast Up',    val: topData.raw.beastUp.toFixed(1),    color: '#2E9BE5' },
                { label: 'Beast Down',  val: topData.raw.beastDown.toFixed(1),  color: '#2E9BE5' },
                { label: 'Total Beast', val: topData.raw.totalBeast.toFixed(1), color: '#2E9BE5' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                  <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>
            <ChartContainer option={buildRadar(topData.normalized, formatCP(player.cp))} ratio={1} maxHeight={240} />
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}

function buildRadar(values, cpLabel) {
  return {
    tooltip: {
      trigger: 'item',
      appendToBody: true,
      backgroundColor: TB.bg, borderColor: TB.bc, borderWidth: 1,
      textStyle: { color: '#EDE0C4', fontSize: 10 },
      formatter: p => {
        const vals = p.value || [];
        const lines = AXES_6.map((name, i) => `${name}: <b>${(vals[i] * 100).toFixed(1)}%</b>`).join('<br/>');
        return `<b style="color:var(--gold-bright)">${p.name}</b><br/>CP: <b style="color:#D4A843">${cpLabel}</b><br/>${lines}`;
      },
    },
    radar: {
      indicator: AXES_6.map(name => ({ name, max: 1 })),
      center: ['50%', '50%'],
      radius: '65%',
      axisName: { color: '#8B7E6A', fontSize: 9 },
      splitLine: { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      splitArea: { areaStyle: { color: ['rgba(201,146,11,0.02)', 'transparent'] } },
      axisLine: { lineStyle: { color: 'rgba(201,146,11,0.15)' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        name: 'Combat Profile',
        areaStyle: { color: 'rgba(0,191,255,0.1)' },
        lineStyle: { color: '#2E9BE5', width: 2 },
        itemStyle: { color: '#2E9BE5' },
      }],
    }],
  };
}
