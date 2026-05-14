import { motion } from 'framer-motion';

const pulse = {
  animate: { opacity: [0.4, 0.8, 0.4] },
  transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
};

/** Single skeleton bar — width/height/borderRadius configurable */
export function SkeletonBar({ width = '100%', height = 12, borderRadius = 6, style = {} }) {
  return (
    <motion.div
      {...pulse}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(201,146,11,0.06) 0%, rgba(201,146,11,0.13) 50%, rgba(201,146,11,0.06) 100%)',
        ...style,
      }}
    />
  );
}

/** Skeleton card — mimics a GlassCard with stacked bars */
export function SkeletonCard({ lines = 3, height = 80, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      style={{
        background: 'rgba(14, 8, 26, 0.72)',
        border: '1px solid rgba(201,146,11,0.12)',
        borderRadius: 12,
        padding: '14px 16px',
        minHeight: height,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar
          key={i}
          width={i === 0 ? '55%' : i === lines - 1 ? '35%' : '80%'}
          height={i === 0 ? 14 : 10}
          style={{ transitionDelay: `${i * 80}ms` }}
        />
      ))}
    </motion.div>
  );
}

/** Skeleton stat card — mimics a StatCard hero tile */
export function SkeletonStatCard({ delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      style={{
        background: 'rgba(14, 8, 26, 0.72)',
        border: '1px solid rgba(201,146,11,0.12)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <SkeletonBar width="50%" height={8} />
      <SkeletonBar width="70%" height={22} borderRadius={4} />
      <SkeletonBar width="40%" height={8} />
    </motion.div>
  );
}

/** Skeleton chart placeholder */
export function SkeletonChart({ height = 240, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      style={{
        background: 'rgba(14, 8, 26, 0.72)',
        border: '1px solid rgba(201,146,11,0.12)',
        borderRadius: 12,
        height,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 16px',
        overflow: 'hidden',
      }}
    >
      <SkeletonBar width="45%" height={12} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 8 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            {...pulse}
            style={{
              flex: 1,
              height: `${30 + Math.sin(i * 0.9) * 25 + Math.cos(i * 1.4) * 20}%`,
              minHeight: 12,
              borderRadius: '4px 4px 0 0',
              background: 'linear-gradient(180deg, rgba(201,146,11,0.18) 0%, rgba(201,146,11,0.05) 100%)',
              transitionDelay: `${i * 40}ms`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/** Skeleton table row */
export function SkeletonTableRows({ rows = 8 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: i * 0.04 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
          }}
        >
          <SkeletonBar width={22} height={22} borderRadius="50%" />
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <SkeletonBar width={`${50 + Math.sin(i) * 20}%`} height={11} />
            <SkeletonBar width="30%" height={8} />
          </div>
          <SkeletonBar width={60} height={11} />
          <SkeletonBar width={70} height={11} />
          <SkeletonBar width={50} height={18} borderRadius={4} />
        </motion.div>
      ))}
    </>
  );
}
