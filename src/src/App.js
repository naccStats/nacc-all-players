import React, { createContext, Suspense, useMemo } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { DataContextProvider, useDataContext } from './context/DataContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import PlayerRankings from './pages/PlayerRankings';
import GuildAnalytics from './pages/GuildAnalytics';
import AdvancedStatistics from './pages/AdvancedStats';
import VisualInsights from './pages/VisualInsights';
import PlayerProfile from './pages/PlayerProfile';
import ChaosBestiary from './pages/ChaosBestiary';
import GuildComparison from './pages/GuildComparison';
import { motion, AnimatePresence } from 'framer-motion';

export const PlayerContext = createContext([]);

const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="loader-ring">
      <span className="loader-center">☯</span>
    </div>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0.6, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        fontFamily: 'var(--font-title)',
        fontSize: 11,
        letterSpacing: '0.22em',
        color: 'var(--gold-pale)',
      }}
    >
      Channeling Celestial Qi...
    </motion.p>
  </div>
);

const AppInner = () => {
  const { players, loading, error, retry } = useDataContext();
  const value = useMemo(() => players || [], [players]);

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="error-screen">
        <span style={{ fontSize: 32 }}>⚠</span>
        <h2 style={{ fontFamily: 'var(--font-title)', color: 'var(--cinnabar-bright)', letterSpacing: '0.1em' }}>
          Heavenly Record Lost
        </h2>
        <p style={{ maxWidth: 360, textAlign: 'center', lineHeight: 1.6 }}>{error}</p>
        <button
          onClick={retry}
          style={{
            marginTop: 16,
            padding: '8px 24px',
            borderRadius: 8,
            fontSize: 11,
            fontFamily: 'var(--font-title)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            background: 'rgba(201,146,11,0.1)',
            color: 'var(--gold-bright)',
            border: '1px solid rgba(201,146,11,0.4)',
            transition: 'all 0.2s',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <PlayerContext.Provider value={value}>
      <Layout>
        <PageRoutes />
      </Layout>
    </PlayerContext.Provider>
  );
};

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};
const pageTransition = { duration: 0.25, ease: 'easeOut' };

function PageRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        className="page-container"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
      >
        <Suspense fallback={<LoadingScreen />}>
          <Routes location={location}>
            <Route path="/"         element={<Dashboard />} />
            <Route path="/rankings" element={<PlayerRankings />} />
            <Route path="/guilds"   element={<GuildAnalytics />} />
            <Route path="/advanced" element={<AdvancedStatistics />} />
            <Route path="/insights" element={<VisualInsights />} />
            <Route path="/player/:uid" element={<PlayerProfile />} />
            <Route path="/bestiary"    element={<ChaosBestiary />} />
            <Route path="/compare"     element={<GuildComparison />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => (
  <DataContextProvider>
    <AppInner />
  </DataContextProvider>
);

export default App;
