import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataContext } from '../../context/DataContext';
import { formatTime } from '../../utils/formatters';
import { ChevronLeft } from 'lucide-react';
import {
  GiMeditation, GiTrophyCup, GiDragonOrb, GiCrystalBall,
  GiAllSeeingEye, GiDragonHead, GiCrossedSwords,
} from 'react-icons/gi';

const navItems = [
  { path: '/',         label: 'Dashboard',      icon: GiMeditation,    deco: '界' },
  { path: '/rankings', label: 'Rankings',        icon: GiTrophyCup,     deco: '榜' },
  { path: '/guilds',   label: 'Guilds',          icon: GiDragonOrb,     deco: '会' },
  { path: '/advanced', label: 'Advanced',        icon: GiCrystalBall,   deco: '道' },
  { path: '/insights', label: 'Insights',        icon: GiAllSeeingEye,  deco: '悟' },
  { path: '/bestiary', label: 'Chaotic Beasts',  icon: GiDragonHead,    deco: '兽' },
  { path: '/compare',  label: 'Compare',         icon: GiCrossedSwords, deco: '比' },
];

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location    = useLocation();
  const { lastUpdated } = useDataContext();

  return (
    <aside
      className={[
        'sidebar',
        isOpen    ? 'sidebar--open'      : '',
        collapsed ? 'sidebar--collapsed' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-glow" aria-hidden="true" />
        <h1>NACC</h1>
        <span className="brand-deco">仙 界 榜</span>
        <span className="brand-sub">Immortal Cultivation Records</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          const active = location.pathname === item.path;
          const Icon   = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
              aria-label={item.label}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
            >
              {/* Hover slide-in background */}
              <span className="nav-slide" aria-hidden="true" />

              <motion.div
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', position: 'relative', zIndex: 1 }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.30, delay: idx * 0.05, ease: 'easeOut' }}
              >
                {collapsed ? (
                  <span
                    className="nav-icon"
                    style={{
                      fontFamily: "'Ma Shan Zheng', serif",
                      fontSize: 17,
                      width: 20,
                      textAlign: 'center',
                      color: active ? 'var(--gold-bright)' : 'var(--muted)',
                      textShadow: active ? '0 0 10px rgba(212,168,67,0.65)' : 'none',
                      transition: 'color 0.22s, text-shadow 0.22s',
                    }}
                  >
                    {item.deco}
                  </span>
                ) : (
                  <Icon className="nav-icon" size={16} style={{ flexShrink: 0 }} />
                )}
                <span className="nav-label">{item.label}</span>
              </motion.div>

              {/* Qi energy dot — visible only on active item */}
              {active && <span className="nav-qi-dot" aria-hidden="true" />}

              {/* Deco character watermark in expanded nav items */}
              {!collapsed && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: active ? 20 : 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontFamily: 'var(--font-deco)',
                    fontSize: 22,
                    color: active ? 'rgba(212,168,67,0.18)' : 'rgba(212,168,67,0.06)',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    transition: 'color 0.22s, right 0.22s',
                    lineHeight: 1,
                  }}
                >
                  {item.deco}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <button
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <motion.div
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ChevronLeft size={15} />
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              key="collapse-label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: 10, letterSpacing: '0.10em', marginLeft: 6,
                overflow: 'hidden', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-title)', textTransform: 'uppercase',
              }}
            >
              Collapse
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Freshness indicator */}
      <div className="sidebar-freshness">
        <span className="sidebar-freshness-dot" />
        <span className="sidebar-freshness-text">Synced</span>
        <span className="sidebar-freshness-time">
          {lastUpdated ? formatTime(lastUpdated) : '—'}
        </span>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">North America · NA</div>
    </aside>
  );
};

export default Sidebar;
