const LOCK_MINUTES = 10;

function getMatchTimestamp(match) {
  const [day, month] = match.date.split('/');
  const [hour, minute] = match.time.split(':');
  return new Date(2026, parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute)).getTime();
}

export function isMatchLocked(match) {
  try {
    const diffMs = getMatchTimestamp(match) - Date.now();
    return diffMs <= LOCK_MINUTES * 60 * 1000;
  } catch {
    return false;
  }
}

export function getLockTimeRemaining(match) {
  try {
    const diffMs = getMatchTimestamp(match) - Date.now();
    const diffMinutes = Math.floor(diffMs / 60000);
    return diffMinutes;
  } catch {
    return Infinity;
  }
}
