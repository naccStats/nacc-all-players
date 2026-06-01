import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, MoreHorizontal, X } from 'lucide-react';
import {
  GiMeditation, GiTrophyCup, GiDragonOrb, GiAllSeeingEye,
  GiDragonHead, GiCrossedSwords, GiCrystalBall,
} from 'react-icons/gi';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLenis } from '../SmoothScroll';
import { useScrollReveal } from '../ScrollReveal';
import QiRipple from '../QiRipple';

/* Mobile bottom nav — 4 primary routes + More */
const mobileNavItems = [
  { path: '/',         label: 'Home',     icon: GiMeditation   },
  { path: '/rankings', label: 'Rankings', icon: GiTrophyCup    },
  { path: '/guilds',   label: 'Guilds',   icon: GiDragonOrb    },
  { path: '/insights', label: 'Insights', icon: GiAllSeeingEye },
];

const moreNavItems = [
  { path: '/bestiary', label: 'Chaotic Beasts', icon: GiDragonHead,    deco: '兽', desc: 'Beast unlock tracker' },
  { path: '/advanced', label: 'Advanced Stats',  icon: GiCrystalBall,  deco: '道', desc: 'Deep stat breakdowns' },
  { path: '/compare',  label: 'Guild Compare',   icon: GiCrossedSwords, deco: '战', desc: 'Side-by-side guilds'  },
];

const routeWatermarks = {
  '/':          '界',
  '/rankings':  '榜',
  '/guilds':    '宗',
  '/advanced':  '道',
  '/insights':  '悟',
  '/bestiary':  '兽',
  '/compare':   '战',
};

const ROUTE_ORBS = {
  '/':          { color: 'rgba(201,151,58,0.042)',  top: '-10%',  right: '-5%',  bottom: 'auto', left: 'auto'  },
  '/rankings':  { color: 'rgba(46,155,229,0.032)',  top: '20%',   right: '-8%',  bottom: 'auto', left: 'auto'  },
  '/guilds':    { color: 'rgba(30,189,130,0.038)',  bottom: '-8%',left: '20%',   top: 'auto',    right: 'auto' },
  '/advanced':  { color: 'rgba(40,130,200,0.038)',  top: '-5%',   left: '-5%',   bottom: 'auto', right: 'auto' },
  '/insights':  { color: 'rgba(201,151,58,0.040)',  top: '-10%',  right: '10%',  bottom: 'auto', left: 'auto'  },
  '/bestiary':  { color: 'rgba(203,67,53,0.038)',   top: '25%',   left: '-8%',   bottom: 'auto', right: 'auto' },
  '/compare':   { color: 'rgba(46,155,229,0.032)',  bottom: '-8%',right: '-5%',  top: 'auto',    left: 'auto'  },
};


const Layout = ({ children }) => {
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [collapsed,    setCollapsed]    = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [moreOpen,     setMoreOpen]     = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const sheetRef = useRef(null);

  const openSidebar     = useCallback(() => setSidebarOpen(true),  []);
  const closeSidebar    = useCallback(() => setSidebarOpen(false), []);
  const toggleCollapse  = useCallback(() => setCollapsed(p => !p), []);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [moreOpen]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Parallax CSS vars are now driven by WorldEngine (App level) */

  useLenis();
  useScrollReveal(location.pathname);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const watermark = routeWatermarks[location.pathname] ?? '';
  const accentOrb = ROUTE_ORBS[location.pathname] ?? ROUTE_ORBS['/'];

  return (
    <div className={`app-shell${moreOpen ? ' more-open' : ''}`}>
      {/* Global Qi Ripple click effect */}
      <QiRipple />

      {/* Mouse parallax depth layers — nebula only, no bagua */}
      <div className="parallax-layers" aria-hidden="true">
        <div className="px-layer px-nebula" />
        <div className="px-layer px-mountains">
          <svg viewBox="0 0 1400 280" preserveAspectRatio="none"
            style={{ position: 'absolute', bottom: 0, left: '-10%', width: '120%', height: 200 }}
            aria-hidden="true"
          >
            <path
              d="M0,280 L0,165 L100,118 L220,148 L360,78 L490,130 L620,52 L750,105 L880,45 L1000,96 L1120,65 L1230,115 L1340,82 L1400,108 L1400,280 Z"
              fill="rgba(14,8,3,0.40)"
            />
            <path
              d="M0,280 L0,205 L150,162 L300,182 L460,138 L620,170 L780,118 L940,155 L1100,130 L1260,162 L1400,144 L1400,280 Z"
              fill="rgba(8,5,2,0.65)"
            />
          </svg>
        </div>
      </div>

      {/* Ambient background orbs */}
      <div className="bg-orbs" aria-hidden="true">
        <div className="bg-orb bg-orb--1" />
        <div className="bg-orb bg-orb--2" />
        <motion.div
          aria-hidden="true"
          animate={{
            background: `radial-gradient(circle at center, ${accentOrb.color} 0%, transparent 70%)`,
            top:    accentOrb.top,
            right:  accentOrb.right,
            bottom: accentOrb.bottom,
            left:   accentOrb.left,
          }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            width: 600, height: 600,
            borderRadius: '50%',
            filter: 'blur(90px)',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        className={`sidebar-overlay${sidebarOpen ? ' active' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className="main-area" style={{ position: 'relative' }}>
        <Header onMenuClick={openSidebar} />
        <main className="content-area" style={{ position: 'relative', zIndex: 1 }}>
          {watermark && (
            <span className="page-watermark" aria-hidden="true">{watermark}</span>
          )}
          {children}
        </main>
      </div>

      {/* Scroll-to-top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            className="scroll-to-top"
            onClick={scrollToTop}
            aria-label="Scroll to top"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <ArrowUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {mobileNavItems.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={location.pathname === path ? 'active' : ''}
            aria-label={label}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
        <button
          className={`mobile-nav-more-btn${moreOpen ? ' active' : ''}${moreNavItems.some(i => i.path === location.pathname) ? ' route-active' : ''}`}
          onClick={() => setMoreOpen(v => !v)}
          aria-label="More pages"
          aria-expanded={moreOpen}
        >
          <MoreHorizontal size={18} />
          <span>More</span>
        </button>
      </nav>

      {/* More sheet scrim */}
      <div
        className={`more-sheet-scrim${moreOpen ? ' visible' : ''}`}
        onClick={() => setMoreOpen(false)}
        aria-hidden="true"
      />

      {/* More — bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            ref={sheetRef}
            className="more-sheet"
            role="dialog"
            aria-label="More pages"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="more-sheet-handle" />
            <div className="more-sheet-header">
              <span className="more-sheet-title">More Pages</span>
              <button className="more-sheet-close" onClick={() => setMoreOpen(false)} aria-label="Close">
                <X size={15} />
              </button>
            </div>
            <div className="more-sheet-items">
              {moreNavItems.map(({ path, label, icon: Icon, deco, desc }) => {
                const isActive = location.pathname === path;
                return (
                  <button
                    key={path}
                    className={`more-sheet-item${isActive ? ' active' : ''}`}
                    onClick={() => { navigate(path); setMoreOpen(false); }}
                  >
                    <div className="more-sheet-item-icon"><Icon size={18} /></div>
                    <div className="more-sheet-item-text">
                      <span className="more-sheet-item-label">{label}</span>
                      <span className="more-sheet-item-desc">{desc}</span>
                    </div>
                    <span className="more-sheet-item-deco" aria-hidden="true">{deco}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
