import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { usePlayers } from '../context/DataContext';
import { useDebounce } from '../hooks/useDebounce';
import { formatCP } from '../utils/formatters';

/* The site-wide search: name, guild or UID, straight to a player's page. */
export default function PlayerSearch({ shortcut, onPick }) {
  const players = usePlayers();
  const navigate = useNavigate();
  const id = useId();
  const box = useRef(null);
  const input = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const q = useDebounce(query, 120).trim().toLowerCase();

  const results = useMemo(() => {
    if (q.length < 2) return [];
    const hit = (p) => p.player.toLowerCase().includes(q) || p.guild.toLowerCase().includes(q) || p.uid.includes(q);
    const first = (p) => (p.player.toLowerCase().startsWith(q) ? 0 : 1);
    return players.filter(hit).sort((a, b) => first(a) - first(b) || b.cp - a.cp).slice(0, 8);
  }, [players, q]);

  useEffect(() => setAt(0), [q]);

  useEffect(() => {
    const outside = (e) => !box.current?.contains(e.target) && setOpen(false);
    const key = (e) => {
      if (shortcut && (e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  }, [shortcut]);

  const pick = (p) => {
    setOpen(false);
    setQuery('');
    input.current?.blur();
    navigate(`/player/${p.uid}`);
    onPick?.();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setAt((i) => (i + (e.key === 'ArrowDown' ? 1 : results.length - 1)) % (results.length || 1));
    } else if (e.key === 'Enter' && results[at]) {
      pick(results[at]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      input.current?.blur();
    }
  };

  const show = open && q.length >= 2;
  return (
    <div className="find" ref={box} role="search">
      <Search size={16} aria-hidden="true" />
      <input
        ref={input}
        type="search"
        value={query}
        placeholder="Name, guild or UID"
        aria-label="Search players"
        role="combobox"
        aria-expanded={show}
        aria-controls={`${id}-list`}
        aria-activedescendant={show && results[at] ? `${id}-${at}` : undefined}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown}
      />
      {show && (
        <ul className="find__list" id={`${id}-list`} role="listbox" aria-label="Players">
          {results.map((p, i) => (
            <li
              key={p.uid}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === at}
              onMouseEnter={() => setAt(i)}
              onClick={() => pick(p)}
            >
              <b>{p.player}</b>
              <small>{p.guild || 'No guild'}</small>
              <em>{formatCP(p.cp)}</em>
            </li>
          ))}
          {!results.length && <li className="find__none" role="presentation">No player matches &ldquo;{query.trim()}&rdquo;</li>}
        </ul>
      )}
    </div>
  );
}
