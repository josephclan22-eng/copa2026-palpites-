import { useState, useEffect } from 'react';
import teams, { groups, stageLabels, getFlagUrl } from '../data/teams';
import { isMatchLocked } from '../utils/lock';

function AdminPanel({ matches, matchResults, onUpdateResult, users, predictions, syncState, onSync, setAdminStatus, removeUser, onResetAll, resetPassword, currentUser }) {
  const [adminTab, setAdminTab] = useState('jogos');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStage, setSelectedStage] = useState('');

  const filtered = matches.filter(m => {
    if (selectedGroup && m.group !== selectedGroup) return false;
    if (selectedStage && m.stage !== selectedStage) return false;
    return true;
  });

  const stages = ['group', 'round32', 'round16', 'quarter', 'semi', 'third', 'final'];

  const getPredictionCount = (matchId) => {
    let count = 0;
    Object.values(predictions).forEach(userPreds => {
      if (userPreds.some(p => p.matchId === matchId)) count++;
    });
    return count;
  };

  const syncLabel = syncState?.syncing ? 'Sincronizando...' :
    syncState?.lastSync ? 'Sincronizado' :
    'Sincronizar com FIFA';
  const syncClass = syncState?.syncing ? 'sync-btn syncing' :
    syncState?.lastSync ? 'sync-btn synced' : 'sync-btn';

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h2>⚙️ Painel <span>Administrativo</span></h2>
        <p className="admin-subtitle">Gerencie resultados, usuários e sincronia com a FIFA</p>
        <div className="admin-sync-bar">
          <button className={syncClass} onClick={onSync} disabled={syncState?.syncing}>
            {syncState?.syncing ? '🔄' : syncState?.lastSync ? '✅' : '📥'} {syncLabel}
          </button>
          {syncState?.lastSync && (
            <span className="sync-info">
              Última sincronia: {new Date(syncState.lastSync).toLocaleTimeString('pt-BR')}
            </span>
          )}
          {syncState?.error && (
            <span className="sync-error">Sync offline (backend não disponível no deploy estático)</span>
          )}
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${adminTab === 'jogos' ? 'active' : ''}`} onClick={() => setAdminTab('jogos')}>⚽ Jogos</button>
        <button className={`admin-tab ${adminTab === 'palpites' ? 'active' : ''}`} onClick={() => setAdminTab('palpites')}>📝 Palpites</button>
        <button className={`admin-tab ${adminTab === 'usuarios' ? 'active' : ''}`} onClick={() => setAdminTab('usuarios')}>👥 Usuários ({users.length})</button>
      </div>

      {adminTab === 'jogos' && (
        <>
          <div className="admin-filters">
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
              <option value="">Todos os grupos</option>
              {groups.map(g => <option key={g} value={g}>Grupo {g}</option>)}
            </select>
            <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
              <option value="">Todas as fases</option>
              {stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}
            </select>
          </div>
          <div className="admin-list">
            {filtered.map(m => {
              const home = teams[m.homeTeam];
              const away = teams[m.awayTeam];
              const result = matchResults[m.id];
              return (
                <AdminMatchRow
                  key={m.id}
                  match={m}
                  home={home}
                  away={away}
                  result={result}
                  predCount={getPredictionCount(m.id)}
                  onUpdate={onUpdateResult}
                />
              );
            })}
          </div>
        </>
      )}

      {adminTab === 'palpites' && (
        <AdminPredictions
          matches={matches}
          matchResults={matchResults}
          users={users}
          predictions={predictions}
        />
      )}

      {adminTab === 'usuarios' && (
        <AdminUsers
          users={users}
          currentUser={currentUser}
          setAdminStatus={setAdminStatus}
          removeUser={removeUser}
          resetPassword={resetPassword}
          onResetAll={onResetAll}
        />
      )}
    </div>
  );
}

function AdminUsers({ users, currentUser, setAdminStatus, removeUser, resetPassword, onResetAll }) {
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [resetTarget, setResetTarget] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const handleResetPassword = async () => {
    setResetMsg('');
    if (!resetTarget || !resetNewPass || resetNewPass.length < 3) {
      setResetMsg('Preencha todos os campos. Senha deve ter no mínimo 3 caracteres.');
      return;
    }
    const result = await resetPassword(currentUser?.name, resetTarget, resetNewPass);
    if (result.success) {
      setResetMsg(`✅ ${result.message}`);
      setResetTarget('');
      setResetNewPass('');
    } else {
      setResetMsg(`❌ ${result.error || 'Erro ao redefinir senha'}`);
    }
    setTimeout(() => setResetMsg(''), 4000);
  };

  return (
    <div className="admin-users-section">
      <div className="admin-users-header">
        <h3 className="admin-users-title">Usuários Cadastrados</h3>
        <div className="admin-users-actions-top">
          {confirmResetAll ? (
            <span className="admin-users-actions">
              <button className="admin-users-btn danger" onClick={handleResetAll}>Confirmar limpeza</button>
              <button className="admin-users-btn" onClick={() => setConfirmResetAll(false)}>Cancelar</button>
            </span>
          ) : (
            <button className="admin-users-btn danger-outline" onClick={() => setConfirmResetAll(true)}>Limpar todos</button>
          )}
        </div>
      </div>
      <p className="admin-users-info">Apenas o primeiro usuário cadastrado possui acesso administrativo. Não é possível promover outros usuários a admin.</p>
      <div className="admin-users-table-wrapper">
        <table className="admin-users-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Admin</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.name} className={currentUser?.name === u.name ? 'admin-users-row-me' : ''}>
                <td>{i + 1}</td>
                <td>{u.name} {currentUser?.name === u.name && <span className="admin-users-badge">Você</span>}</td>
                <td>{u.email || '-'}</td>
                <td>
                  {currentUser?.name === u.name ? (
                    <span className="admin-badge-static">Admin</span>
                  ) : (
                    <label className="admin-toggle" title={u.isAdmin ? 'Remover admin' : 'Tornar admin'}>
                      <input
                        type="checkbox"
                        checked={!!u.isAdmin}
                        onChange={() => setAdminStatus(currentUser?.name, u.name, !u.isAdmin)}
                      />
                      <span className="admin-toggle-slider"></span>
                    </label>
                  )}
                </td>
                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-BR') : '-'}</td>
                <td>
                  {currentUser?.name !== u.name && (
                    confirmRemove === u.name ? (
                      <span className="admin-users-actions">
                        <button className="admin-users-btn danger" onClick={() => { removeUser(currentUser?.name, u.name); setConfirmRemove(null); }}>Confirmar</button>
                        <button className="admin-users-btn" onClick={() => setConfirmRemove(null)}>Cancelar</button>
                      </span>
                    ) : (
                      <button className="admin-users-btn danger-outline" onClick={() => setConfirmRemove(u.name)}>Remover</button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-reset-section">
        <h3 className="admin-users-title">Redefinir Senha de Usuário</h3>
        <p className="admin-users-info">Digite o nome do usuário e a nova senha.</p>
        <div className="admin-reset-form">
          <input type="text" placeholder="Nome do usuário" value={resetTarget}
            onChange={(e) => setResetTarget(e.target.value)} className="login-input" />
          <input type="password" placeholder="Nova senha (mín. 3 caracteres)" value={resetNewPass}
            onChange={(e) => setResetNewPass(e.target.value)} className="login-input" />
          <button className="login-submit" onClick={handleResetPassword}>Redefinir Senha</button>
          {resetMsg && <p className="admin-reset-msg">{resetMsg}</p>}
        </div>
      </div>
    </div>
  );
}

function AdminMatchRow({ match, home, away, result, predCount, onUpdate }) {
  const [h, setH] = useState(result?.homeScore ?? '');
  const [a, setA] = useState(result?.awayScore ?? '');
  const locked = isMatchLocked(match);

  useEffect(() => {
    setH(result?.homeScore ?? '');
    setA(result?.awayScore ?? '');
  }, [result]);

  const isValidScore = (v) => v !== '' && !isNaN(Number(v)) && Number(v) >= 0;

  const autoSave = (newH, newA) => {
    if (locked) return;
    if (!isValidScore(newH) || !isValidScore(newA)) return;
    onUpdate(match.id, Number(newH), Number(newA));
  };

  const handleChangeH = (e) => {
    const val = e.target.value;
    setH(val);
    if (val !== '' && a !== '' && isValidScore(val) && isValidScore(a)) {
      autoSave(val, a);
    }
  };

  const handleChangeA = (e) => {
    const val = e.target.value;
    setA(val);
    if (h !== '' && val !== '' && isValidScore(h) && isValidScore(val)) {
      autoSave(h, val);
    }
  };

  const handleClear = () => {
    if (locked) return;
    setH('');
    setA('');
    onUpdate(match.id, null, null);
  };

  return (
    <div className={`admin-row ${result?.played ? 'has-result' : ''} ${locked ? 'admin-row-locked' : ''}`}>
      <div className="admin-match-info">
        <span className="admin-round">
          {match.stage === 'group' ? `Grupo ${match.group}` : stageLabels[match.stage]}
        </span>
        <span className="admin-date">{match.date}</span>
        {predCount > 0 && <span className="admin-pred-count">{predCount} palpites</span>}
        {result?.played && <span className="admin-auto-saved">✅ Auto</span>}
      </div>

      <div className="admin-teams">
        <span className="admin-team"><img src={getFlagUrl(home?.code)} className="flag-img" alt="" /> {home?.name || match.homeTeam}</span>
        <div className="admin-score-inputs">
          {locked ? (
            <span className="admin-locked-score">
              {result?.played ? `${result.homeScore} x ${result.awayScore}` : '🔒 Fechado'}
            </span>
          ) : (
            <>
              <input
                type="number"
                min="0"
                max="20"
                value={h}
                onChange={handleChangeH}
                placeholder="?"
                className="admin-score-input"
              />
              <span className="admin-score-x">x</span>
              <input
                type="number"
                min="0"
                max="20"
                value={a}
                onChange={handleChangeA}
                placeholder="?"
                className="admin-score-input"
              />
            </>
          )}
        </div>
        <span className="admin-team"><img src={getFlagUrl(away?.code)} className="flag-img" alt="" /> {away?.name || match.awayTeam}</span>
      </div>

      <div className="admin-actions">
        {!locked && result?.played && (
          <button className="admin-clear-btn" onClick={handleClear}>Limpar</button>
        )}
        {locked && result?.played && (
          <span className="admin-locked-label">✅ Finalizado</span>
        )}
        {locked && !result?.played && (
          <span className="admin-locked-label">🔒 Fechado</span>
        )}
      </div>
    </div>
  );
}

function AdminPredictions({ matches, matchResults, users, predictions }) {
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedMatch, setSelectedMatch] = useState(null);

  const stages = ['group', 'round32', 'round16', 'quarter', 'semi', 'third', 'final'];

  const filtered = matches.filter(m => {
    if (selectedGroup && m.group !== selectedGroup) return false;
    if (selectedStage && m.stage !== selectedStage) return false;
    const hasAnyPred = users.some(u => {
      const preds = predictions[u.name] || [];
      return preds.some(p => p.matchId === m.id);
    });
    return hasAnyPred;
  });

  const getPredsForMatch = (matchId) => {
    return users.map(u => {
      const preds = predictions[u.name] || [];
      const p = preds.find(x => x.matchId === matchId) || null;
      return { user: u, prediction: p };
    });
  };

  const resultLabel = (matchId) => {
    const r = matchResults[matchId];
    if (!r?.played) return null;
    return `${r.homeScore} x ${r.awayScore}`;
  };

  const predStatus = (pred, matchId) => {
    const r = matchResults[matchId];
    if (!pred || !r?.played) return null;
    const h = Number(pred.homeScore);
    const a = Number(pred.awayScore);
    const rh = Number(r.homeScore);
    const ra = Number(r.awayScore);
    if (h === rh && a === ra) return 'exato';
    const pd = h - a;
    const rd = rh - ra;
    if (pd === rd && (pd > 0 && rd > 0 || pd < 0 && rd < 0 || pd === 0 && rd === 0)) return 'vencedor';
    if (pd > 0 && rd > 0 || pd < 0 && rd < 0 || pd === 0 && rd === 0) return 'gols';
    return 'errado';
  };

  return (
    <div className="admin-predictions-section">
      <h3 className="admin-users-title">Palpites por Jogo</h3>
      <div className="admin-filters">
        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          <option value="">Todos os grupos</option>
          {groups.map(g => <option key={g} value={g}>Grupo {g}</option>)}
        </select>
        <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
          <option value="">Todas as fases</option>
          {stages.map(s => <option key={s} value={s}>{stageLabels[s]}</option>)}
        </select>
      </div>
      <div className="admin-pred-list">
        {filtered.map(m => {
          const home = teams[m.homeTeam];
          const away = teams[m.awayTeam];
          const rLabel = resultLabel(m.id);
          const expanded = selectedMatch === m.id;
          return (
            <div key={m.id} className={`admin-pred-card ${expanded ? 'expanded' : ''}`}>
              <div className="admin-pred-card-header" onClick={() => setSelectedMatch(expanded ? null : m.id)}>
                <span className="admin-round">{m.stage === 'group' ? `Grupo ${m.group}` : stageLabels[m.stage]} • M{m.id}</span>
                <span className="admin-pred-teams">{home?.name || m.homeTeam} vs {away?.name || m.awayTeam}</span>
                <span className="admin-pred-date">{m.date} {m.time}</span>
                {rLabel && <span className="admin-pred-result">Resultado: {rLabel}</span>}
                <span className="admin-pred-expand-icon">{expanded ? '▲' : '▼'}</span>
              </div>
              {expanded && (
                <div className="admin-pred-detail">
                  <table className="admin-pred-table">
                    <thead>
                      <tr>
                        <th>Participante</th>
                        <th>Palpite</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPredsForMatch(m.id).map(({ user, prediction }) => {
                        const status = predStatus(prediction, m.id);
                        return (
                          <tr key={user.name}>
                            <td>{user.name}</td>
                            <td>{prediction ? `${prediction.homeScore} x ${prediction.awayScore}` : '—'}</td>
                            <td>
                              {status === 'exato' && <span className="admin-pred-status exato">✅ Exato</span>}
                              {status === 'vencedor' && <span className="admin-pred-status vencedor">✓ Vencedor</span>}
                              {status === 'gols' && <span className="admin-pred-status gols">~ Gols</span>}
                              {status === 'errado' && <span className="admin-pred-status errado">✗ Errado</span>}
                              {!status && prediction && <span className="admin-pred-status pendente">⏳</span>}
                              {!prediction && <span className="admin-pred-status sem">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="empty-msg">Nenhum palpite registrado ainda.</p>}
      </div>
    </div>
  );
}

export default AdminPanel;
