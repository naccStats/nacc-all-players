import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Trophy, Shield, Eye, PawPrint, ArrowUp, MoreHorizontal, BarChart3, Swords, X } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';

/* Mobile bottom nav — 4 primary routes + More */
const mobileNavItems = [
  { path: '/',         label: 'Home',     icon: LayoutDashboard },
  { path: '/rankings', label: 'Rankings', icon: Trophy },
  { path: '/guilds',   label: 'Guilds',   icon: Shield },
  { path: '/insights', label: 'Insights', icon: Eye },
];

/* Overflow routes shown in the More sheet */
const moreNavItems = [
  { path: '/bestiary', label: 'Chaotic Beasts', icon: PawPrint,   deco: '兽', desc: 'Beast unlock tracker' },
  { path: '/advanced', label: 'Advanced Stats',  icon: BarChart3,  deco: '道', desc: 'Deep stat breakdowns' },
  { path: '/compare',  label: 'Guild Compare',   icon: Swords,     deco: '战', desc: 'Side-by-side guilds'  },
];

/* Per-route watermark characters */
const routeWatermarks = {
  '/':          '界',
  '/rankings':  '榜',
  '/guilds':    '宗',
  '/advanced':  '道',
  '/insights':  '悟',
  '/bestiary':  '兽',
  '/compare':   '战',
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const sheetRef = useRef(null);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleCollapse = useCallback(() => setCollapsed(prev => !prev), []);

  // Close More sheet on route change
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  // Close More sheet on outside tap
  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [moreOpen]);

  // Scroll-to-top visibility
  useEffect(() => {
    const mainEl = document.querySelector('.main-area');
    if (!mainEl) return;
    const onScroll = () => setShowScrollTop(mainEl.scrollTop > 300);
    mainEl.addEventListener('scroll', onScroll, { passive: true });
    return () => mainEl.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    document.querySelector('.main-area')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const watermark = routeWatermarks[location.pathname] ?? '';

  return (
    <div className="app-shell">
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
      <div className="main-area" style={{ position: 'relative', overflowY: 'auto', height: '100vh' }}>
        <Header onMenuClick={openSidebar} />
        <main className="content-area" style={{ position: 'relative', zIndex: 1 }}>
          {/* Page watermark */}
          {watermark && (
            <span className="page-watermark" aria-hidden="true">{watermark}</span>
          )}
          {children}
        </main>
      </div>

      {/* Scroll-to-top button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            className="scroll-to-top"
            onClick={scrollToTop}
            aria-label="Scroll to top"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.22 }}
          >
            <ArrowUp size={16} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile bottom navigation */}
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

        {/* More button */}
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

      {/* More — bottom sheet */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Scrim */}
            <motion.div
              className="more-sheet-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setMoreOpen(false)}
              aria-hidden="true"
            />

            {/* Sheet */}
            <motion.div
              ref={sheetRef}
              className="more-sheet"
              role="dialog"
              aria-label="More pages"
              initial={{ y: '100%', opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.6 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }}
            >
              {/* Handle */}
              <div className="more-sheet-handle" />

              {/* Header */}
              <div className="more-sheet-header">
                <span className="more-sheet-title">More Pages</span>
                <button
                  className="more-sheet-close"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Close"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Route items */}
              <div className="more-sheet-items">
                {moreNavItems.map(({ path, label, icon: Icon, deco, desc }, idx) => {
                  const isActive = location.pathname === path;
                  return (
                    <motion.button
                      key={path}
                      className={`more-sheet-item${isActive ? ' active' : ''}`}
                      onClick={() => { navigate(path); setMoreOpen(false); }}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.055 }}
                    >
                      <div className="more-sheet-item-icon">
                        <Icon size={18} />
                      </div>
                      <div className="more-sheet-item-text">
                        <span className="more-sheet-item-label">{label}</span>
                        <span className="more-sheet-item-desc">{desc}</span>
                      </div>
                      <span className="more-sheet-item-deco" aria-hidden="true">{deco}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
