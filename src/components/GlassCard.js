import React from 'react';

/* Left editorial accent bar color per variant */
const variantBarColors = {
  default: 'rgba(201,151,58,0.55)',
  gold:    'rgba(201,151,58,0.80)',
  cyan:    'rgba(40,130,200,0.70)',
  purple:  'rgba(129,72,168,0.70)',
  red:     'rgba(179,58,42,0.70)',
  jade:    'rgba(25,168,112,0.70)',
};

const GlassCard = ({
  children,
  className = '',
  variant   = 'default',
  onClick,
  style,
  ...props
}) => {
  const variantClass = variant && variant !== 'default' ? `glass-card--${variant}` : '';
  const barColor     = variantBarColors[variant] || variantBarColors.default;

  const parts        = className ? className.split(' ') : [];
  const outerClasses = parts.filter(c => !c.startsWith('glass-card--')).join(' ');
  const innerExtra   = parts.filter(c =>  c.startsWith('glass-card--')).join(' ');

  return (
    <div
      className={outerClasses}
      data-reveal
      style={style}
      {...props}
    >
      <div
        className={['glass-card', variantClass, innerExtra, onClick ? 'cursor-pointer' : ''].filter(Boolean).join(' ')}
        onClick={onClick}
        style={{ position: 'relative', height: '100%' }}
      >
        {/* Editorial left accent bar */}
        <span
          className="glass-accent-bar"
          aria-hidden="true"
          style={{ background: `linear-gradient(180deg, ${barColor}, transparent)` }}
        />

        <span className="glass-shimmer" aria-hidden="true" />

        {children}
      </div>
    </div>
  );
};

export default React.memo(GlassCard);
