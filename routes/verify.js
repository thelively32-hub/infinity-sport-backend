// routes/verify.js
// Verifies a past date's picks against actual game results
// Returns: for each pick player, whether they hit OVER/UNDER prediction

const router = require('express').Router();
const pool = require('../db/index');
const { vibrationPerson } = require('../numerology');
const { getTeamsPlayingOn } = require('../utils/schedule');

// Simple in-memory cache (key: date, value: verification result)
const verifyCache = new Map();

// Helper: fetch gameLog from MLB API, cache by (mlbId, season, group)
const gameLogCache = new Map();
async function fetchGameLog(mlbId, season, group) {
  const key = `${mlbId}:${season}:${group}`;
  if (gameLogCache.has(key)) return gameLogCache.get(key);
  try {
    const url = `https://statsapi.mlb.com/api/v1/people/${mlbId}/stats?stats=gameLog&season=${season}&group=${group}&sportId=1`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const data = await r.json();
    const splits = data.stats?.[0]?.splits || [];
    gameLogCache.set(key, splits);
    // Evict old entries if map grows too big
    if (gameLogCache.size > 300) {
      const first = gameLogCache.keys().next().value;
      gameLogCache.delete(first);
    }
    return splits;
  } catch(e) {
    return [];
  }
}

// Core: compute picks for a given date + verify against actual outcomes
async function computePicksWithVerification(targetDate) {
  // Filter to teams that actually played on targetDate
  const { mlbIds: playingMlbIds } = await getTeamsPlayingOn(targetDate);
  if (!playingMlbIds.length) {
    return {
      date: targetDate, isHistorical: targetDate < new Date().toISOString().split('T')[0],
      over: [], under: [],
      summary: { overTotal: 0, overHits: 0, overAccuracy: null, underTotal: 0, underHits: 0, underAccuracy: null, totalAnalyzed: 0 },
    };
  }

  const { rows: players } = await pool.query(`
    SELECT p.*, t.name as team_name, t.abbr, t.colors
    FROM players p
    JOIN teams t ON p.team_id = t.id
    WHERE p.season = 2026 AND p.mlb_id IS NOT NULL AND t.mlb_id = ANY($1)
    ORDER BY p.name
  `, [playingMlbIds]);

  const results = [];
  const isHistorical = targetDate < new Date().toISOString().split('T')[0];

  for (const player of players) {
    try {
      const vToday = vibrationPerson(player.birth_date, targetDate);
      const isPitcher = ['SP','RP','P'].includes(player.position||'');
      const group = isPitcher ? 'pitching' : 'hitting';

      // Historical 2025 gameLog for the prediction (same as today.js)
      const splits2025 = await fetchGameLog(player.mlb_id, 2025, group);
      if (splits2025.length < 10) continue;

      // Group 2025 stats by vibration
      const vibStats = {};
      for (let v=1;v<=9;v++) vibStats[v] = isPitcher
        ? {G:0,W:0,L:0}
        : {G:0,H:0,HR:0,RBI:0,K:0,AB:0};

      for (const s of splits2025) {
        if (!s.date) continue;
        const v = vibrationPerson(player.birth_date, s.date);
        if (v<1||v>9) continue;
        vibStats[v].G++;
        if (isPitcher) {
          vibStats[v].W += s.stat?.wins||0;
          vibStats[v].L += s.stat?.losses||0;
        } else {
          vibStats[v].H   += s.stat?.hits||0;
          vibStats[v].HR  += s.stat?.homeRuns||0;
          vibStats[v].RBI += s.stat?.rbi||0;
          vibStats[v].K   += s.stat?.strikeOuts||0;
          vibStats[v].AB  += s.stat?.atBats||0;
        }
      }

      // Compute averages across all vibrations (season-wide)
      let totalG=0, totalH=0, totalHR=0, totalRBI=0, totalW=0, totalL=0;
      for (let v=1;v<=9;v++) {
        const s = vibStats[v];
        totalG += s.G;
        if (!isPitcher) { totalH+=s.H; totalHR+=s.HR; totalRBI+=s.RBI; }
        else { totalW+=s.W; totalL+=s.L; }
      }
      if (totalG === 0) continue;

      const avgH   = totalH/totalG;
      const avgHR  = totalHR/totalG;
      const avgRBI = totalRBI/totalG;
      const avgWpct = totalG>0 ? totalW/(totalW+totalL||1) : 0;

      const todayStats = vibStats[vToday];
      if (!todayStats || todayStats.G < 5) continue;

      // Prediction score (same formula as today.js)
      let score = 0;
      if (isPitcher) {
        const todayWpct = todayStats.G>0 ? todayStats.W/(todayStats.W+todayStats.L||1) : 0;
        score = avgWpct > 0 ? ((todayWpct - avgWpct) / avgWpct) * 100 : 0;
      } else {
        const todayAvgH = todayStats.H/todayStats.G;
        const todayAvgHR = todayStats.HR/todayStats.G;
        const todayAvgRBI = todayStats.RBI/todayStats.G;
        if (avgH > 0)   score += ((todayAvgH - avgH) / avgH) * 50;
        if (avgHR > 0)  score += ((todayAvgHR - avgHR) / avgHR) * 30;
        if (avgRBI > 0) score += ((todayAvgRBI - avgRBI) / avgRBI) * 20;
      }

      const trend = score >= 20 ? 'OVER' : score <= -20 ? 'UNDER' : 'EVEN';

      // Only include OVER/UNDER picks
      if (trend === 'EVEN') continue;

      // If historical, fetch 2026 gameLog and find the game on targetDate
      let actualGame = null, hit = null;
      if (isHistorical) {
        const splits2026 = await fetchGameLog(player.mlb_id, 2026, group);
        const dayGame = splits2026.find(s => s.date === targetDate);
        if (dayGame) {
          // Compare game performance vs season avg
          if (isPitcher) {
            const gameWon = (dayGame.stat?.wins||0) > 0;
            const gameLost = (dayGame.stat?.losses||0) > 0;
            const gameOutcome = gameWon ? 1 : gameLost ? 0 : null;
            if (gameOutcome !== null) {
              hit = trend === 'OVER' ? gameOutcome === 1 : gameOutcome === 0;
              actualGame = {
                wins: dayGame.stat?.wins||0,
                losses: dayGame.stat?.losses||0,
                strikeOuts: dayGame.stat?.strikeOuts||0,
                inningsPitched: dayGame.stat?.inningsPitched||'0',
              };
            }
          } else {
            const gameH = dayGame.stat?.hits||0;
            const gameAB = dayGame.stat?.atBats||0;
            const gameHR = dayGame.stat?.homeRuns||0;
            const gameRBI = dayGame.stat?.rbi||0;
            // Performance score: weighted like prediction
            let gamePerf = 0;
            if (avgH > 0 && gameAB > 0) gamePerf += ((gameH - avgH) / avgH) * 50;
            if (avgHR > 0) gamePerf += ((gameHR - avgHR) / avgHR) * 30;
            if (avgRBI > 0) gamePerf += ((gameRBI - avgRBI) / avgRBI) * 20;
            hit = trend === 'OVER' ? gamePerf > 0 : gamePerf < 0;
            actualGame = {
              hits: gameH, atBats: gameAB, homeRuns: gameHR, rbi: gameRBI,
              strikeOuts: dayGame.stat?.strikeOuts||0,
              gamePerf: Math.round(gamePerf),
            };
          }
        }
      }

      results.push({
        id: player.id,
        name: player.name,
        position: player.position,
        birth_date: player.birth_date,
        mlb_id: player.mlb_id,
        teamId: player.team_id,
        teamName: player.team_name,
        abbr: player.abbr,
        colors: player.colors,
        destinyNumber: player.destiny_number,
        vibrationToday: vToday,
        isPitcher,
        score: Math.round(score),
        gamesInVib: todayStats.G,
        totalGames: totalG,
        trend,
        actualGame,
        hit,
      });
    } catch(e) {
      // skip player on error
    }
  }

  // Sort: top 8 OVER, top 8 UNDER
  const over = results
    .filter(p => p.trend === 'OVER')
    .sort((a,b) => b.score - a.score)
    .slice(0, 8);

  const under = results
    .filter(p => p.trend === 'UNDER')
    .sort((a,b) => a.score - b.score)
    .slice(0, 8);

  // Aggregate verification
  const overWithGames = over.filter(p => p.hit !== null);
  const underWithGames = under.filter(p => p.hit !== null);
  const overHits = overWithGames.filter(p => p.hit).length;
  const underHits = underWithGames.filter(p => p.hit).length;

  return {
    date: targetDate,
    isHistorical,
    over,
    under,
    summary: {
      overTotal: overWithGames.length,
      overHits,
      overAccuracy: overWithGames.length > 0 ? Math.round(overHits / overWithGames.length * 100) : null,
      underTotal: underWithGames.length,
      underHits,
      underAccuracy: underWithGames.length > 0 ? Math.round(underHits / underWithGames.length * 100) : null,
      totalAnalyzed: results.length,
    },
  };
}

// GET /api/verify?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const date = req.query.date;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });
    }

    // Check in-memory cache (only for historical dates, today can change)
    const today = new Date().toISOString().split('T')[0];
    if (date < today && verifyCache.has(date)) {
      return res.json(verifyCache.get(date));
    }

    const result = await computePicksWithVerification(date);
    if (date < today) verifyCache.set(date, result);
    res.json(result);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.computePicksWithVerification = computePicksWithVerification;
module.exports.verifyCache = verifyCache;
