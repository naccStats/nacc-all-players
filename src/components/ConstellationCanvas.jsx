import React, { useRef, useEffect } from 'react';

const DRAGON_STARS = [
  { x: 68, y: 11, r: 2.0 },  //  0 — right horn tip
  { x: 62, y:  9, r: 1.8 },  //  1 — left horn tip
  { x: 70, y: 16, r: 2.8 },  //  2 — right eye (bright)
  { x: 63, y: 15, r: 2.8 },  //  3 — left eye (bright)
  { x: 66, y: 23, r: 1.7 },  //  4 — muzzle/chin
  { x: 60, y: 30, r: 1.6 },  //  5
  { x: 53, y: 36, r: 1.7 },  //  6
  { x: 46, y: 40, r: 1.5 },  //  7
  { x: 38, y: 42, r: 1.6 },  //  8
  { x: 31, y: 37, r: 1.5 },  //  9
  { x: 26, y: 44, r: 1.6 },  // 10
  { x: 24, y: 53, r: 1.5 },  // 11
  { x: 29, y: 62, r: 1.6 },  // 12
  { x: 37, y: 67, r: 1.5 },  // 13
  { x: 46, y: 68, r: 1.7 },  // 14
  { x: 54, y: 63, r: 1.5 },  // 15
  { x: 59, y: 69, r: 1.6 },  // 16 — coil peak
  { x: 57, y: 77, r: 1.4 },  // 17
  { x: 51, y: 83, r: 1.3 },  // 18
  { x: 44, y: 87, r: 1.2 },  // 19
  { x: 37, y: 84, r: 1.1 },  // 20
  { x: 33, y: 89, r: 0.9 },  // 21 — tail tip
];

// Tail → head order for cinematic tail-first reveal
const DRAGON_CONNECTIONS = [
  [21,20],[20,19],[19,18],[18,17],[17,16],
  [16,15],[15,14],[14,13],[13,12],[12,11],[11,10],
  [10,9],[9,8],[8,7],[7,6],
  [6,5],[5,4],
  [4,3],[4,2],[3,1],[2,0],[3,2],[0,1],
];

const DRAW_DURATION = 1400;
const BRIGHT = new Set([2, 3]);

// Fixed per-star twinkle params (stable across renders)
const STAR_PARAMS = DRAGON_STARS.map(() => ({
  phase: Math.random() * Math.PI * 2,
  rate:  0.5 + Math.random() * 1.0,
}));

export default function ConstellationCanvas({ triggered, onDrawComplete }) {
  const canvasRef       = useRef(null);
  const triggeredRef    = useRef(false);
  const drawStartRef    = useRef(null);
  const doneRef         = useRef(false);
  const rafRef          = useRef(null);
  const callbackRef     = useRef(onDrawComplete);
  callbackRef.current   = onDrawComplete;

  // Sync triggered prop into ref without re-running the canvas effect
  useEffect(() => {
    if (triggered) triggeredRef.current = true;
  }, [triggered]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = (now) => {
      rafRef.current = requestAnimationFrame(tick);
      const { width, height } = canvas;
      if (!width || !height) return;

      ctx.clearRect(0, 0, width, height);
      const t = now / 1000;

      // Draw progress
      let drawProgress = 0;
      if (triggeredRef.current) {
        if (drawStartRef.current === null) drawStartRef.current = now;
        drawProgress = Math.min((now - drawStartRef.current) / DRAW_DURATION, 1);
      }

      const totalConns    = DRAGON_CONNECTIONS.length;
      const connsFloat    = drawProgress * totalConns;
      const completedConns = Math.floor(connsFloat);
      const activeT       = connsFloat - completedConns;

      // Completed connection lines
      ctx.save();
      ctx.strokeStyle = 'rgba(212,168,67,0.55)';
      ctx.lineWidth   = 0.8;
      ctx.lineCap     = 'round';
      ctx.shadowBlur  = 4;
      ctx.shadowColor = 'rgba(212,168,67,0.3)';

      for (let i = 0; i < completedConns; i++) {
        const [ai, bi] = DRAGON_CONNECTIONS[i];
        ctx.beginPath();
        ctx.moveTo(DRAGON_STARS[ai].x / 100 * width, DRAGON_STARS[ai].y / 100 * height);
        ctx.lineTo(DRAGON_STARS[bi].x / 100 * width, DRAGON_STARS[bi].y / 100 * height);
        ctx.stroke();
      }

      // Active growing connection
      if (completedConns < totalConns && drawProgress > 0) {
        const [ai, bi] = DRAGON_CONNECTIONS[completedConns];
        const ax = DRAGON_STARS[ai].x / 100 * width;
        const ay = DRAGON_STARS[ai].y / 100 * height;
        const bx = DRAGON_STARS[bi].x / 100 * width;
        const by = DRAGON_STARS[bi].y / 100 * height;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax + (bx - ax) * activeT, ay + (by - ay) * activeT);
        ctx.stroke();
      }

      ctx.restore();

      // Stars
      for (let i = 0; i < DRAGON_STARS.length; i++) {
        const s     = DRAGON_STARS[i];
        const p     = STAR_PARAMS[i];
        const bright = BRIGHT.has(i);
        const base  = bright ? 0.85 : 0.65;
        const alpha = Math.min(1, base + Math.sin(t * p.rate + p.phase) * 0.35 * base);

        ctx.save();
        if (bright) {
          ctx.shadowBlur  = 10;
          ctx.shadowColor = 'rgba(255,242,200,0.7)';
        }
        ctx.beginPath();
        ctx.arc(s.x / 100 * width, s.y / 100 * height, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,242,200,${alpha.toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      }

      // Fire callback exactly once when fully drawn
      if (drawProgress >= 1 && !doneRef.current) {
        doneRef.current = true;
        callbackRef.current?.();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
      aria-hidden="true"
    />
  );
}
