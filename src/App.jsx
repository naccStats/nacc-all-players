import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DataContextProvider, useDataContext } from './context/DataContext';
import Shell from './components/Shell';

/* Each page is its own chunk, so the chart libraries load only where a chart is drawn. */
const Overview = lazy(() => import('./pages/Overview'));
const Players = lazy(() => import('./pages/Players'));
const Guilds = lazy(() => import('./pages/Guilds'));
const Compare = lazy(() => import('./pages/Compare'));
const Beasts = lazy(() => import('./pages/Beasts'));
const Insights = lazy(() => import('./pages/Insights'));
const Advanced = lazy(() => import('./pages/Advanced'));
const Profile = lazy(() => import('./pages/Profile'));

const Loading = () => (
  <>
    <span className="sr-only" role="status">Loading</span>
    <div className="skeleton" style={{ height: 120 }} />
    <div className="skeleton" style={{ height: 480 }} />
  </>
);

function Pages() {
  const { loading, error, retry } = useDataContext();
  if (error) {
    return (
      <div className="notice" role="alert">
        <h1>The player file did not load</h1>
        <p>{error}</p>
        <button type="button" className="btn btn--primary" onClick={retry}>Try again</button>
      </div>
    );
  }
  return (
    <Shell>
      {loading ? <Loading /> : (
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/rankings" element={<Players />} />
            <Route path="/guilds" element={<Guilds />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/bestiary" element={<Beasts />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/advanced" element={<Advanced />} />
            <Route path="/player/:uid" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      )}
    </Shell>
  );
}

export default function App() {
  return (
    <DataContextProvider>
      <Pages />
    </DataContextProvider>
  );
}
