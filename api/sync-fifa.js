import { ok } from './_db.js';

const FIFA_API = 'https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&language=en&count=200';

const FIFA_TO_OURS = {
  MEX: 'MEXICO', RSA: 'AFRICA_SUL', KOR: 'COREIA_SUL', CZE: 'REP_TCHECA',
  CAN: 'CANADA', BIH: 'BOSNIA', QAT: 'CATAR', SUI: 'SUICA',
  BRA: 'BRASIL', MAR: 'MARROCOS', HAI: 'HAITI', SCO: 'ESCOCIA',
  USA: 'USA', PAR: 'PARAGUAI', AUS: 'AUSTRALIA', TUR: 'TURQUIA',
  GER: 'ALEMANHA', CUW: 'CURACAO', CIV: 'COSTA_MARFIM', ECU: 'EQUADOR',
  NED: 'HOLANDA', JPN: 'JAPAO', SWE: 'SUECIA', TUN: 'TUNISIA',
  BEL: 'BELGICA', EGY: 'EGITO', IRN: 'IRA', NZL: 'NOVA_ZELANDIA',
  ESP: 'ESPANHA', CPV: 'CABO_VERDE', KSA: 'ARABIA', URU: 'URUGUAI',
  FRA: 'FRANCA', SEN: 'SENEGAL', IRQ: 'IRAQUE', NOR: 'NORUEGA',
  ARG: 'ARGENTINA', ALG: 'ARGELIA', AUT: 'AUSTRIA', JOR: 'JORDANIA',
  POR: 'PORTUGAL', COD: 'RD_CONGO', UZB: 'UZBEQUISTAO', COL: 'COLOMBIA',
  ENG: 'INGLATERRA', CRO: 'CROACIA', GHA: 'GANA', PAN: 'PANAMA',
};

function parseLocalDate(str) {
  const parts = str.slice(0, 10).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  const d = new Date(str);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function matchInOurData(fifaMatch, ourMatches) {
  const homeCode = fifaMatch.Home?.Abbreviation;
  const awayCode = fifaMatch.Away?.Abbreviation;
  const ourHome = FIFA_TO_OURS[homeCode];
  const ourAway = FIFA_TO_OURS[awayCode];
  if (!ourHome || !ourAway) return null;
  const dateStr = parseLocalDate(fifaMatch.LocalDate || fifaMatch.Date);
  return ourMatches.find(m => m.homeTeam === ourHome && m.awayTeam === ourAway && m.date === dateStr) || null;
}

export default async (req, res) => {
  const results = {};
  let synced = 0;
  let fifaError = null;
  let triedFallback = false;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  // Try the main calendar endpoint
  try {
    const fifaRes = await fetch(FIFA_API, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (fifaRes.ok) {
      const data = await fifaRes.json();
      const { default: ourMatches } = await import('../src/data/matches.js');
      for (const fm of data.Results || []) {
        const match = matchInOurData(fm, ourMatches);
        if (!match) continue;
        if (fm.MatchStatus === 0 || fm.MatchStatus === 1) continue;
        const homeScore = fm.HomeTeamScore != null ? Number(fm.HomeTeamScore) : null;
        const awayScore = fm.AwayTeamScore != null ? Number(fm.AwayTeamScore) : null;
        const matchTime = fm.MatchTime != null ? Number(fm.MatchTime) : null;
        if (homeScore == null && matchTime == null) continue;
        const isFinished = fm.MatchStatus === 7 || fm.MatchStatus === 8 || fm.MatchStatus === 12 || fm.MatchStatus === 13;
        results[match.id] = { homeScore, awayScore, played: isFinished, matchTime, matchStatus: isFinished ? 'finished' : 'live' };
        synced++;
        if (supabaseUrl && supabaseKey && (homeScore != null || matchTime != null)) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/match_results`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'resolution=merge-duplicates' },
              body: JSON.stringify({ match_id: match.id, home_score: homeScore, away_score: awayScore, played: isFinished, match_time: matchTime, match_status: isFinished ? 'finished' : 'live', updated_at: new Date().toISOString() }),
            });
          } catch {}
        }
      }
    }
  } catch (e) { fifaError = e.message; }

  // If main API returned nothing, try alternative endpoints
  if (synced === 0) {
    for (const altUrl of [
      'https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&count=500',
      'https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=255711&language=en&count=200',
    ]) {
      try {
        const altRes = await fetch(altUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) });
        if (!altRes.ok) continue;
        const altData = await altRes.json();
        const { default: ourMatches } = await import('../src/data/matches.js');
        for (const fm of altData.Results || []) {
          const match = matchInOurData(fm, ourMatches);
          if (!match || results[match.id]) continue;
          const homeScore = fm.HomeTeamScore != null ? Number(fm.HomeTeamScore) : null;
          const awayScore = fm.AwayTeamScore != null ? Number(fm.AwayTeamScore) : null;
          const matchTime = fm.MatchTime != null ? Number(fm.MatchTime) : null;
          if (homeScore == null && matchTime == null) continue;
          const isFinished = fm.MatchStatus === 7 || fm.MatchStatus === 8 || fm.MatchStatus === 12 || fm.MatchStatus === 13;
          results[match.id] = { homeScore, awayScore, played: isFinished, matchTime, matchStatus: isFinished ? 'finished' : 'live' };
          synced++;
          if (supabaseUrl && supabaseKey && (homeScore != null || matchTime != null)) {
            try {
              await fetch(`${supabaseUrl}/rest/v1/match_results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Prefer': 'resolution=merge-duplicates' },
                body: JSON.stringify({ match_id: match.id, home_score: homeScore, away_score: awayScore, played: isFinished, match_time: matchTime, match_status: isFinished ? 'finished' : 'live', updated_at: new Date().toISOString() }),
              });
            } catch {}
          }
        }
        triedFallback = true;
        if (synced > 0) break;
      } catch {}
    }
  }

  ok(res, { success: true, synced, results, triedFallback, fifaError, lastSync: new Date().toISOString() });
};
