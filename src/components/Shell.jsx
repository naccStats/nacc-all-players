import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useDataContext } from '../context/DataContext';
import PlayerSearch from './PlayerSearch';
import { AsOf, Logo } from './ui';

const PAGES = [
  { path: '/', label: 'Overview' },
  { path: '/rankings', label: 'Players' },
  { path: '/guilds', label: 'Guilds' },
  { path: '/compare', label: 'Compare' },
  { path: '/bestiary', label: 'Beasts' },
  { path: '/insights', label: 'Insights' },
  { path: '/advanced', label: 'Advanced' },
];

const HOME = import.meta.env.BASE_URL;

export default function Shell({ children }) {
  const { pathname } = useLocation();
  const { players } = useDataContext();
  const [open, setOpen] = useState(false);
  const current = pathname.startsWith('/player/') ? '/rankings' : pathname;

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
    const page = PAGES.find((p) => p.path === pathname);
    document.title = `${page ? page.label : 'Player'} | NACC`;
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <header className="top">
        <div className="wrap top__bar">
          <a
            className="skip-link"
            href="#main"
            onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}
          >
            Skip to content
          </a>
          <a className="logo" href={HOME} aria-label="NACC home">
            <Logo key={pathname} />NACC
          </a>
          <nav className="top__links" aria-label="Pages">
            {PAGES.map(({ path, label }) => (
              <Link key={path} to={path} aria-current={current === path ? 'page' : undefined}>{label}</Link>
            ))}
          </nav>
          <PlayerSearch shortcut />
          <button
            type="button"
            className="icon-btn top__toggle"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {open && (
        <div className="sheet">
          <div className="wrap">
            <PlayerSearch onPick={() => setOpen(false)} />
            <nav aria-label="Pages">
              {PAGES.map(({ path, label }) => (
                <Link
                  key={path}
                  className="sheet__link"
                  to={path}
                  aria-current={current === path ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main id="main" tabIndex={-1} style={{ outline: 'none' }}>
        <div className="backdrop" aria-hidden="true" style={{ backgroundImage: `url(${HOME}home/ink-wide.jpg)` }} />
        <div className="wrap page">{children}</div>
      </main>

      <footer className="foot">
        <div className="wrap">
          <span>NACC. Player and guild stats for Nobody&rsquo;s Adventure Chop Chop, North America region.</span>
          <span>{players.length} players</span><AsOf />
        </div>
      </footer>
    </>
  );
}
