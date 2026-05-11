import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({
  children,
  className = '',
  variant = 'default',
  delay = 0,
  onClick,
  ...props
}) => {
  const variantClass = variant && variant !== 'default' ? `glass-card--${variant}` : '';
  const interactive = onClick ? 'cursor-pointer' : '';

  return (
    <motion.div
      className={['glass-card', variantClass, interactive, className].filter(Boolean).join(' ')}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: 'easeOut' }}
      whileHover={onClick ? { scale: 1.01, transition: { duration: 0.18 } } : undefined}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
