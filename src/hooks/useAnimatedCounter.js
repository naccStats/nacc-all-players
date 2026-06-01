import { useEffect, useState } from 'react';

export const AnimatedCounter = ({ value, duration = 1.2, decimals = 0, suffix = '' }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const end = Number(value) || 0;
    const startTime = performance.now();
    const animate = (now) => {
      const t = Math.min((now - startTime) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - t, 4); // easeOutQuart
      setDisplay(end * ease);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <>
      {decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString()}
      {suffix}
    </>
  );
};
