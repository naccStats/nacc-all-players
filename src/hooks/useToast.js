import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * useToast — lightweight toast system, no external dependencies.
 *
 * Usage:
 *   const { toast, ToastContainer } = useToast();
 *   toast('Export complete — 312 records', 'jade');   // variants: jade | gold | red | azure
 *   return <><YourContent /><ToastContainer /></>;
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback((message, variant = 'gold', duration = 3000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const VARIANT_STYLES = {
    gold:  { color: 'var(--gold-bright)',     border: 'rgba(201,146,11,0.4)',   bg: 'rgba(201,146,11,0.1)'  },
    jade:  { color: 'var(--jade-bright)',      border: 'rgba(30,189,130,0.4)',   bg: 'rgba(30,189,130,0.1)'  },
    red:   { color: 'var(--cinnabar-bright)',  border: 'rgba(203,67,53,0.4)',    bg: 'rgba(203,67,53,0.1)'   },
    azure: { color: 'var(--azure-bright)',     border: 'rgba(46,155,229,0.4)',   bg: 'rgba(46,155,229,0.1)'  },
  };

  const ToastContainer = () => (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
    }}>
      <AnimatePresence>
        {toasts.map(t => {
          const s = VARIANT_STYLES[t.variant] || VARIANT_STYLES.gold;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.22 }}
              style={{
                padding: '9px 16px',
                borderRadius: 10,
                fontSize: 11,
                fontFamily: 'var(--font-ui)',
                letterSpacing: '0.02em',
                color: s.color,
                background: `rgba(13,7,24,0.96)`,
                border: `1px solid ${s.border}`,
                boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 12px ${s.bg}`,
                backdropFilter: 'blur(12px)',
                whiteSpace: 'nowrap',
                maxWidth: 320,
                pointerEvents: 'auto',
              }}
            >
              {t.message}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return { toast, ToastContainer };
}
