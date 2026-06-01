import React from 'react';
import GlassCard from './GlassCard';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '../hooks/useAnimatedCounter';

const accentMap = {
  cyan:   'var(--azure-bright)',
  gold:   'var(--gold-bright)',
  red:    'var(--cinnabar-bright)',
  jade:   'var(--jade-bright)',
  purple: 'var(--imperial-bright)',
  default:'var(--text)',
};

const StatCard = ({ label, value, icon, color = 'cyan', sub, delay = 0, gradient = false }) => {
  const accent = accentMap[color] || accentMap.default;
  const displayValue = typeof value === 'number'
    ? <AnimatedCounter value={value} duration={1.2 + delay * 0.3} />
    : value;

  return (
    <GlassCard variant={color} delay={delay} className="stat-card">
      <div className="stat-card-header">
        {/* Icon with dual-ring spirit halo */}
        <span
          className="stat-icon-halo"
          style={{
            background: `${accent}12`,
            color: accent,
          }}
        >
          {React.cloneElement(icon, { size: 15, color: accent })}
        </span>
        <span className="stat-label">{label}</span>
      </div>

      <motion.div
        className={`stat-value${gradient ? ' shimmer-text' : ''}`}
        style={gradient ? {} : { color: accent }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.60, delay: delay + 0.12, ease: [0.16, 1, 0.3, 1] }}
      >
        {displayValue}
      </motion.div>

      {sub && (
        <motion.div
          className="stat-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: delay + 0.3 }}
        >
          {sub}
        </motion.div>
      )}
    </GlassCard>
  );
};

/* ── Reusable scroll-style section heading ────────────────── */
export const SectionHeader = ({ icon, label, sub, deco }) => (
  <div className="section-header">
    <div className="section-header-line" />
    <div className="section-header-label">
      {icon}
      <span>{label}</span>
      {deco && (
        <span style={{ fontFamily: 'var(--font-deco)', fontSize: 15, color: 'rgba(212,168,67,0.35)', marginLeft: 4 }}>
          {deco}
        </span>
      )}
    </div>
    <div className="section-header-line" />
    {sub && (
      <span style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em', flexShrink: 0 }}>{sub}</span>
    )}
  </div>
);

export default React.memo(StatCard);
