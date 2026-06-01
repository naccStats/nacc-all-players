import { useEffect, useRef } from 'react';

const BURST_COLORS = ['#D4A843','#FFE080','#9B59B6','#2E9BE5','#FF8040','#1EBD82','#FFD080','#CB4335'];

export default function WorldEngine() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    /* ── State ── */
    let mX = 0, mY = 0;   // normalised -0.5..0.5 for parallax
    let pX = 0, pY = 0;   // lerped parallax
    let particles = [];
    let rafId;

    /* ── Canvas size ── */
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    /* ── Event handlers ── */
    const onMove = (e) => {
      mX = e.clientX / window.innerWidth  - 0.5;
      mY = e.clientY / window.innerHeight - 0.5;
    };

    const onClick = (e) => {
      for (let i = 0; i < 8; i++) {
        const angle = i * 45 * Math.PI / 180;
        const spd   = 2.2 + (i % 3) * 1.1;
        particles.push({
          x:     e.clientX,
          y:     e.clientY,
          vx:    Math.cos(angle) * spd,
          vy:    Math.sin(angle) * spd,
          life:  1,
          decay: 0.87 + Math.random() * 0.04,
          col:   BURST_COLORS[i],
          r:     2.2 + (i % 3) * 0.7,
        });
      }
    };

    /* ── Main tick ── */
    const tick = () => {
      rafId = requestAnimationFrame(tick);

      /* Parallax lerp → CSS custom properties */
      pX += (mX - pX) * 0.09;
      pY += (mY - pY) * 0.09;
      const root = document.documentElement;
      root.style.setProperty('--px-x1', `${(pX * 10).toFixed(2)}px`);
      root.style.setProperty('--px-y1', `${(pY *  6).toFixed(2)}px`);
      root.style.setProperty('--px-x2', `${(pX * 22).toFixed(2)}px`);
      root.style.setProperty('--px-y2', `${(pY * 14).toFixed(2)}px`);
      root.style.setProperty('--px-x3', `${(pX * 38).toFixed(2)}px`);
      root.style.setProperty('--px-y3', `${(pY * 24).toFixed(2)}px`);
      root.style.setProperty('--px-x4', `${(pX * 56).toFixed(2)}px`);
      root.style.setProperty('--px-y4', `${(pY * 36).toFixed(2)}px`);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* Click burst particles */
      particles = particles.filter(p => p.life > 0.03);
      for (const p of particles) {
        p.x  += p.vx;
        p.y  += p.vy;
        p.vx *= 0.91;
        p.vy *= 0.91;
        p.life *= p.decay;
        const sz = Math.max(0.3, p.r * p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fillStyle = p.col + Math.round(p.life * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }
    };

    rafId = requestAnimationFrame(tick);

    window.addEventListener('resize',    resize,  { passive: true });
    window.addEventListener('mousemove', onMove,  { passive: true });
    window.addEventListener('click',     onClick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize',    resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click',     onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset:    0,
        pointerEvents: 'none',
        zIndex:   99999,
      }}
      aria-hidden="true"
    />
  );
}
