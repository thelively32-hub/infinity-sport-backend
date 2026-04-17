const express = require('express');
const router = express.Router();
const pool = require('../db/index');
const { getTeamsPlayingOn } = require('../utils/schedule');

// GET /api/players?teamId=LAD&playingDate=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { teamId, playingDate } = req.query;
    let q = `SELECT p.*, t.mlb_id as team_mlb_id, t.abbr as team_abbr, t.name as team_name FROM players p JOIN teams t ON p.team_id = t.id WHERE 1=1`;
    const params = [];

    if (teamId) {
      params.push(teamId.toUpperCase());
      q += ` AND p.team_id = $${params.length}`;
    }

    if (playingDate) {
      const { mlbIds } = await getTeamsPlayingOn(playingDate);
      if (mlbIds.length === 0) return res.json([]);
      params.push(mlbIds);
      q += ` AND t.mlb_id = ANY($${params.length})`;
    }

    q += ' ORDER BY p.name';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM players WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Player not found' });
    res.json(rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
