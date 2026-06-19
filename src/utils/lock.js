const LOCK_SECONDS = 10;

function getMatchTimestamp(match) {
  const [day, month] = match.date.split('/');
  const [hour, minute] = match.time.split(':');
  return new Date(2026, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).getTime();
}

export function isMatchLocked(match) {
  try {
    const diffMs = getMatchTimestamp(match) - Date.now();
    return diffMs <= LOCK_SECONDS * 1000;
  } catch {
    return false;
  }
}

export function getLockTimeRemaining(match) {
  try {
    const diffMs = getMatchTimestamp(match) - Date.now();
    const diffSeconds = Math.floor(diffMs / 1000);
    return diffSeconds;
  } catch {
    return Infinity;
  }
}

export function isMatchLive(match, result) {
  if (!match) return false;
  if (result?.played) return false;
  const now = Date.now();
  const matchTime = getMatchTimestamp(match);
  const matchEnd = matchTime + 2 * 60 * 60 * 1000;
  return now >= matchTime && now <= matchEnd;
}

export function getElapsedMinutes(match) {
  try {
    const matchTime = getMatchTimestamp(match);
    const now = Date.now();
    if (now < matchTime) return 0;
    return Math.floor((now - matchTime) / 60000);
  } catch {
    return 0;
  }
}
