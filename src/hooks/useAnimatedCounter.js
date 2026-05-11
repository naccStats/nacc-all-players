import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const AnimatedCounter = ({ value, duration = 1.2, decimals = 0, suffix = '' }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = 0;
    const end = Number(value) || 0;
    const range = end - start;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const current = start + range * progress;
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <motion.span
      className="stat-value"
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display)}
      {suffix}
    </motion.span>
  );
};
