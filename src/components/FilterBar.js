import React from 'react';

export const FilterSelect = ({ label, value, onChange, options }) => {
  return (
    <div className="filter-select">
      <label className="filter-label">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="filter-input"
        aria-label={label}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const FilterChip = ({ label, active, onClick }) => {
  return (
    <button
      className={`filter-chip ${active ? 'filter-chip--active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

const FilterBar = ({ children }) => (
  <div className="filter-bar">{children}</div>
);

export default FilterBar;
