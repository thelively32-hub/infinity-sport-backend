// routes/today.js
// Returns today's TOP OVER and TOP UNDER players based on vibration performance

const router = require('express').Router();
const pool = require('../db/index');
const { vibrationPerson, vibrationDay } = require('../numerology');

// GET /api/today
// Returns vibration of the day + top OVER and UNDER players
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const vDay = vibrationDay(today);

    // Get all players with their team info
    const { rows: players } = await pool.query(`
      SELECT p.*, t.name as team_name, t.abbr, t.colors
      FROM players p
      JOIN teams t ON p.team_id = t.id
      WHERE p.season = 2026 AND p.mlb_id IS NOT NULL
      ORDER BY p.name
    `);

    const results = [];

    for (const player of players) {
      try {
        const vToday = vibrationPerson(player.birth_date, today);
        const isPitcher = ['SP','RP','P'].includes(player.position||'');
        const group = isPitcher ? 'pitching' : 'hitting';

        // Fetch 2025 game log
        const url = `https://statsapi.mlb.com/api/v1/people/${player.mlb_id}/stats?stats=gameLog&season=2025&group=${group}&sportId=1`;
        const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) continue;
        const data = await r.json();
        const splits = data.stats?.[0]?.splits || [];
        if (splits.length < 10) continue; // skip players with too few games

        // Group stats by vibration
        const vibStats = {};
        for (let v=1;v<=9;v++) vibStats[v] = isPitcher
          ? {G:0,W:0,L:0}
          : {G:0,H:0,HR:0,RBI:0,K:0};

        for (const s of splits) {
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
          }
        }

        // Calculate averages across all vibraciones
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
        if (!todayStats || todayStats.G < 5) continue; // need enough sample

        // Calculate performance score vs average
        let score = 0;
        if (isPitcher) {
          const todayWpct = todayStats.G>0 ? todayStats.W/(todayStats.W+todayStats.L||1) : 0;
          score = avgWpct > 0 ? ((todayWpct - avgWpct) / avgWpct) * 100 : 0;
        } else {
          const todayAvgH = todayStats.H/todayStats.G;
          const todayAvgHR = todayStats.HR/todayStats.G;
          const todayAvgRBI = todayStats.RBI/todayStats.G;
          // Weighted score
          score = 0;
          if (avgH > 0) score += ((todayAvgH - avgH) / avgH) * 50;
          if (avgHR > 0) score += ((todayAvgHR - avgHR) / avgHR) * 30;
          if (avgRBI > 0) score += ((todayAvgRBI - avgRBI) / avgRBI) * 20;
        }

        results.push({
          id: player.id,
          name: player.name,
          position: player.position,
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
          todayStats,
          trend: score >= 20 ? 'OVER' : score <= -20 ? 'UNDER' : 'EVEN',
        });
      } catch(e) {
        // skip player on error
      }
    }

    // Sort and get top 8 OVER and top 8 UNDER
    const over = results
      .filter(p => p.trend === 'OVER')
      .sort((a,b) => b.score - a.score)
      .slice(0, 8);

    const under = results
      .filter(p => p.trend === 'UNDER')
      .sort((a,b) => a.score - b.score)
      .slice(0, 8);

    res.json({
      date: today,
      vibrationDay: vDay,
      totalAnalyzed: results.length,
      over,
      under,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
