import React from 'react';
import { motion } from 'framer-motion';

const PageHeader = ({ title, subtitle, char, accent = 'var(--gold-bright)' }) => (
  <motion.div
    className="page-header"
    style={{ '--page-accent': accent }}
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
  >
    {/* Giant Chinese watermark behind */}
    {char && (
      <span className="page-header-char" aria-hidden="true">{char}</span>
    )}

    <div className="page-header-content">
      <h1 className="page-header-title">{title}</h1>
      {subtitle && (
        <p className="page-header-subtitle">{subtitle}</p>
      )}
      <div className="page-header-rule" aria-hidden="true" />
    </div>
  </motion.div>
);

export default PageHeader;
