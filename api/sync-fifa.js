import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
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

async function loadOurMatches() {
  try {
    const dataPath = join(process.cwd(), 'src', 'data', 'matches.js');
    if (existsSync(dataPath)) {
      const content = readFileSync(dataPath, 'utf8');
      const match = content.match(/export\s+default\s+(\[[\s\S]*?\]);/);
      if (match) {
        return JSON.parse(match[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
      }
    }
  } catch {}
  return [];
}

export default async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const results = {};
  let synced = 0;
  let error = null;

  try {
    const fifaRes = await fetch(FIFA_API, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (fifaRes.ok) {
      const data = await fifaRes.json();
      const ourMatches = await loadOurMatches();
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

      for (const fm of data.Results || []) {
        const homeCode = fm.Home?.Abbreviation;
        const awayCode = fm.Away?.Abbreviation;
        const ourHome = FIFA_TO_OURS[homeCode];
        const ourAway = FIFA_TO_OURS[awayCode];
        if (!ourHome || !ourAway) continue;

        const dateStr = parseLocalDate(fm.LocalDate || fm.Date);
        const match = ourMatches.find(m => m.homeTeam === ourHome && m.awayTeam === ourAway && m.date === dateStr);
        if (!match) continue;

        if (fm.MatchStatus === 0 || fm.MatchStatus === 1) continue;

        const homeScore = fm.HomeTeamScore != null ? Number(fm.HomeTeamScore) : null;
        const awayScore = fm.AwayTeamScore != null ? Number(fm.AwayTeamScore) : null;
        const matchTime = fm.MatchTime != null ? Number(fm.MatchTime) : null;
        const isFinished = fm.MatchStatus === 7 || fm.MatchStatus === 8;

        results[match.id] = {
          homeScore, awayScore,
          played: isFinished,
          matchTime,
          matchStatus: isFinished ? 'finished' : 'live',
        };

        if (supabaseUrl && supabaseKey && (homeScore != null || matchTime != null)) {
          try {
            await fetch(`${supabaseUrl}/rest/v1/match_results`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'resolution=merge-duplicates',
              },
              body: JSON.stringify({
                match_id: match.id,
                home_score: homeScore,
                away_score: awayScore,
                played: isFinished,
                match_time: matchTime,
                match_status: isFinished ? 'finished' : 'live',
                updated_at: new Date().toISOString(),
              }),
            });
          } catch {}
        }
        synced++;
      }
    }
  } catch (e) {
    error = e.message;
  }

  ok(res, { success: true, synced, results, error, lastSync: new Date().toISOString() });
};
