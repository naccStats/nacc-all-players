import { useEffect } from 'react';
import { gsap } from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Call with the current pathname to batch-reveal all [data-reveal]
 * elements on the new page after React finishes painting.
 */
export function useScrollReveal(pathname) {
  useEffect(() => {
    // rAF ensures React has finished committing the new page DOM
    const raf = requestAnimationFrame(() => {
      const els = document.querySelectorAll('[data-reveal]');
      if (!els.length) return;

      // Set initial hidden state
      gsap.set(els, { opacity: 0, y: 40, overwrite: true });

      ScrollTrigger.batch('[data-reveal]', {
        start: 'top 90%',
        once:  true,
        onEnter: batch =>
          gsap.to(batch, {
            opacity:  1,
            y:        0,
            duration: 0.60,
            stagger:  0.08,
            ease:     'power2.out',
            overwrite: true,
          }),
      });

      ScrollTrigger.refresh();
    });

    return () => {
      cancelAnimationFrame(raf);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}
