const express = require('express');
const router = express.Router();

router.post('/today', async (req, res) => {
  try {
    const { syncToday } = require('../db/sync');
    const count = await syncToday();
    res.json({ ok: true, gamesSync: count, date: new Date().toISOString().split('T')[0] });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/date', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });
    const { syncDate } = require('../db/sync');
    const count = await syncDate(date);
    res.json({ ok: true, gamesSync: count, date });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/season', async (req, res) => {
  const { season = 2025 } = req.query;
  res.json({ ok: true, message: `Syncing season ${season} in background...` });
  const { syncSeason } = require('../db/sync');
  syncSeason(parseInt(season))
    .then(n => console.log(`[SYNC] Season ${season}: ${n} games`))
    .catch(e => console.error(`[SYNC] Error:`, e.message));
});

router.get('/status', async (req, res) => {
  try {
    const pool = require('../db/index');
    const { rows } = await pool.query(
      'SELECT season, COUNT(*) as games, MAX(date) as last_game FROM games GROUP BY season ORDER BY season DESC'
    );
    res.json({ synced: rows });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
