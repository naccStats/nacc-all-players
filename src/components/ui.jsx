import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import { DATA_AS_OF } from '../data-date';
import { beastSvg, cpHtml, crestSvg, logoSvg, rankSvg, tierHtml } from '../brand/glyphs';
import { beastColor } from '../utils/chartTheme';
import { ChevronRight } from 'lucide-react';
import { formatCP, formatInt } from '../utils/formatters';

export const cx = (...a) => a.filter(Boolean).join(' ');

/* The marks are drawn once, in brand/glyphs.js, for the app and the home page alike. */
const Raw = ({ html, className }) => <span className={cx('raw', className)} dangerouslySetInnerHTML={{ __html: html }} />;
export const Logo = () => <Raw html={logoSvg('app')} className="raw--logo" />;
export const Crest = React.memo(({ name, size }) => <Raw html={crestSvg(name, size)} />);
export const Rank = React.memo(({ rank, size }) => <Raw html={rankSvg(rank, size)} />);
export const Tier = React.memo(({ trib, short }) => <Raw html={tierHtml(trib, { short })} />);
export const AsOf = () => <span className="asof">As of {DATA_AS_OF}</span>;

/* Combat power, with a bar against the highest shown */
export const Cp = ({ value, max }) => (
  <span className="cp">
    <span dangerouslySetInnerHTML={{ __html: cpHtml(formatCP(value)) }} />
    {max > 0 && <i aria-hidden="true"><b style={{ width: `${Math.max(2, (value / max) * 100)}%` }} /></i>}
  </span>
);

export const Beast = ({ player }) => {
  if (!player.hasChaos) return <span className="muted">-</span>;
  const name = player.chaosBeast || 'Yes';
  return <span className="beast"><Raw html={beastSvg(name, beastColor(name))} />{name}</span>;
};

/* Crest, name and a quiet second line: how a player reads in every table */
export const Who = ({ guild, name, sub, to, size = 40 }) => (
  <span className="who-cell">
    <Crest name={guild} size={size} />
    <span>
      {to ? <Link className="who" to={to} onClick={(e) => e.stopPropagation()}>{name}</Link> : <span className="who">{name}</span>}
      {sub && <small>{sub}</small>}
    </span>
  </span>
);

/* Phones and small tablets: a list in place of a player table. players carry their rank. */
export const PlayerRows = ({ players }) => players.map((p) => (
  <Link key={p.uid} to={`/player/${p.uid}`} className={`row-sm top-${p.rank}`}>
    <span className="rank"><Rank rank={p.rank} size={36} /></span>
    <Crest name={p.guild} size={34} />
    <b>{p.player}</b>
    <Cp value={p.cp} />
    <small>{[p.guild || 'No guild', p.tribulation, p.totalFinals > 0 && `Finals ${formatInt(p.totalFinals)}`].filter(Boolean).join(', ')}</small>
  </Link>
));

/* The same for tables with many columns: one line a row, every column inside it. */
export const RowDetails = ({ mark, name, sub, value, rank, stats, children, open }) => (
  <details className={cx('row-more', rank && `top-${rank}`)} open={open}>
    <summary className="row-sm">
      {rank ? <span className="rank"><Rank rank={rank} size={36} /></span> : <ChevronRight className="row-sm__arrow" size={18} aria-hidden="true" />}
      <Crest name={mark} size={34} />
      <b>{name}</b>
      {value}
      <small>{sub}</small>
    </summary>
    <div className="row-more__body">
      <dl className="pairs">{stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {children}
    </div>
  </details>
);

export const PageHead = ({ title, lead, children, crest }) => (
  <header className="page-head">
    <div>
      <AsOf />
      {crest !== undefined && <div className="page-head__crest"><Crest name={crest} size={72} /></div>}
      <h1>{title}</h1>
      {lead && <p className="lead">{lead}</p>}
    </div>
    {children && <div className="page-head__side">{children}</div>}
  </header>
);

export const Card = ({ title, note, side, className, children }) => (
  <section className={cx('card', className)}>
    {(title || side) && (
      <div className="card__head">
        <div>
          {title && <h2>{title}</h2>}
          {note && <p>{note}</p>}
        </div>
        {side && <div className="card__side">{side}</div>}
      </div>
    )}
    {children}
  </section>
);

/* A row of plain figures: label, value, one line of context. */
export const Stats = ({ items }) => (
  <dl className="stats" style={{ '--n': items.length }}>
    {items.map(({ label, value, sub }) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
        {sub && <dd className="stats__sub">{sub}</dd>}
      </div>
    ))}
  </dl>
);

export const Seg = ({ label, value, onChange, options }) => (
  <div className="seg" role="group" aria-label={label}>
    {options.map((o) => (
      <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
        {o.label}
      </button>
    ))}
  </div>
);

export const Select = ({ label, value, onChange, options }) => {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
};

export const Field = ({ label, ...input }) => {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...input} />
    </div>
  );
};

export const Legend = ({ items }) => (
  <ul className="legend">
    {items.map(({ label, color }) => (
      <li key={label}><i style={{ background: color }} aria-hidden="true" />{label}</li>
    ))}
  </ul>
);

/* Ranked bars in HTML: one scale, every value printed beside its bar.
   rows: { key, label, sub, value, text, to, color, crest } */
export const Bars = ({ rows, max, ranked, focus }) => {
  const top = max || Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className={cx('bars', ranked && 'bars--ranked')}>
      {rows.map((r, i) => {
        const body = (
          <>
            {ranked && <span className="bars__rank"><Rank rank={i + 1} size={34} /></span>}
            <span className="bars__label">{r.crest !== undefined && <Crest name={r.crest} size={30} />}<span>{r.label}{r.sub && <small>{r.sub}</small>}</span></span>
            <span className="bars__track">
              <span
                className="bars__fill"
                style={{ width: `${Math.max(0.6, (r.value / top) * 100)}%`, background: r.color }}
              />
            </span>
            <span className="bars__value">{r.text}</span>
          </>
        );
        return (
          <li key={r.key} className={focus && focus !== r.key ? 'is-dim' : undefined}>
            {r.to ? <Link to={r.to} className="bars__row">{body}</Link> : <div className="bars__row">{body}</div>}
          </li>
        );
      })}
    </ol>
  );
};

export const Empty = ({ title, children }) => (
  <div className="empty">
    <h2>{title}</h2>
    {children}
  </div>
);
