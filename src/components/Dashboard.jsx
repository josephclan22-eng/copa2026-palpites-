import { useState } from 'react';
import { calculateAllPoints } from '../data/scoring';
import teams, { getFlagUrl } from '../data/teams';

function BrazilBanner({ match, onClose }) {
  const isHome = match.homeTeam === 'BRASIL';
  const opponent = isHome ? match.awayTeam : match.homeTeam;
  const oppData = teams[opponent];
  const oppName = oppData?.name || opponent;
  const venue = match.venue || '';
  const braData = teams['BRASIL'];

  return (
    <div className="brazil-banner">
      <img src="/brazil-banner-bg.png" alt="" className="brazil-banner-bg" />
      <button className="brazil-banner-close" onClick={onClose}>✕</button>
      <div className="brazil-banner-content">
        <div className="brazil-banner-flags">
          <div className="brazil-banner-flag-wrapper">
            <img src={getFlagUrl(braData?.code, 80)} alt="Brasil" className="brazil-banner-flag" />
          </div>
          <span className="brazil-banner-vs">VS</span>
          <div className="brazil-banner-flag-wrapper">
            <img src={getFlagUrl(oppData?.code, 80)} alt={oppName} className="brazil-banner-flag" />
          </div>
        </div>
        <div className="brazil-banner-info">
          <h3>HOJE TEM JOGO DO BRASIL!</h3>
          <p className="brazil-banner-match">
            <span className="brazil-banner-team-name">Brasil</span>
            <span className="brazil-banner-x">×</span>
            <span className="brazil-banner-team-name">{oppName}</span>
          </p>
          <p className="brazil-banner-details">{match.time} • {venue}</p>
          <p className="brazil-banner-message">
            Vamos com tudo! Faça seu palpite e torça junto! 🇧🇷🙌
          </p>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ users, predictions, matches, currentUser, matchResults, onTabChange, standings }) {
  const [brazilDismissed, setBrazilDismissed] = useState(() => !!sessionStorage.getItem('brazilBannerDismissed'));

  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`;
  const brazilMatch = matches.find(m =>
    (m.homeTeam === 'BRASIL' || m.awayTeam === 'BRASIL') &&
    m.date === todayStr
  );

  const handleDismissBanner = () => {
    sessionStorage.setItem('brazilBannerDismissed', '1');
    setBrazilDismissed(true);
  };
  const userPoints = calculateAllPoints(predictions, matches.map(m => ({
    ...m,
    ...(matchResults[m.id] || {}),
  })));

  const allWithPoints = users.map(u => [u.name, userPoints[u.name] || 0]);
  const sorted = allWithPoints
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const nextMatches = matches
    .filter(m => !matchResults[m.id]?.played)
    .slice(0, 5);

  const userPreds = currentUser ? predictions[currentUser.name] || [] : [];
  const predCount = userPreds.length;
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => matchResults[m.id]?.played).length;

  return (
    <div className="dashboard">
      {brazilMatch && !brazilDismissed && currentUser && (
        <BrazilBanner match={brazilMatch} onClose={handleDismissBanner} />
      )}
      {currentUser && sorted.length >= 3 && (
        <div className="top3-section">
          <div className="top3-header">
            <span className="top3-crown">👑</span>
            <h2>PODIUM</h2>
            <span className="top3-crown">👑</span>
          </div>
          <div className="top3-podium">
            <div className="top3-item top3-second">
              <div className="top3-medal">🥈</div>
              <div className="top3-avatar">{sorted[1][0].charAt(0).toUpperCase()}</div>
              <div className="top3-name">{sorted[1][0]}</div>
              <div className="top3-pts">{sorted[1][1]} pts</div>
              <div className="top3-bar second-bar">2º</div>
            </div>
            <div className="top3-item top3-first">
              <div className="top3-medal">🥇</div>
              <div className="top3-crown-icon">👑</div>
              <div className="top3-avatar first-avatar">{sorted[0][0].charAt(0).toUpperCase()}</div>
              <div className="top3-name first-name">{sorted[0][0]}</div>
              <div className="top3-pts first-pts">{sorted[0][1]} pts</div>
              <div className="top3-bar first-bar">1º</div>
            </div>
            <div className="top3-item top3-third">
              <div className="top3-medal">🥉</div>
              <div className="top3-avatar">{sorted[2][0].charAt(0).toUpperCase()}</div>
              <div className="top3-name">{sorted[2][0]}</div>
              <div className="top3-pts">{sorted[2][1]} pts</div>
              <div className="top3-bar third-bar">3º</div>
            </div>
          </div>
        </div>
      )}
      {currentUser && (
        <>
          <div className="dashboard-welcome">
            <div className="stats-row">
              <div className="stat-card">
                <span className="stat-icon">📝</span>
                <span className="stat-value">{predCount}/{totalMatches}</span>
                <span className="stat-label">Palpites</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">✅</span>
                <span className="stat-value">{completedMatches}</span>
                <span className="stat-label">Jogos Realizados</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">⭐</span>
                <span className="stat-value">{userPoints[currentUser.name] || 0}</span>
                <span className="stat-label">Seus Pontos</span>
              </div>
              <div className="stat-card">
                <span className="stat-icon">👥</span>
                <span className="stat-value">{users.length}</span>
                <span className="stat-label">Participantes</span>
              </div>
            </div>
          </div>
        </>
      )}

      {!currentUser && (
        <div className="dashboard-welcome">
          <h2>Bem-vindo ao Bolão Copa 2026! 🏆</h2>
          <p className="dashboard-subtitle">
            Faça seus palpites, acompanhe os jogos e suba no ranking!
          </p>
          <p className="dashboard-hint">
            Clique em <strong>Entrar</strong> no canto superior direito para começar.
          </p>
          <div className="quick-rules">
            <h3>📋 Regras de Pontuação</h3>
            <ul>
              <li><span className="points-badge gold">15</span>Placar exato</li>
              <li><span className="points-badge green">10</span>Vencedor + diferença de gols</li>
              <li><span className="points-badge light-green">7</span>Vencedor correto</li>
              <li><span className="points-badge orange">5</span>Acertar placar de um time</li>
              <li><span className="points-badge gray">2</span>Aproximação (total de gols)</li>
            </ul>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dash-section">
          <div className="section-header">
            <h3>📅 Próximos Jogos</h3>
            <button className="see-all-btn" onClick={() => onTabChange('matches')}>Ver todos</button>
          </div>
          <div className="next-matches">
            {nextMatches.length === 0 && <p className="empty-msg">Nenhum jogo restante!</p>}
            {nextMatches.map(m => {
              const home = teams[m.homeTeam];
              const away = teams[m.awayTeam];
              const hasPred = currentUser && userPreds.some(p => p.matchId === m.id);
              return (
                <div key={m.id} className="next-match-card" onClick={() => onTabChange('matches')}>
                  <div className="next-match-teams">
                    <span className="next-team"><img src={getFlagUrl(home?.code)} className="flag-img" alt="" /> {home?.name || m.homeTeam}</span>
                    <span className="next-vs">vs</span>
                    <span className="next-team"><img src={getFlagUrl(away?.code)} className="flag-img" alt="" /> {away?.name || m.awayTeam}</span>
                  </div>
                  <div className="next-match-info">
                    <span>{m.date} • {m.time}</span>
                    <span className={`pred-status ${hasPred ? 'done' : ''}`}>
                      {hasPred ? '✅ Palpite feito' : '⏳ Pendente'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dash-section">
          <div className="section-header">
            <h3>🏅 Top 10 Ranking</h3>
            <button className="see-all-btn" onClick={() => onTabChange('leaderboard')}>Ver completo</button>
          </div>
          <div className="mini-leaderboard">
            {sorted.length === 0 && <p className="empty-msg">Ninguém pontuou ainda.</p>}
            {sorted.map(([userName, pts], i) => {
              const u = users.find(user => user.name === userName);
              if (!u) return null;
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
              return (
                <div key={userName} className={`mini-rank-row ${currentUser?.name === userName ? 'is-me' : ''}`}>
                  <span className="mini-rank-pos">{medal}</span>
                  <span className="mini-rank-name">{u.name}</span>
                  <span className="mini-rank-pts">{pts} pts</span>
                </div>
              );
            })}
          </div>
        </div>

        {standings && Object.keys(standings).length > 0 && (
          <div className="dash-section">
            <div className="section-header">
              <h3>📊 Líderes dos Grupos</h3>
              <button className="see-all-btn" onClick={() => onTabChange('standings')}>Ver tudo</button>
            </div>
            <div className="group-leaders">
              {Object.entries(standings).sort().slice(0, 6).map(([group, teamsList]) => {
                if (teamsList.length === 0) return null;
                const leader = teamsList[0];
                const teamInfo = teams[leader.team];
                return (
                  <div key={group} className="group-leader-card">
                    <span className="gl-group">Grupo {group}</span>
                    <div className="gl-team">
                      <img src={getFlagUrl(teamInfo?.code)} className="flag-img" alt="" />
                      <span className="gl-name">{teamInfo?.name || leader.team}</span>
                    </div>
                    <span className="gl-pts">{leader.pts} pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
