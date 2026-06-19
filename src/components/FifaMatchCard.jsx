import { useState, useEffect, useRef } from 'react';
import teams, { stageLabels } from '../data/teams';
import { isMatchLocked, getLockTimeRemaining, isMatchLive, getElapsedMinutes } from '../utils/lock';

function getGroupLabel(match) {
  if (match.stage === 'group') return `Grupo ${match.group}`;
  return stageLabels[match.stage] || match.stage || 'Group Stage';
}

function getMatchStatus(match, result) {
  if (result?.played) return 'finished';
  if (isMatchLive(match, result)) return 'live';
  return 'scheduled';
}

function getTeamName(teamKey) {
  const t = teams[teamKey];
  if (!t) return teamKey;
  return t.name;
}

function getBadgeUrl(teamKey) {
  const t = teams[teamKey];
  if (t?.code) {
    return `https://flagcdn.com/h60/${t.code.toLowerCase()}.png`;
  }
  return `https://flagcdn.com/h60/${teamKey}.png`;
}

function LiveTimer({ match }) {
  const [elapsed, setElapsed] = useState(() => getElapsedMinutes(match));

  useEffect(() => {
    const tick = () => setElapsed(getElapsedMinutes(match));
    tick();
    const id = setInterval(tick, 10000);
    return () => clearInterval(id);
  }, [match]);

  if (elapsed <= 0) return null;
  const minutes = Math.min(elapsed, 90);
  const extra = elapsed > 90 ? `+${elapsed - 90}` : '';
  return <span className="live-timer">{minutes}'{extra}</span>;
}

function CountdownLabel({ match }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function tick() {
      const remaining = getLockTimeRemaining(match);
      if (remaining <= 0) {
        setLabel('🔒 Fechado');
      } else if (remaining <= 30) {
        setLabel(`🔒 ${remaining}s`);
      } else if (remaining < 3600) {
        setLabel(`${Math.floor(remaining / 60)}min`);
      } else if (remaining < 86400) {
        setLabel(`${Math.floor(remaining / 3600)}h`);
      } else {
        setLabel(`${Math.floor(remaining / 86400)}d`);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [match]);

  return label ? <span className="fifa-card-countdown">{label}</span> : null;
}

function FifaMatchCard({ match, result, prediction, onClick }) {
  const status = getMatchStatus(match, result);
  const homeScore = result?.homeScore;
  const awayScore = result?.awayScore;
  const homeName = getTeamName(match.homeTeam);
  const awayName = getTeamName(match.awayTeam);
  const locked = status === 'finished' || (!result?.played && isMatchLocked(match));
  const live = status === 'live';

  return (
    <div className={`fifa-card ${locked ? 'fifa-card-locked' : ''} ${live ? 'fifa-card-live' : ''}`} onClick={() => !locked && onClick?.(match)} style={{ cursor: onClick && !locked ? 'pointer' : 'default' }}>
      <div className="fifa-card-header">
        <span className="fifa-card-round">{getGroupLabel(match)}</span>
        {live && <span className="fifa-card-live-tag">🔴 AO VIVO</span>}
        {locked && !live && <span className="fifa-card-lock-tag">🔒</span>}
      </div>

      <div className="fifa-card-body">
        <div className="fifa-card-match-info">
          <span className="fifa-card-match-num">Match {match.id}</span>
          {live && <LiveTimer match={match} />}
          {!result?.played && !live && <CountdownLabel match={match} />}
          <span className="fifa-card-date">{match.date}</span>
          {!live && <span className="fifa-card-time">{match.time}</span>}
        </div>

        <div className="fifa-card-teams">
          <div className="fifa-card-team">
            <div className="fifa-card-team-logo">
              <img src={getBadgeUrl(match.homeTeam)} alt={homeName} loading="lazy" />
            </div>
            <span className="fifa-card-team-name">{homeName}</span>
            <div className={`fifa-card-score ${live ? 'fifa-card-score-live' : ''} ${status === 'finished' ? 'fifa-card-score-finished' : ''}`}>
              {status !== 'scheduled' ? homeScore : '-'}
            </div>
          </div>

          <div className="fifa-card-team">
            <div className="fifa-card-team-logo">
              <img src={getBadgeUrl(match.awayTeam)} alt={awayName} loading="lazy" />
            </div>
            <span className="fifa-card-team-name">{awayName}</span>
            <div className={`fifa-card-score ${live ? 'fifa-card-score-live' : ''} ${status === 'finished' ? 'fifa-card-score-finished' : ''}`}>
              {status !== 'scheduled' ? awayScore : '-'}
            </div>
          </div>
        </div>

        <div className="fifa-card-location">
          <svg className="fifa-card-location-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>{match.venue}</span>
        </div>

        {prediction && !result?.played && (
          <div className="fifa-card-prediction">
            Seu palpite: {prediction.homeScore} x {prediction.awayScore}
          </div>
        )}
      </div>

      <div className="fifa-card-footer">
        <span>World Cup 2026</span>
        <span className="fifa-card-footer-id">M{match.id}</span>
      </div>
    </div>
  );
}

export default FifaMatchCard;
