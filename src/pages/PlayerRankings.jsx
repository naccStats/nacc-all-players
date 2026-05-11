import { useContext, useState, useMemo, useEffect } from 'react';
import { PlayerContext } from '../App';
import { formatCP, formatNumber } from '../utils/formatters';
import { tribColor, tribRank } from '../utils/tribulationSystem';
import GlassCard from '../components/GlassCard';
import SearchBar from '../components/SearchBar';
import { FilterSelect } from '../components/FilterBar';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function PlayerRankings() {
  const rawPlayers = useContext(PlayerContext);
  const [search, setSearch] = useState('');
  const [guildFilter, setGuildFilter] = useState('all');
  const [chaosFilter, setChaosFilter] = useState('all');
  const [sortField, setSortField] = useState('cp');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const perPage = 30;

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const guilds = useMemo(
    () => [...new Set((rawPlayers || []).map(p => p.guild).filter(Boolean))].sort(),
    [rawPlayers]
  );

  const filtered = useMemo(() => {
    const data = rawPlayers || [];
    let list = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.player.toLowerCase().includes(q) ||
        (p.guild || '').toLowerCase().includes(q) ||
        String(p.uid).includes(q)
      );
    }
    if (guildFilter !== 'all') list = list.filter(p => p.guild === guildFilter);
    if (chaosFilter === 'chaos') list = list.filter(p => p.hasChaos);
    else if (chaosFilter === 'no-chaos') list = list.filter(p => !p.hasChaos);

    list.sort((a, b) => {
      let va = a[sortField] ?? 0;
      let vb = b[sortField] ?? 0;
      if (sortField === 'tribulation') { va = tribRank(va); vb = tribRank(vb); }
      if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); return sortDir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb); }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
    return list;
  }, [rawPlayers, search, guildFilter, chaosFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const SORT_OPTIONS = [
    { value: 'cp',          label: 'CP'     },
    { value: 'tribulation', label: 'Trib'   },
    { value: 'fdu',         label: 'FDU'    },
    { value: 'fdd',         label: 'FDD'    },
    { value: 'totalFinals', label: 'Finals' },
  ];

  if (!rawPlayers?.length) {
    return (
      <GlassCard style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Search size={32} style={{ color: '#4B5563', margin: '0 auto 12px' }}/>
        <p style={{ fontSize: 12, color: 'var(--muted)' }}>Loading cultivation records...</p>
      </GlassCard>
    );
  }

  const thStyle = (field) => ({
    padding: '12px 16px',
    textAlign: 'left',
    userSelect: 'none',
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: field && sortField === field ? 'var(--gold-bright)' : 'var(--muted)',
    transition: 'color 0.2s',
    fontFamily: 'var(--font-title)',
    whiteSpace: 'nowrap',
  });

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Filter + Sort row */}
      <GlassCard>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search cultivator, guild, UID..." />
          <div className="flex-1" />
          <FilterSelect label="Guild" value={guildFilter} onChange={v => { setGuildFilter(v); setPage(1); }}
            options={[{ value: 'all', label: 'All Guilds' }, ...guilds.map(g => ({ value: g, label: g }))]}
          />
          <FilterSelect label="Chaos" value={chaosFilter} onChange={v => { setChaosFilter(v); setPage(1); }}
            options={[
              { value: 'all',      label: 'All' },
              { value: 'chaos',    label: 'Has Chaos' },
              { value: 'no-chaos', label: 'No Chaos' },
            ]}
          />
        </div>

        {/* Sort controls */}
        <div style={{
          marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          paddingTop: 10, borderTop: '1px solid rgba(201,146,11,0.08)',
        }}>
          <span style={{
            fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--font-title)',
            letterSpacing: '0.14em', textTransform: 'uppercase', marginRight: 4, flexShrink: 0,
          }}>Sort by</span>
          {SORT_OPTIONS.map(opt => {
            const active = sortField === opt.value;
            return (
              <button key={opt.value}
                onClick={() => { setSortField(opt.value); setSortDir('desc'); setPage(1); }}
                style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
                  fontFamily: 'var(--font-title)', letterSpacing: '0.08em',
                  background: active ? 'rgba(201,146,11,0.15)' : 'rgba(255,255,255,0.03)',
                  color: active ? 'var(--gold-bright)' : 'var(--muted)',
                  border: active ? '1px solid rgba(201,146,11,0.45)' : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: active ? '0 0 8px rgba(201,146,11,0.2)' : 'none',
                  transition: 'all 0.15s',
                }}
              >{opt.label}</button>
            );
          })}
          <button
            onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(1); }}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 14px', borderRadius: 20, fontSize: 10, cursor: 'pointer',
              fontFamily: 'var(--font-title)', letterSpacing: '0.08em',
              background: 'rgba(176,38,255,0.08)',
              color: 'var(--imperial-bright)',
              border: '1px solid rgba(176,38,255,0.3)',
              transition: 'all 0.15s',
            }}
          >
            {sortDir === 'desc'
              ? <><ChevronDown size={10} /> Desc</>
              : <><ChevronUp   size={10} /> Asc</>
            }
          </button>
        </div>

        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--muted)' }}>
          {filtered.length} cultivators{guildFilter !== 'all' ? ` · ${guildFilter}` : ''}
        </div>
      </GlassCard>

      {/* ── Mobile card list ── */}
      {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paged.map((p, i) => {
            const rank = (page - 1) * perPage + i + 1;
            const isTop = rank <= 3;
            const tc = tribColor(p.tribulation);
            const rankColor = rank === 1 ? 'var(--gold-bright)' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : 'var(--muted)';
            const rankBg = rank === 1 ? 'rgba(201,146,11,0.15)' : rank === 2 ? 'rgba(180,180,180,0.1)' : rank === 3 ? 'rgba(205,127,50,0.15)' : 'rgba(30,20,40,0.6)';
            return (
              <motion.div
                key={p.uid}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.015 }}
                style={{
                  background: isTop ? 'rgba(201,146,11,0.04)' : 'rgba(13,7,24,0.6)',
                  border: isTop ? '1px solid rgba(201,146,11,0.2)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 10,
                  padding: '10px 12px',
                }}
              >
                {/* Top row: rank + name + CP */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-title)',
                    background: rankBg, color: rankColor,
                    border: `1px solid ${rankColor}40`,
                  }}>{rank}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#EDE0C4', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.player}
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {p.guild || 'No Guild'} · UID {p.uid}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontFamily: 'monospace', fontWeight: 700, fontSize: 14,
                      color: isTop ? 'var(--gold-bright)' : 'var(--azure-bright)',
                      textShadow: isTop ? '0 0 10px rgba(201,146,11,0.5)' : 'none',
                    }}>{formatCP(p.cp)}</div>
                    <div style={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CP</div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 6, paddingTop: 7,
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                  {/* Tribulation */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Trib</div>
                    <span style={{
                      display: 'inline-block', padding: '2px 6px', borderRadius: 4,
                      fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                      color: tc, background: tc + '20', border: `1px solid ${tc}35`,
                    }}>{p.tribulation || '—'}</span>
                  </div>
                  {/* FDU */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>FDU</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: 'var(--jade-bright)' }}>
                      {p.fdu > 0 ? formatNumber(p.fdu) : '—'}
                    </div>
                  </div>
                  {/* FDD */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>FDD</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: 'var(--cinnabar-bright)' }}>
                      {p.fdd > 0 ? formatNumber(p.fdd) : '—'}
                    </div>
                  </div>
                  {/* Finals + Chaos */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Finals</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--muted)' }}>
                      {p.totalFinals > 0 ? p.totalFinals : '—'}
                    </div>
                    {p.hasChaos && (
                      <div style={{ fontSize: 8, color: 'var(--cinnabar-bright)', fontWeight: 700, marginTop: 2 }}>✦ Chaos</div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Desktop table ── */}
      {!isMobile && (
        <GlassCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(201,146,11,0.15)' }}>
                  <th style={{ ...thStyle(), width: 50 }}>#</th>
                  <th style={thStyle('player')}>Cultivator</th>
                  <th style={thStyle('guild')}>Guild</th>
                  <th style={{ ...thStyle('cp'), textAlign: 'right' }}>CP</th>
                  <th style={{ ...thStyle('tribulation'), textAlign: 'center' }}>Tribulation</th>
                  <th style={{ ...thStyle('fdu'), textAlign: 'right' }} className="hidden lg:table-cell">FDU</th>
                  <th style={{ ...thStyle('fdd'), textAlign: 'right' }} className="hidden lg:table-cell">FDD</th>
                  <th style={{ ...thStyle('totalFinals'), textAlign: 'right' }} className="hidden lg:table-cell">Finals</th>
                  <th style={{ ...thStyle(), textAlign: 'center' }} className="hidden lg:table-cell">Chaos</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p, i) => {
                  const rank = (page - 1) * perPage + i + 1;
                  const isTop = rank <= 3;
                  const rowBg = isTop ? 'rgba(201,146,11,0.03)' : 'transparent';
                  return (
                    <motion.tr
                      key={p.uid}
                      className="table-row-hover"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: rowBg }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: i * 0.01 }}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                          fontSize: 9, fontWeight: 700, fontFamily: 'var(--font-title)',
                          background: rank === 1 ? 'rgba(201,146,11,0.2)'
                            : rank === 2 ? 'rgba(180,180,180,0.15)'
                            : rank === 3 ? 'rgba(201,100,24,0.2)'
                            : 'rgba(30,20,40,0.6)',
                          color: rank === 1 ? 'var(--gold-bright)'
                            : rank === 2 ? '#C0C0C0'
                            : rank === 3 ? '#CD7F32'
                            : 'var(--muted)',
                          border: rank <= 3 ? '1px solid rgba(201,146,11,0.3)' : '1px solid rgba(255,255,255,0.05)',
                        }}>{rank}</div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#EDE0C4', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.player}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'monospace', marginTop: 2 }}>
                          UID: {p.uid}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.guild || '—'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <span style={{
                          fontFamily: 'monospace', fontWeight: 700,
                          color: isTop ? 'var(--gold-bright)' : 'var(--azure-bright)',
                          textShadow: isTop ? '0 0 10px rgba(201,146,11,0.5)' : 'none',
                        }}>
                          {formatCP(p.cp)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 8px', borderRadius: 4,
                          fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                          color: tribColor(p.tribulation),
                          background: tribColor(p.tribulation) + '18',
                          border: `1px solid ${tribColor(p.tribulation)}30`,
                          letterSpacing: '0.05em',
                        }}>
                          {p.tribulation || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--jade-bright)', fontFamily: 'monospace', fontSize: 11 }} className="hidden lg:table-cell">
                        {p.fdu > 0 ? formatNumber(p.fdu) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--cinnabar-bright)', fontFamily: 'monospace', fontSize: 11 }} className="hidden lg:table-cell">
                        {p.fdd > 0 ? formatNumber(p.fdd) : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--muted)', fontFamily: 'monospace' }} className="hidden lg:table-cell">
                        {p.totalFinals > 0 ? p.totalFinals.toLocaleString() : '—'}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }} className="hidden lg:table-cell">
                        {p.hasChaos
                          ? <span style={{ fontSize: 10, color: 'var(--cinnabar-bright)', fontWeight: 700 }}>✦ YES</span>
                          : <span style={{ fontSize: 9, color: 'var(--muted)' }}>—</span>
                        }
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ── Pagination (shared) ── */}
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
            Page {page} / {totalPages}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                background: 'rgba(5,0,15,0.6)', color: 'var(--muted)',
                border: '1px solid rgba(201,146,11,0.15)', opacity: page <= 1 ? 0.3 : 1,
                transition: 'all 0.2s', fontFamily: 'var(--font-title)',
              }}>← Prev</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pn = i + 1;
              if (totalPages > 5) {
                if (page <= 3) pn = i + 1;
                else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                else pn = page - 2 + i;
              }
              const active = page === pn;
              return (
                <button key={pn} onClick={() => setPage(pn)}
                  style={{
                    width: 28, height: 28, borderRadius: 6, fontSize: 10, cursor: 'pointer',
                    background: active ? 'rgba(201,146,11,0.15)' : 'rgba(5,0,15,0.5)',
                    color: active ? 'var(--gold-bright)' : 'var(--muted)',
                    border: active ? '1px solid rgba(201,146,11,0.4)' : '1px solid rgba(255,255,255,0.05)',
                    fontFamily: 'var(--font-title)', fontWeight: active ? 700 : 400,
                    transition: 'all 0.2s',
                  }}>{pn}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{
                padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                background: 'rgba(5,0,15,0.6)', color: 'var(--muted)',
                border: '1px solid rgba(201,146,11,0.15)', opacity: page >= totalPages ? 0.3 : 1,
                transition: 'all 0.2s', fontFamily: 'var(--font-title)',
              }}>Next →</button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
