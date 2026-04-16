const express = require('express');
const router = express.Router();
const pool = require('../db/index');

router.get('/', async (req, res) => {
  try {
    const { teamId, season = 2026 } = req.query;
    let q = 'SELECT * FROM players WHERE 1=1';
    const params = [];
    if (teamId) {
      params.push(teamId.toUpperCase());
      q += ` AND team_id = $${params.length}`;
    }
    q += ' ORDER BY name';
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
