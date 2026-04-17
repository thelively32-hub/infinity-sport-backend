// routes/schedule.js — exposes today's (or any day's) MLB games
const router = require('express').Router();
const pool = require('../db/index');
const { getTeamsPlayingOn } = require('../utils/schedule');

// GET /api/schedule?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const { mlbIds, games } = await getTeamsPlayingOn(date);

    if (!mlbIds.length) {
      return res.json({ date, teamIds: [], teams: [], games: [], totalGames: 0 });
    }

    const { rows: teams } = await pool.query(
      `SELECT id, mlb_id, name, abbr, colors FROM teams WHERE mlb_id = ANY($1)`,
      [mlbIds]
    );
    const byMlb = {};
    teams.forEach(t => { byMlb[t.mlb_id] = t; });

    const enriched = games.map(g => ({
      gameId: g.gamePk,
      status: g.status?.abstractGameState,     // Preview / Live / Final
      detailedStatus: g.status?.detailedState, // Scheduled / Pre-Game / In Progress / Final
      home: byMlb[g.teams?.home?.team?.id] || null,
      away: byMlb[g.teams?.away?.team?.id] || null,
      startTime: g.gameDate,
    }));

    res.json({
      date,
      teamIds: teams.map(t => t.id),
      teams,
      games: enriched,
      totalGames: games.length,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
