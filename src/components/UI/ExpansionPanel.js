import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ExpansionPanel = ({ trigger, children }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="expansion-wrapper">
      <button
        className="expansion-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="expansion-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExpansionPanel;
