import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '../../context/DataContext';
import { formatTime, formatCP } from '../../utils/formatters';
import { tribColor, tribLabel } from '../../utils/tribulationSystem';
import { useDebounce } from '../../hooks/useDebounce';
import { Menu, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = ({ onMenuClick }) => {
  const { lastUpdated, players } = useDataContext();
  const navigate = useNavigate();
  const [query,          setQuery]          = useState('');
  const [focused,        setFocused]        = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const debounced = useDebounce(query, 250);
  const boxRef    = useRef(null);
  const inputRef  = useRef(null);

  /* Cmd/Ctrl+K → focus search */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setFocused(true);
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === 'Escape') {
        setFocused(false);
        setSelectedPlayer(null);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const results = debounced.length >= 2
    ? (players || []).filter(p =>
        p.player.toLowerCase().includes(debounced.toLowerCase()) ||
        (p.guild || '').toLowerCase().includes(debounced.toLowerCase()) ||
        String(p.uid).includes(debounced)
      ).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDrop  = focused && results.length > 0;
  const showPanel = !!selectedPlayer && !showDrop;

  return (
    <header className="top-header">
      <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open navigation">
        <Menu size={18} />
      </button>

      <div className="header-left">
        <h2>
          <span className="header-title-full header-title-shimmer">
            Immortal Cultivation Records
          </span>
          <span className="header-title-short header-title-shimmer">
            仙 · Immortal Records
          </span>
        </h2>
        <div className="header-meta">
          <span className="status-dot" />
          <span>Records Channeled</span>
          <span className="divider">·</span>
          <span>Synced: {lastUpdated ? formatTime(lastUpdated) : '—'}</span>
          <span className="divider">·</span>
          <span>{(players || []).length} Cultivators</span>
        </div>
      </div>

      <div className="header-right">
        <div className="search-box" ref={boxRef} aria-expanded={showDrop || showPanel}>
          <span className="search-icon-wrap" aria-hidden="true">
            <Search size={13} />
          </span>
          <input
            type="text"
            ref={inputRef}
            placeholder="Search cultivator, guild, UID..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedPlayer(null); }}
            onFocus={() => setFocused(true)}
            aria-label="Search players"
            title="Press ⌘K to focus"
          />

          {/* Search results dropdown */}
          <AnimatePresence>
            {showDrop && (
              <motion.div
                className="search-dropdown"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
              >
                {results.map(p => (
                  <div
                    key={p.uid}
                    className="search-item"
                    onMouseDown={() => {
                      setSelectedPlayer(p);
                      setQuery('');
                      setFocused(false);
                    }}
                  >
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{p.player}</span>
                    <span className="muted">{p.guild || '—'}</span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player detail panel */}
          <AnimatePresence>
            {showPanel && (
              <motion.div
                className="search-player-panel"
                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                animate={{ opacity: 1,  y: 0,   scale: 1    }}
                exit={{ opacity: 0,    y: -10,  scale: 0.96 }}
                transition={{ duration: 0.20 }}
              >
                <div className="spp-header">
                  <div>
                    <div
                      className="spp-name"
                      style={{ color: tribColor(selectedPlayer.tribulation) || 'var(--gold-bright)' }}
                    >
                      {selectedPlayer.player}
                    </div>
                    <div className="spp-sub">
                      {selectedPlayer.guild || '—'} · UID {selectedPlayer.uid}
                      {selectedPlayer.region ? ` · ${selectedPlayer.region}` : ''}
                    </div>
                  </div>
                  <button
                    className="spp-close"
                    onClick={() => setSelectedPlayer(null)}
                    aria-label="Close player panel"
                  >✕</button>
                </div>

                <div className="spp-stats">
                  {[
                    { label: 'Combat Power', val: formatCP(selectedPlayer.cp || 0),         color: 'var(--gold-bright)',    size: 15 },
                    { label: 'Tribulation',  val: tribLabel(selectedPlayer.tribulation) || selectedPlayer.tribulation || '—',
                      color: tribColor(selectedPlayer.tribulation) || 'var(--muted)' },
                    { label: 'FDU',          val: (selectedPlayer.fdu  || 0).toLocaleString() },
                    { label: 'FDD',          val: (selectedPlayer.fdd  || 0).toLocaleString() },
                    { label: 'Total Finals', val: (selectedPlayer.totalFinals || 0).toLocaleString() },
                    { label: 'Chaos Beast',  val: selectedPlayer.hasChaos ? (selectedPlayer.chaosBeast || 'Yes') : 'None',
                      color: selectedPlayer.hasChaos ? 'var(--cinnabar-bright)' : 'var(--muted)' },
                  ].map(({ label, val, color, size }) => (
                    <div key={label} className="spp-stat">
                      <span className="spp-label">{label}</span>
                      <span className="spp-val" style={{ color: color || 'var(--text)', fontSize: size }}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="spp-footer">
                  {selectedPlayer.updated === 'N' || selectedPlayer.updated === 'NO' || selectedPlayer.updated === 'AFK'
                    ? <span style={{ color: 'var(--muted)' }}>● AFK</span>
                    : <span style={{ color: '#00E87C'      }}>● Active</span>
                  }
                  <button
                    className="spp-profile-btn"
                    onClick={() => { setSelectedPlayer(null); navigate('/player/' + selectedPlayer.uid); }}
                  >
                    View Full Profile →
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};

export default Header;
