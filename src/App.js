import React, { createContext, Suspense, useMemo, useState, useCallback } from 'react';
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
import LandingPage from './pages/LandingPage.jsx';
import WorldEngine from './components/WorldEngine';
import ConstellationBg from './components/ConstellationBg';
import RealmTransition from './components/RealmTransition';
import { motion, AnimatePresence } from 'framer-motion'; // motion/AnimatePresence still used by LoadingScreen + LandingPage gate

export const PlayerContext = createContext([]);

/* ── Cinematic Loading Screen ──────────────────────────── */
const LoadingScreen = () => (
  <div className="loading-screen loading-screen--cinematic">
    {/* Single arc ring loader */}
    <div className="cultivation-loader">
      <svg className="cultivation-loader-svg" viewBox="0 0 88 88" aria-hidden="true">
        {/* Track ring */}
        <circle
          className="loader-arc-track"
          cx="44" cy="44" r="40"
          fill="none"
          stroke="rgba(201,151,58,1)"
          strokeWidth="2"
        />
        {/* Animated fill arc — stroke-dasharray 251 ≈ circumference of r=40 */}
        <circle
          className="loader-arc-fill"
          cx="44" cy="44" r="40"
          fill="none"
          stroke="rgba(201,151,58,0.85)"
          strokeWidth="2"
          strokeDasharray="251"
          strokeDashoffset="251"
          style={{ rotate: '-90deg' }}
        />
        {/* Center character */}
        <text
          className="loader-yy"
          x="44" y="52"
          textAnchor="middle"
          fill="rgba(201,151,58,0.65)"
          fontSize="22"
          fontFamily="serif"
        >
          仙
        </text>
      </svg>
    </div>

    <motion.div
      className="loading-cn-text"
      initial={{ opacity: 0, letterSpacing: '0.15em' }}
      animate={{ opacity: 1, letterSpacing: '0.55em' }}
      transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      仙 录 贯 通
    </motion.div>

    <motion.div
      className="loading-en-text"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.75, 0.45, 0.75] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
    >
      Channeling Celestial Records...
    </motion.div>
  </div>
);

/* ── App Inner ─────────────────────────────────────────── */
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
            marginTop: 16, padding: '9px 28px', borderRadius: 8,
            fontSize: 11, fontFamily: 'var(--font-title)', letterSpacing: '0.14em',
            textTransform: 'uppercase', cursor: 'pointer',
            background: 'rgba(201,146,11,0.10)', color: 'var(--gold-bright)',
            border: '1px solid rgba(201,146,11,0.45)',
            transition: 'all 0.22s', boxShadow: '0 0 16px rgba(201,146,11,0.18)',
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

function PageRoutes() {
  const location = useLocation();
  return (
    <>
      <RealmTransition />
      <Suspense fallback={<LoadingScreen />}>
        <Routes location={location}>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/rankings"    element={<PlayerRankings />} />
          <Route path="/guilds"      element={<GuildAnalytics />} />
          <Route path="/advanced"    element={<AdvancedStatistics />} />
          <Route path="/insights"    element={<VisualInsights />} />
          <Route path="/player/:uid" element={<PlayerProfile />} />
          <Route path="/bestiary"    element={<ChaosBestiary />} />
          <Route path="/compare"     element={<GuildComparison />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => {
  const [gateCleared, setGateCleared] = useState(
    () => sessionStorage.getItem('nacc-gate') === '1'
  );

  const handleEnter = useCallback(() => {
    sessionStorage.setItem('nacc-gate', '1');
    setGateCleared(true);
  }, []);

  return (
    <DataContextProvider>
      <WorldEngine />
      <AnimatePresence>
        {!gateCleared && <LandingPage key="gate" onEnter={handleEnter} />}
      </AnimatePresence>
      {gateCleared && <ConstellationBg />}
      {gateCleared && <AppInner />}
    </DataContextProvider>
  );
};

export default App;
