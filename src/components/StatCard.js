import React from 'react';
import GlassCard from './GlassCard';
import { motion } from 'framer-motion';

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

  return (
    <GlassCard variant={color} delay={delay} className="stat-card">
      <div className="stat-card-header" style={{ color: accent, opacity: 0.8 }}>
        {icon}
        <span className="stat-label">{label}</span>
      </div>
      <motion.div
        className={`stat-value${gradient ? ' gradient-text-gold' : ''}`}
        style={gradient ? {} : { color: accent, textShadow: `0 0 18px ${accent}55` }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: delay + 0.1, ease: 'backOut' }}
      >
        {value}
      </motion.div>
      {sub && <div className="stat-sub">{sub}</div>}
    </GlassCard>
  );
};

/* Reusable scroll-style section heading */
export const SectionHeader = ({ icon, label }) => (
  <div className="section-header">
    <div className="section-header-line" />
    <div className="section-header-label">
      {icon}
      {label}
    </div>
    <div className="section-header-line" />
  </div>
);

export default StatCard;
