import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Trophy,
  Shield,
  BarChart3,
  Eye,
  ChevronLeft,
} from 'lucide-react';

const navItems = [
  { path: '/',          label: 'Dashboard',  icon: LayoutDashboard, deco: '界' },
  { path: '/rankings',  label: 'Rankings',   icon: Trophy,          deco: '榜' },
  { path: '/guilds',    label: 'Guilds',     icon: Shield,          deco: '宗' },
  { path: '/advanced',  label: 'Advanced',   icon: BarChart3,       deco: '道' },
  { path: '/insights',  label: 'Insights',   icon: Eye,             deco: '悟' },
];

const Sidebar = ({ isOpen, onClose, collapsed, onToggleCollapse }) => {
  const location = useLocation();

  return (
    <aside
      className={[
        'sidebar',
        isOpen ? 'sidebar--open' : '',
        collapsed ? 'sidebar--collapsed' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Brand */}
      <div className="sidebar-brand">
        <h1>NACC</h1>
        <span className="brand-deco">仙 界 榜</span>
        <span className="brand-sub">Immortal Cultivation Records</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map((item, idx) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
              aria-label={item.label}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
            >
              <motion.div
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}
                initial={false}
              >
                {/* Decorative Chinese char when collapsed */}
                {collapsed ? (
                  <span
                    className="nav-icon"
                    style={{
                      fontFamily: "'Ma Shan Zheng', serif",
                      fontSize: 16,
                      width: 20,
                      textAlign: 'center',
                      color: active ? 'var(--gold-bright)' : 'var(--muted)',
                    }}
                  >
                    {item.deco}
                  </span>
                ) : (
                  <Icon
                    className="nav-icon"
                    size={16}
                    style={{ flexShrink: 0 }}
                  />
                )}
                <span className="nav-label">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle (desktop only via CSS) */}
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
              style={{ fontSize: 10, letterSpacing: '0.1em', marginLeft: 6, overflow: 'hidden', whiteSpace: 'nowrap', fontFamily: 'var(--font-title)', textTransform: 'uppercase' }}
            >
              Collapse
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Footer */}
      <div className="sidebar-footer">
        North America · NA
      </div>
    </aside>
  );
};

export default Sidebar;
