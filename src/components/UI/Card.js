import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '', delay = 0 }) => {
  return (
    <motion.div
      className={`card ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      {children}
    </motion.div>
  );
};

export default Card;
