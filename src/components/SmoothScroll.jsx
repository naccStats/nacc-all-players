import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function useLenis() {
  useEffect(() => {
    if (prefersReduced) return;

    const lenis = new Lenis({
      lerp:            0.10,
      smoothWheel:     true,
      touchMultiplier: 1.5,
      infinite:        false,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(lenis.raf);
      lenis.destroy();
    };
  }, []);
}
