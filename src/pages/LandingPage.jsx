import React, { useState, useCallback, useEffect } from 'react';
import ConstellationCanvas from '../components/ConstellationCanvas';
import { createConstellation } from '../utils/constellationLib';
import { motion, AnimatePresence } from 'framer-motion';

/* Ink-wash mountain SVG — sparse brushstrokes, lots of empty sky */
function MountainInk() {
  return (
    <svg
      viewBox="0 0 1200 320"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '100%' }}
    >
      {/* Far peaks — barely visible */}
      <path
        d="M0,320 L0,220 L140,140 L260,175 L400,95 L530,155 L670,68 L800,128 L940,80 L1070,115 L1200,90 L1200,320 Z"
        fill="rgba(30,18,8,0.35)"
      />
      {/* Mid peaks */}
      <path
        d="M0,320 L0,255 L180,175 L340,210 L520,148 L700,195 L880,145 L1060,178 L1200,158 L1200,320 Z"
        fill="rgba(18,10,4,0.60)"
      />
      {/* Foreground ridge */}
      <path
        d="M0,320 L0,285 L220,252 L440,268 L660,238 L880,258 L1100,242 L1200,248 L1200,320 Z"
        fill="rgba(8,5,2,0.88)"
      />
      {/* Mist bands — horizontal fades */}
      <rect x="0" y="155" width="1200" height="40"
        fill="url(#mistBand1)" opacity="0.45" />
      <rect x="0" y="220" width="1200" height="30"
        fill="url(#mistBand2)" opacity="0.30" />
      <defs>
        <linearGradient id="mistBand1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5EDD6" stopOpacity="0" />
          <stop offset="50%" stopColor="#F5EDD6" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#F5EDD6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mistBand2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F5EDD6" stopOpacity="0" />
          <stop offset="50%" stopColor="#F5EDD6" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#F5EDD6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function LandingPage({ onEnter }) {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'entering' | 'gone'
  const [sealLit, setSealLit] = useState(false);
  const [constellTriggered, setConstellTriggered] = useState(false);
  const onSealLand = useCallback(() => setSealLit(true), []);

  useEffect(() => {
    const el = document.getElementById('constellation-landing-bg');
    if (!el) return;
    const cleanup = createConstellation('constellation-landing-bg', 'Hot Sparks');
    const canvas = el.querySelector('canvas');
    if (canvas) canvas.style.backgroundColor = 'transparent';
    return cleanup;
  }, []);

  const handleEnter = () => {
    if (phase !== 'idle' || constellTriggered) return;
    setConstellTriggered(true);
    setTimeout(() => {
      setPhase('entering');
      setTimeout(() => { setPhase('gone'); setTimeout(onEnter, 300); }, 1200);
    }, 900);
  };

  const isEntering = phase === 'entering';

  return (
    <AnimatePresence>
      {phase !== 'gone' && (
        <motion.div
          className="landing-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >

          {/* ── Hot sparks — first child = bottommost layer, behind mountains ── */}
          <div
            id="constellation-landing-bg"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
            aria-hidden="true"
          />

          {/* ── Mountain ink-wash background ── */}
          <div className="landing-mountain-bg" aria-hidden="true">
            <MountainInk />
          </div>

          {/* ── Ambient mist — single layer, slow shift ── */}
          <div className="landing-mist" aria-hidden="true" />

          {/* ── Scroll rollers — part left/right on enter ── */}
          <motion.div
            className="landing-roller landing-roller--left"
            aria-hidden="true"
            animate={isEntering ? { x: '-130%', opacity: 0 } : { x: 0, opacity: 1 }}
            transition={{ duration: 0.95, ease: [0.55, 0, 1, 0.45] }}
          />
          <motion.div
            className="landing-roller landing-roller--right"
            aria-hidden="true"
            animate={isEntering ? { x: '130%', opacity: 0 } : { x: 0, opacity: 1 }}
            transition={{ duration: 0.95, ease: [0.55, 0, 1, 0.45] }}
          />

          {/* ── Scroll parchment background ── */}
          <motion.div
            className="landing-scroll-bg"
            aria-hidden="true"
            animate={isEntering ? { scaleX: 1.4, opacity: 0 } : { scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.90, ease: [0.55, 0, 1, 0.45] }}
          />

          {/* ── Dragon constellation canvas ── */}
          <ConstellationCanvas triggered={constellTriggered} />

          {/* ── Central content ── */}
          <div className="landing-center">

            {/* Seal stamp — the primary visual moment */}
            <motion.div
              className={`landing-seal${sealLit ? ' landing-seal--lit' : ''}`}
              initial={{ scale: 1.5, y: -28, opacity: 0, filter: 'blur(10px)' }}
              animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onAnimationComplete={onSealLand}
            >
              <div className="landing-seal-border" aria-hidden="true" />
              <span className="landing-seal-char">NACC</span>
              <div className="landing-seal-ornament" aria-hidden="true" />
            </motion.div>

            {/* Tagline — ink bleed in */}
            <motion.div
              className="landing-tagline-block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.1, delay: 0.72 }}
            >
              <p className="landing-subtitle">Immortal Cultivation Records</p>
              <p className="landing-tagline">仙界之榜 · North America</p>
            </motion.div>

            {/* Enter — minimal, confident */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.05 }}
            >
              <motion.button
                className="landing-enter-btn"
                onClick={handleEnter}
                animate={isEntering ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                disabled={phase !== 'idle' || constellTriggered}
                whileHover={phase === 'idle' && !constellTriggered ? { scale: 1.02 } : {}}
                whileTap={phase === 'idle' && !constellTriggered ? { scale: 0.97 } : {}}
              >
                <span>ENTER</span>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.button>
            </motion.div>

            {/* Bottom quote */}
            <motion.p
              className="landing-quote"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.4, delay: 1.4 }}
            >
              Journey of a thousand miles begins with a single step
            </motion.p>

          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
