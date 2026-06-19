import { useState, useMemo, useEffect, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Matches from './components/Matches';
import Leaderboard from './components/Leaderboard';
import AdminPanel from './components/AdminPanel';
import StandingsTable from './components/StandingsTable';
import News from './components/News';
import initialMatches from './data/matches';
import { resolveAllMatches } from './data/standings';
import { useStorage } from './hooks/useStorage';
import { syncResults } from './services/api';

function App() {
  const [tab, setTab] = useState('dashboard');
  const [matchResults, setMatchResults] = useState({});
  const [syncState, setSyncState] = useState({ syncing: false, lastSync: null, error: null });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('resetAll')) {
      localStorage.clear();
      window.location.href = '/';
    }
  }, []);

  const { resolvedMatches, standings, bestThird } = useMemo(
    () => resolveAllMatches(initialMatches, matchResults),
    [matchResults]
  );

  const {
    users,
    predictions,
    getCurrentUser,
    login,
    register,
    logout,
    addPrediction,
    getPrediction,
    setAdminStatus,
    removeUser,
    updateProfile,
    resetAll,
    resetPassword,
    loadServerData,
  } = useStorage();

  useEffect(() => {
    loadServerData();
    const interval = setInterval(loadServerData, 30000);
    return () => clearInterval(interval);
  }, [loadServerData]);

  const curUser = getCurrentUser();
  const isAdmin = curUser?.isAdmin;
  const canViewAdmin = isAdmin;

  const handleUpdateResult = useCallback(async (matchId, homeScore, awayScore) => {
    const newResults = {
      ...matchResults,
      [matchId]: homeScore !== null && awayScore !== null
        ? { homeScore: Number(homeScore), awayScore: Number(awayScore), played: true }
        : {},
    };
    setMatchResults(newResults);
    try {
      await fetch('/api/save-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminName: curUser?.name, results: newResults }),
      });
    } catch {}
  }, [matchResults, curUser]);

  const handleSyncResults = useCallback(async () => {
    setSyncState(s => ({ ...s, syncing: true, error: null }));
    try {
      const data = await syncResults();
      if (data && data.results && Object.keys(data.results).length > 0) {
        setMatchResults(prev => {
          const merged = { ...prev };
          for (const [id, result] of Object.entries(data.results)) {
            merged[id] = result;
          }
          return merged;
        });
      }
      setSyncState({ syncing: false, lastSync: data?.lastSync || null, error: null });
    } catch (err) {
      setSyncState(s => ({ ...s, syncing: false, error: 'Servidor indisponível' }));
    }
  }, []);

  useEffect(() => {
    handleSyncResults();
    const interval = setInterval(handleSyncResults, 1000);
    return () => clearInterval(interval);
  }, [handleSyncResults]);

  const effectiveTab = !canViewAdmin && tab === 'admin' ? 'dashboard' : tab;

  useEffect(() => {
    if (!canViewAdmin && tab === 'admin') setTab('dashboard');
  }, [canViewAdmin, tab]);

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':
        return (
          <Dashboard
            users={users} predictions={predictions}
            matches={resolvedMatches} currentUser={curUser}
            matchResults={matchResults} onTabChange={setTab}
            standings={standings}
          />
        );
      case 'matches':
        return (
          <Matches
            matches={resolvedMatches}
            predictions={predictions} currentUser={curUser}
            addPrediction={addPrediction} getPrediction={getPrediction}
            matchResults={matchResults}
          />
        );
      case 'leaderboard':
        return (
          <Leaderboard
            users={users} predictions={predictions}
            matches={resolvedMatches} matchResults={matchResults}
            currentUser={curUser}
          />
        );
      case 'standings':
        return (
          <StandingsTable
            standings={standings} bestThird={bestThird}
            matches={initialMatches} matchResults={matchResults}
          />
        );
      case 'news':
        return <News />;
      case 'admin':
        if (!canViewAdmin) return <Dashboard
          users={users} predictions={predictions}
          matches={resolvedMatches} currentUser={curUser}
          matchResults={matchResults} onTabChange={setTab}
          standings={standings}
        />;
        return (
          <AdminPanel
            matches={resolvedMatches} matchResults={matchResults}
            onUpdateResult={handleUpdateResult} users={users}
            predictions={predictions} standings={standings}
            syncState={syncState} onSync={handleSyncResults}
            setAdminStatus={setAdminStatus} removeUser={removeUser}
            onResetAll={() => resetAll(curUser?.name)} resetPassword={resetPassword} currentUser={curUser}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <Header
        currentUser={curUser}
        onLogin={login}
        onRegister={register}
        onLogout={logout}
        onUpdateProfile={updateProfile}
        tab={effectiveTab}
        onTabChange={setTab}
      />
      <main className="main-content">
        {renderTab()}
      </main>
      <footer className="footer">
        <p>🏆 Copa do Mundo 2026 • Bolão de Palpites • Feito para boleiros e boleiras</p>
      </footer>
    </div>
  );
}

export default App;
