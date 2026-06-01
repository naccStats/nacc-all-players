import React, { useRef, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';

const REALMS = {
  '/':          { char: '界', accent: '#D4A843', name: '仙界 · Dashboard'  },
  '/rankings':  { char: '榜', accent: '#2E9BE5', name: '天榜 · Rankings'   },
  '/guilds':    { char: '宗', accent: '#1EBD82', name: '宗门 · Guilds'      },
  '/advanced':  { char: '道', accent: '#2882C8', name: '道途 · Advanced'   },
  '/insights':  { char: '悟', accent: '#CB4335', name: '悟境 · Insights'   },
  '/bestiary':  { char: '兽', accent: '#CB4335', name: '兽域 · Bestiary'   },
  '/compare':   { char: '比', accent: '#2E9BE5', name: '比较 · Compare'    },
};

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function RealmTransition() {
  const location  = useLocation();
  const curtainRef = useRef(null);
  const isFirst    = useRef(true);

  const realm = REALMS[location.pathname] ?? REALMS['/'];

  useLayoutEffect(() => {
    const el = curtainRef.current;
    if (!el) return;

    if (prefersReduced) {
      gsap.set(el, { opacity: 0 });
      return;
    }

    const firstLoad = isFirst.current;
    isFirst.current = false;

    const tl = gsap.timeline();

    if (firstLoad) {
      /* On first page load the curtain covers the screen, then rolls open */
      tl.set(el,  { scaleY: 1, opacity: 1, transformOrigin: 'top center' })
        .to({},    { duration: 0.18 })            /* brief dramatic hold */
        .to(el,    {
          scaleY:          0,
          duration:        0.65,
          ease:            'expo.out',
          force3D:         true,
        });
    } else {
      /* Navigation: close from bottom → open from top */
      tl.set(el, { scaleY: 0, opacity: 1, transformOrigin: 'bottom center' })
        .to(el,  {
          scaleY:   1,
          duration: 0.30,
          ease:     'power2.in',
          force3D:  true,
        })
        .set(el, { transformOrigin: 'top center' })
        .to(el,  {
          scaleY:   0,
          duration: 0.52,
          ease:     'expo.out',
          force3D:  true,
        });
    }

    return () => tl.kill();
  }, [location.pathname]);

  return (
    <div
      ref={curtainRef}
      aria-hidden="true"
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         8900,
        pointerEvents:  'none',
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'linear-gradient(180deg, #060402 0%, #060402 100%)',
        transform:      'scaleY(0)',
        transformOrigin:'bottom center',
        willChange:     'transform',
      }}
    >
      {/* Decorative horizontal lines */}
      <div style={{
        position:   'absolute',
        top: '50%', left: 0, right: 0,
        height:     1,
        marginTop:  -60,
        background: `linear-gradient(90deg, transparent 0%, ${realm.accent}55 20%, ${realm.accent}AA 50%, ${realm.accent}55 80%, transparent 100%)`,
        boxShadow:  `0 0 12px ${realm.accent}40`,
      }} />
      <div style={{
        position:   'absolute',
        top: '50%', left: 0, right: 0,
        height:     1,
        marginTop:  60,
        background: `linear-gradient(90deg, transparent 0%, ${realm.accent}55 20%, ${realm.accent}AA 50%, ${realm.accent}55 80%, transparent 100%)`,
        boxShadow:  `0 0 12px ${realm.accent}40`,
      }} />

      {/* Central realm character */}
      <span style={{
        fontSize:   'clamp(100px, 18vw, 200px)',
        fontFamily: 'var(--font-deco)',
        color:      realm.accent,
        textShadow: `0 0 36px ${realm.accent}50`,
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {realm.char}
      </span>

      {/* Realm name */}
      <span style={{
        fontSize:      12,
        fontFamily:    'var(--font-title)',
        color:         `${realm.accent}BB`,
        letterSpacing: '0.45em',
        textTransform: 'uppercase',
        marginTop:     18,
        userSelect:    'none',
      }}>
        {realm.name}
      </span>
    </div>
  );
}
