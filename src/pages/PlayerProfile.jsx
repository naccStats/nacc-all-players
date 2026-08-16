import { useContext, useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { PlayerContext } from '../App';
import { formatCP } from '../utils/formatters';
import { TB } from '../utils/chartDefaults';
import { tribColor, tribLabel, TRIB_PREFIXES } from '../utils/tribulationSystem';
import GlassCard from '../components/GlassCard';
import ChartContainer from '../components/ChartContainer';
import { SectionHeader } from '../components/StatCard';
import { SkeletonCard, SkeletonBar, SkeletonStatCard } from '../components/Skeleton';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Zap, Crown, User } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const BEAST_COLORS = { Luohou: '#CB4335', Kunpeng: '#2E9BE5', Diting: '#9B59B6', Anzu: '#1EBD82' };
const TIER_COLORS  = { SS: '#D4A843', S: '#CB4335', A: '#9B59B6', B: '#2E9BE5', C: '#7D7263' };
const AXES_6 = ['Heal↑', 'Heal↓', 'FDU', 'FDD', 'Beast↑', 'Beast↓'];

/* Divine Lakshana badge — single color/glyph, no per-name breakdown */
const DIVINE_COLOR = '#F4C95D';
const DIVINE_GLYPH = '✨';

const TRIB_BRAND = {
  DG: '神', SM: '霸', CE: '帝', CK: '王', DL: '主',
  GI: '金', SI: '太', CI: '天', TI: '真', GA: '升',
  BI: '体', VT: '虚', T:  '化', NS: '元', QR: '气',
};

function getTribPrefix(t) {
  if (!t) return null;
  const s = String(t).trim().toUpperCase();
  return TRIB_PREFIXES.find(p => s.startsWith(p)) || null;
}

function getTier(pctRank) {
  if (pctRank <= 2)  return 'SS';
  if (pctRank <= 10) return 'S';
  if (pctRank <= 30) return 'A';
  if (pctRank <= 60) return 'B';
  return 'C';
}

const stagger = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.09 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
};

function BannerMountains({ color }) {
  return (
    <svg
      viewBox="0 0 800 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', height: 75 }}
    >
      <path d="M0 100 L90 40 L180 70 L280 15 L380 55 L480 22 L580 58 L700 10 L800 45 L800 100Z"
        fill={`${color}18`} />
      <path d="M0 100 L110 60 L220 85 L340 38 L440 72 L560 42 L680 68 L800 35 L800 100Z"
        fill={`${color}28`} />
      <path d="M0 100 L70 82 L160 93 L260 67 L380 89 L500 64 L620 84 L720 70 L800 80 L800 100Z"
        fill={`${color}42`} />
    </svg>
  );
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
        const result = Papa.parse(text.replace(/^﻿/, ''), {
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
    const sorted  = [...players].sort((a, b) => (b.cp || 0) - (a.cp || 0));
    const idx     = sorted.findIndex(p => String(p.uid) === String(uid));
    const rank    = idx + 1;
    const pctRank = (rank / sorted.length) * 100;
    const n = players.length || 1;
    const realmAvg = {
      cp:          players.reduce((s, p) => s + (p.cp  || 0), 0) / n,
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
    const divineRaw = (row['Has Divine'] || '').toString().trim();
    const hasDivine = divineRaw && divineRaw !== 'N' && divineRaw !== 'NO';
    return {
      normalized: vals.map(v => v / maxV),
      hasDivine,
      divineLakshana: hasDivine ? divineRaw : null,
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

  /* ── Loading skeleton ── */
  if (!players.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <GlassCard style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SkeletonBar width={40} height={40} borderRadius="50%" />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBar width="40%" height={16} />
            <SkeletonBar width="25%" height={10} />
          </div>
        </GlassCard>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonStatCard key={i} delay={i * 0.05} />)}
        </div>
        <SkeletonCard lines={1} height={200} delay={0.2} />
      </div>
    );
  }

  /* ── Not found ── */
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
  const isActive   = player.updated !== 'N' && player.updated !== 'NO' && player.updated !== 'AFK';
  const brandChar  = TRIB_BRAND[getTribPrefix(player.tribulation)] || '仙';

  const statBars = [
    { label: 'Combat Power',    val: player.cp          || 0, avg: realmAvg.cp,          fmt: formatCP,          color: '#D4A843' },
    { label: 'Finals Dmg Up',   val: player.fdu         || 0, avg: realmAvg.fdu,         fmt: v => v.toFixed(1), color: '#9B59B6' },
    { label: 'Finals Dmg Down', val: player.fdd         || 0, avg: realmAvg.fdd,         fmt: v => v.toFixed(1), color: '#FF8C42' },
    { label: 'Total Finals',    val: player.totalFinals || 0, avg: realmAvg.totalFinals, fmt: v => v.toFixed(1), color: '#2E9BE5' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Back button — outside banner so it floats above */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', padding: '0 0 10px 0',
          cursor: 'pointer', color: 'var(--muted)', fontSize: 11,
          fontFamily: 'var(--font-title)', letterSpacing: '0.08em',
        }}
      >
        <ArrowLeft size={13} /> Back
      </button>

      <PageHeader title={player.player} subtitle={`${player.guild || 'No Guild'} · ${player.tribulation || '—'}`} char="仙" accent="var(--gold-bright)" />

      {/* ── Cinematic Hero Banner ── */}
      <div className="profile-hero-banner">
        {/* Layered background */}
        <div
          className="profile-hero-bg"
          style={{
            background: `linear-gradient(135deg, ${tc}32 0%, rgba(6,4,2,0.90) 55%, rgba(6,4,2,0.97) 100%)`,
            borderBottom: `1px solid ${tc}35`,
          }}
        >
          <BannerMountains color={tc} />
          <div
            className="profile-aura"
            style={{ background: `radial-gradient(ellipse 80% 70% at 25% 50%, ${tc}22 0%, transparent 68%)` }}
          />
          {topData?.hasDivine && (
            <div
              className="profile-aura"
              style={{ background: `radial-gradient(ellipse 65% 60% at 75% 40%, ${DIVINE_COLOR}28 0%, transparent 70%)` }}
            />
          )}
        </div>

        {/* Tribulation brand watermark */}
        <span className="profile-tier-brand" style={{ color: tc }}>
          {brandChar}
        </span>

        {/* Banner content */}
        <div className="profile-hero-content">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>

            {/* Left: name + meta + badges + CP */}
            <motion.div
              style={{ flex: 1, minWidth: 0 }}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <div style={{
                fontSize: 'clamp(15px, 3.2vw, 24px)',
                fontFamily: 'var(--font-title)', fontWeight: 700,
                color: tc, lineHeight: 1.15, wordBreak: 'break-word',
                textShadow: `0 0 28px ${tc}55, 0 2px 8px rgba(0,0,0,0.7)`,
                marginBottom: 3,
              }}>
                {player.player}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 8, lineHeight: 1 }}>
                {player.guild || 'No Guild'} · UID {player.uid}
                {player.region ? ` · ${player.region}` : ''}
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                <span style={{
                  padding: '2px 9px', borderRadius: 20, fontSize: 9, fontWeight: 600,
                  background: `${tc}22`, border: `1px solid ${tc}55`, color: tc,
                }}>
                  {tribLabel(player.tribulation) || player.tribulation || '—'}
                </span>
                {player.hasChaos && player.chaosBeast && (
                  <span style={{
                    padding: '2px 9px', borderRadius: 20, fontSize: 9,
                    background: `${beastColor}20`, border: `1px solid ${beastColor}50`, color: beastColor,
                  }}>
                    ⚡ {player.chaosBeast}
                  </span>
                )}
                {topData?.hasDivine && (
                  <span style={{
                    padding: '2px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                    background: `${DIVINE_COLOR}28`, border: `1px solid ${DIVINE_COLOR}70`, color: DIVINE_COLOR,
                    boxShadow: `0 0 10px ${DIVINE_COLOR}45`,
                  }}>
                    {DIVINE_GLYPH} {topData.divineLakshana}
                  </span>
                )}
                <span style={{
                  padding: '2px 9px', borderRadius: 20, fontSize: 9,
                  background: isActive ? 'rgba(0,232,124,0.10)' : 'rgba(139,126,106,0.08)',
                  border: isActive ? '1px solid rgba(0,232,124,0.28)' : '1px solid rgba(139,126,106,0.18)',
                  color: isActive ? 'var(--jade-bright)' : 'var(--muted)',
                }}>
                  {isActive ? '● Active' : '● AFK'}
                </span>
                {rank && (
                  <span style={{
                    padding: '2px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                    background: `${tierColor}18`, border: `1px solid ${tierColor}45`, color: tierColor,
                  }}>
                    Top {pctRank.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* CP */}
              <motion.div
                style={{
                  fontSize: 'clamp(18px, 3.8vw, 28px)',
                  fontFamily: 'var(--font-title)', fontWeight: 700,
                  color: 'var(--gold-bright)',
                  textShadow: '0 0 20px rgba(201,146,11,0.55), 0 2px 6px rgba(0,0,0,0.6)',
                }}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {formatCP(player.cp)}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', marginLeft: 6, fontWeight: 400 }}>CP</span>
              </motion.div>
            </motion.div>

            {/* Right: rank badge */}
            {rank && (
              <motion.div
                style={{
                  flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '8px 14px', borderRadius: 12,
                  background: `${tierColor}18`, border: `1px solid ${tierColor}45`,
                  boxShadow: `0 0 24px ${tierColor}22`,
                  marginBottom: 2,
                }}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <span style={{
                  fontSize: 8, color: tierColor, letterSpacing: '0.10em',
                  fontFamily: 'var(--font-title)', textTransform: 'uppercase', marginBottom: 2,
                }}>Rank</span>
                <span style={{
                  fontSize: 'clamp(18px, 4vw, 26px)',
                  fontFamily: 'var(--font-title)', fontWeight: 900,
                  color: tierColor, lineHeight: 1,
                  textShadow: `0 0 18px ${tierColor}60`,
                }}>
                  #{rank}
                </span>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>
                  of {players.length}
                </span>
                <span style={{
                  marginTop: 5, padding: '2px 8px', borderRadius: 20,
                  fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-title)',
                  background: `${tierColor}28`, color: tierColor,
                  letterSpacing: '0.12em', border: `1px solid ${tierColor}40`,
                }}>
                  {tier}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Content below banner ── */}
      <motion.div className="space-y-4" variants={stagger} initial="hidden" animate="show">

        {/* Stats grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Stat comparison bars */}
          <GlassCard variant="cyan">
            <SectionHeader
              icon={<Shield size={12} style={{ color: 'var(--azure-bright)' }} />}
              label="Stats vs Realm"
              deco="道"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
              {statBars.map(({ label, val, avg, fmt, color }) => {
                const maxVal    = Math.max(val, avg) * 1.15 || 1;
                const playerPct = (val  / maxVal) * 100;
                const avgPct    = (avg  / maxVal) * 100;
                const above     = val >= avg;
                return (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 10, gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ color: 'var(--muted)', letterSpacing: '0.06em', fontFamily: 'var(--font-title)', textTransform: 'uppercase', flexShrink: 0 }}>
                        {label}
                      </span>
                      <span style={{ color, fontFamily: 'monospace', fontWeight: 700, flexShrink: 0 }}>
                        {fmt(val)}
                        <span style={{ color: above ? 'var(--jade-bright)' : 'var(--cinnabar-bright)', marginLeft: 6, fontSize: 9 }}>
                          {above ? '▲ +' : '▼ '}{(((val - avg) / (avg || 1)) * 100).toFixed(1)}%
                        </span>
                      </span>
                    </div>
                    <div style={{ position: 'relative', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 999 }}>
                      {/* Realm avg tick */}
                      <div style={{
                        position: 'absolute', left: `${Math.min(avgPct, 97)}%`,
                        top: -3, bottom: -3, width: 2,
                        background: 'rgba(139,126,106,0.75)',
                        transform: 'translateX(-50%)', borderRadius: 1,
                        zIndex: 3, pointerEvents: 'none',
                      }} />
                      <motion.div
                        style={{
                          position: 'absolute', left: 0, top: 0, height: '100%',
                          background: `linear-gradient(90deg, ${color}aa, ${color})`,
                          borderRadius: 999,
                          boxShadow: `0 0 8px ${color}45`,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${playerPct}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
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
            <SectionHeader
              icon={<Zap size={12} style={{ color: 'var(--imperial-bright)' }} />}
              label="Combat Record"
              deco="战"
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginTop: 12 }}>
              {[
                { label: 'Combat Power',  val: formatCP(player.cp),                                           color: '#D4A843' },
                { label: 'Tribulation',   val: tribLabel(player.tribulation) || player.tribulation || '—',    color: tc       },
                { label: 'Finals Dmg Up', val: player.fdu != null ? player.fdu.toFixed(1) : '—',              color: '#9B59B6' },
                { label: 'Finals Dmg Dn', val: player.fdd != null ? player.fdd.toFixed(1) : '—',              color: '#FF8C42' },
                { label: 'Total Finals',  val: player.totalFinals != null ? player.totalFinals.toFixed(1) : '—', color: '#2E9BE5' },
                { label: 'Chaos Beast',   val: player.chaosBeast || 'None',                                   color: beastColor },
                { label: 'Divine Lakshana', val: topData ? (topData.divineLakshana || 'None') : '—',          color: topData?.hasDivine ? DIVINE_COLOR : 'var(--muted)' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{
                  padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color, wordBreak: 'break-word', textShadow: `0 0 8px ${color}30` }}>
                    {val}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Extended combat profile */}
        {topData && (
          <motion.div variants={fadeUp}>
            <GlassCard variant="cyan">
              <SectionHeader
                icon={<Crown size={12} style={{ color: 'var(--azure-bright)' }} />}
                label="Extended Combat Profile"
                deco="录"
                sub="Elite cultivator data"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginTop: 12 }}>
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
          </motion.div>
        )}

      </motion.div>
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
        const vals  = p.value || [];
        const lines = AXES_6.map((name, i) => `${name}: <b>${(vals[i] * 100).toFixed(1)}%</b>`).join('<br/>');
        return `<b style="color:var(--gold-bright)">${p.name}</b><br/>CP: <b style="color:#D4A843">${cpLabel}</b><br/>${lines}`;
      },
    },
    radar: {
      indicator: AXES_6.map(name => ({ name, max: 1 })),
      center: ['50%', '50%'],
      radius: '65%',
      axisName: { color: '#8B7E6A', fontSize: 9 },
      splitLine:  { lineStyle: { color: 'rgba(201,146,11,0.12)' } },
      splitArea:  { areaStyle: { color: ['rgba(201,146,11,0.02)', 'transparent'] } },
      axisLine:   { lineStyle: { color: 'rgba(201,146,11,0.15)' } },
    },
    series: [{
      type: 'radar',
      data: [{
        value: values,
        name: 'Combat Profile',
        areaStyle: { color: 'rgba(0,191,255,0.10)' },
        lineStyle: { color: '#2E9BE5', width: 2 },
        itemStyle: { color: '#2E9BE5' },
      }],
    }],
  };
}
