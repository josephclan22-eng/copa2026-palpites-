import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { supabase } from './lib/supabase';

function App() {
  const [tab, setTab] = useState('dashboard');
  const [matchResults, setMatchResults] = useState({});
  const [syncState, setSyncState] = useState({ syncing: false, lastSync: null, error: null });

  const [showResetForm, setShowResetForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('resetAll')) {
      localStorage.clear();
      window.location.href = '/';
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (params.get('type') === 'recovery' && hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        }).then(() => setShowResetForm(true));
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (!newPassword || newPassword.length < 3) {
      setResetError('Senha deve ter no mínimo 3 caracteres');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setResetError('Senhas não conferem');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setResetError(error.message);
    } else {
      setResetSuccess('Senha alterada com sucesso!');
      setTimeout(() => {
        setShowResetForm(false);
        setNewPassword('');
        setNewPasswordConfirm('');
      }, 2000);
    }
  };

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
    loadServerData,
    recalculateAllPoints,
  } = useStorage();

  useEffect(() => {
    loadServerData();
    const interval = setInterval(loadServerData, 60000);
    return () => clearInterval(interval);
  }, []);

  const curUser = getCurrentUser();
  const isAdmin = curUser?.is_admin;
  const canViewAdmin = isAdmin;

  const [saveErrors, setSaveErrors] = useState({});

  const handleUpdateResult = useCallback(async (matchId, homeScore, awayScore, extra = {}) => {
    const hasScore = homeScore !== null && awayScore !== null;
    const newResults = {
      ...matchResults,
      [matchId]: hasScore
        ? { homeScore: Number(homeScore), awayScore: Number(awayScore), played: true, ...extra }
        : {},
    };
    setMatchResults(newResults);

    const payload = { match_id: Number(matchId), updated_at: new Date().toISOString() };
    if (hasScore) {
      payload.home_score = Number(homeScore);
      payload.away_score = Number(awayScore);
      payload.played = true;
    }
    if (extra.matchTime !== undefined) payload.match_time = extra.matchTime;
    if (extra.matchStatus !== undefined) payload.match_status = extra.matchStatus;
    if (extra.homeGoals !== undefined) payload.home_goals = extra.homeGoals;
    if (extra.awayGoals !== undefined) payload.away_goals = extra.awayGoals;

    const { error } = await supabase.from('match_results').upsert(payload, { onConflict: 'match_id' });
    if (error) {
      setSaveErrors(e => ({ ...e, [matchId]: error.message }));
      setTimeout(() => setSaveErrors(e => { const n = { ...e }; delete n[matchId]; return n; }), 4000);
    }
  }, [matchResults]);

  const handleSyncResults = useCallback(async () => {
    setSyncState(s => ({ ...s, syncing: true, error: null }));
    try {
      await fetch('/api/sync-fifa').catch(() => {});
      const { data } = await supabase.from('match_results').select('*');
      if (data) {
        const results = {};
        for (const r of data) {
          results[r.match_id] = {
            homeScore: r.home_score, awayScore: r.away_score, played: r.played,
            matchTime: r.match_time, matchStatus: r.match_status,
          };
        }
        setMatchResults(prev => {
          const prevStr = JSON.stringify(prev);
          const newStr = JSON.stringify(results);
          return prevStr === newStr ? prev : results;
        });
      }
      recalculateAllPoints();
      setSyncState({ syncing: false, lastSync: new Date().toISOString(), error: null });
    } catch {
      setSyncState(s => ({ ...s, syncing: false, error: 'Erro ao carregar resultados' }));
    }
  }, []);

  useEffect(() => {
    handleSyncResults();
    const interval = setInterval(handleSyncResults, 2000);
    return () => clearInterval(interval);
  }, [handleSyncResults]);

  useEffect(() => {
    const interval = setInterval(recalculateAllPoints, 2000);
    return () => clearInterval(interval);
  }, [recalculateAllPoints]);

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
            onResetAll={() => resetAll(curUser?.name)} currentUser={curUser}
            saveErrors={saveErrors}
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

      {showResetForm && (
        <div className="reset-overlay">
          <div className="reset-modal">
            <h2>Criar Nova Senha</h2>
            {resetError && <p className="reset-error">{resetError}</p>}
            {resetSuccess && <p className="reset-success">{resetSuccess}</p>}
            {!resetSuccess && (
              <form onSubmit={handleResetPassword}>
                <input type="password" placeholder="Nova senha (mín. 3 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="reset-input" autoFocus />
                <input type="password" placeholder="Confirmar nova senha"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="reset-input" />
                <button type="submit" className="reset-submit">Alterar Senha</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
