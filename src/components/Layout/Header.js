import React, { useState, useRef, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext';
import { formatTime, formatCP } from '../../utils/formatters';
import { tribColor, tribLabel } from '../../utils/tribulationSystem';
import { useDebounce } from '../../hooks/useDebounce';
import { Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Header = ({ onMenuClick }) => {
  const { lastUpdated, players } = useDataContext();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const debounced = useDebounce(query, 250);
  const boxRef = useRef(null);

  const results = debounced.length >= 2
    ? (players || []).filter(p =>
        p.player.toLowerCase().includes(debounced.toLowerCase()) ||
        (p.guild || '').toLowerCase().includes(debounced.toLowerCase()) ||
        String(p.uid).includes(debounced)
      ).slice(0, 6)
    : [];

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDrop = focused && results.length > 0;
  const showPanel = !!selectedPlayer && !showDrop;

  return (
    <header className="top-header">
      <button
        className="hamburger-btn"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <div className="header-left">
        <h2>Immortal Cultivation Records</h2>
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
        <div className="search-box" ref={boxRef}>
          <input
            type="text"
            placeholder="Search cultivator, guild, UID..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedPlayer(null); }}
            onFocus={() => setFocused(true)}
            aria-label="Search players"
          />

          {/* Search results dropdown */}
          <AnimatePresence>
            {showDrop && (
              <motion.div
                className="search-dropdown"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
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
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <div className="spp-header">
                  <div>
                    <div className="spp-name">{selectedPlayer.player}</div>
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
                  <div className="spp-stat">
                    <span className="spp-label">Combat Power</span>
                    <span className="spp-val" style={{ color: 'var(--gold-bright)', fontSize: 15 }}>
                      {formatCP(selectedPlayer.cp || 0)}
                    </span>
                  </div>

                  <div className="spp-stat">
                    <span className="spp-label">Tribulation</span>
                    <span className="spp-val" style={{ color: tribColor(selectedPlayer.tribulation) }}>
                      {tribLabel(selectedPlayer.tribulation) || selectedPlayer.tribulation || '—'}
                    </span>
                  </div>

                  <div className="spp-stat">
                    <span className="spp-label">FDU</span>
                    <span className="spp-val">{(selectedPlayer.fdu || 0).toLocaleString()}</span>
                  </div>

                  <div className="spp-stat">
                    <span className="spp-label">FDD</span>
                    <span className="spp-val">{(selectedPlayer.fdd || 0).toLocaleString()}</span>
                  </div>

                  <div className="spp-stat">
                    <span className="spp-label">Total Finals</span>
                    <span className="spp-val">{(selectedPlayer.totalFinals || 0).toLocaleString()}</span>
                  </div>

                  <div className="spp-stat">
                    <span className="spp-label">Chaos Beast</span>
                    <span className="spp-val" style={{
                      color: selectedPlayer.hasChaos ? 'var(--cinnabar-bright)' : 'var(--muted)'
                    }}>
                      {selectedPlayer.hasChaos ? (selectedPlayer.chaosBeast || 'Yes') : 'None'}
                    </span>
                  </div>
                </div>

                <div className="spp-footer">
                  {selectedPlayer.updated === 'N' || selectedPlayer.updated === 'NO'
                    ? <span style={{ color: 'var(--muted)' }}>● AFK</span>
                    : <span style={{ color: '#00E87C' }}>● Active</span>
                  }
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
