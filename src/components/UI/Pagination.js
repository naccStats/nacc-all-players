import React from 'react';
import Card from './Card';
import { AnimatedCounter } from '../../hooks/useAnimatedCounter';

const StatCard = ({ label, value, icon, suffix = '', decimals = 0, delay = 0 }) => {
  return (
    <Card delay={delay} className="stat-card">
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <AnimatedCounter value={value} decimals={decimals} suffix={suffix} />
    </Card>
  );
};

export default StatCard;
