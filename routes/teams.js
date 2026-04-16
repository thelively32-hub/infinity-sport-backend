const express = require('express');
const router = express.Router();
const pool = require('../db/index');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, 
        m.name as manager_name, 
        m.birth_date as manager_birth, 
        m.destiny_number as manager_destiny
      FROM teams t
      LEFT JOIN managers m ON m.team_id = t.id AND m.season = 2026
      ORDER BY t.name
    `);
    res.json(rows);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, 
        m.name as manager_name, 
        m.birth_date as manager_birth, 
        m.destiny_number as manager_destiny
      FROM teams t
      LEFT JOIN managers m ON m.team_id = t.id AND m.season = 2026
      WHERE t.id = $1
    `, [req.params.id.toUpperCase()]);
    if (!rows.length) return res.status(404).json({ error: 'Team not found' });
    res.json(rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
