const router = require('express').Router();
const pool = require('../db/index');
const { vibrationPerson, vibrationDay } = require('../numerology');

function parseDate(d) {
  if (!d) return null;
  return d instanceof Date ? d.toISOString().split('T')[0] : String(d).split('T')[0];
}

function safeVib(birth, date) {
  const v = vibrationPerson(birth, date);
  if (!v || v < 1 || v > 9) return null;
  return v;
}

// ── GET /api/analysis/manager?teamId=LAD&season=2025 ──────
router.get('/manager', async (req, res) => {
  try {
    const { teamId, season = 2025 } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId required' });

    const { rows: mgrs } = await pool.query(
      'SELECT * FROM managers WHERE team_id = $1 AND season = 2026',
      [teamId.toUpperCase()]
    );
    if (!mgrs.length) return res.status(404).json({ error: 'Manager not found' });
    const mgr = mgrs[0];

    const { rows: games } = await pool.query(`
      SELECT g.date, g.winner, g.team_home, g.team_away
      FROM games g
      WHERE (g.team_home = $1 OR g.team_away = $1)
        AND g.season = $2 AND g.status = 'final'
      ORDER BY g.date
    `, [teamId.toUpperCase(), parseInt(season)]);

    const stats = {};
    for (let v = 1; v <= 9; v++) stats[v] = { G: 0, W: 0, L: 0 };

    for (const g of games) {
      const gameDate = parseDate(g.date);
      if (!gameDate) continue;
      const v = safeVib(mgr.birth_date, gameDate);
      if (!v) continue;
      const won = g.winner === teamId.toUpperCase();
      stats[v].G++;
      won ? stats[v].W++ : stats[v].L++;
    }

    res.json({
      manager: {
        id: mgr.id,
        name: mgr.name,
        birthDate: mgr.birth_date,
        destinyNumber: mgr.destiny_number,
        vibrationToday: safeVib(mgr.birth_date, new Date().toISOString().split('T')[0]) || 1,
      },
      season: parseInt(season),
      totalGames: games.length,
      stats,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/analysis/player?playerId=1&season=2025 ───────
router.get('/player', async (req, res) => {
  try {
    const { playerId, season = 2025 } = req.query;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });

    const { rows: ps } = await pool.query('SELECT * FROM players WHERE id = $1', [playerId]);
    if (!ps.length) return res.status(404).json({ error: 'Player not found' });
    const player = ps[0];
    const isPitcher = ['SP','RP','P'].includes(player.position || '');

    // Fetch directly from MLB Stats API
    const group = isPitcher ? 'pitching' : 'hitting';
    const mlbUrl = `https://statsapi.mlb.com/api/v1/people/${player.mlb_id}/stats?stats=gameLog&season=${season}&group=${group}&sportId=1`;
    const mlbRes = await fetch(mlbUrl);
    const mlbData = await mlbRes.json();
    const splits = mlbData.stats?.[0]?.splits || [];

    const stats = {};
    for (let v = 1; v <= 9; v++) {
      stats[v] = isPitcher
        ? { G: 0, W: 0, L: 0, SO: 0 }
        : { G: 0, H: 0, HR: 0, RBI: 0, K: 0, R: 0, AB: 0 };
    }

    for (const s of splits) {
      if (!s.date) continue;
      const v = safeVib(player.birth_date, s.date);
      if (!v) continue;
      stats[v].G++;
      if (isPitcher) {
        stats[v].W  += s.stat?.wins || 0;
        stats[v].L  += s.stat?.losses || 0;
        stats[v].SO += s.stat?.strikeOuts || 0;
      } else {
        stats[v].H   += s.stat?.hits || 0;
        stats[v].HR  += s.stat?.homeRuns || 0;
        stats[v].RBI += s.stat?.rbi || 0;
        stats[v].K   += s.stat?.strikeOuts || 0;
        stats[v].R   += s.stat?.runs || 0;
        stats[v].AB  += s.stat?.atBats || 0;
      }
    }

    res.json({
      player: {
        id: player.id,
        name: player.name,
        position: player.position,
        birthDate: player.birth_date,
        destinyNumber: player.destiny_number,
        isPitcher,
        vibrationToday: safeVib(player.birth_date, new Date().toISOString().split('T')[0]) || 1,
      },
      season: parseInt(season),
      totalGames: splits.length,
      stats,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/analysis/vs?teamA=LAD&teamB=CLE&season=2025 ──
router.get('/vs', async (req, res) => {
  try {
    const { teamA, teamB, season = 2025 } = req.query;
    if (!teamA || !teamB) return res.status(400).json({ error: 'teamA and teamB required' });

    const { rows: mgrA } = await pool.query('SELECT * FROM managers WHERE team_id=$1 AND season=2026', [teamA.toUpperCase()]);
    const { rows: mgrB } = await pool.query('SELECT * FROM managers WHERE team_id=$1 AND season=2026', [teamB.toUpperCase()]);
    if (!mgrA.length || !mgrB.length) return res.status(404).json({ error: 'Manager not found' });

    const { rows: games } = await pool.query(`
      SELECT g.date, g.winner, g.team_home, g.team_away
      FROM games g
      WHERE ((g.team_home=$1 AND g.team_away=$2) OR (g.team_home=$2 AND g.team_away=$1))
        AND g.season=$3 AND g.status='final'
      ORDER BY g.date
    `, [teamA.toUpperCase(), teamB.toUpperCase(), parseInt(season)]);

    const statsA = {}, statsB = {};
    for (let v = 1; v <= 9; v++) {
      statsA[v] = { G: 0, W: 0, L: 0 };
      statsB[v] = { G: 0, W: 0, L: 0 };
    }

    for (const g of games) {
      const d = parseDate(g.date);
      if (!d) continue;
      const vA = safeVib(mgrA[0].birth_date, d);
      const vB = safeVib(mgrB[0].birth_date, d);
      if (!vA || !vB) continue;
      const wonA = g.winner === teamA.toUpperCase();
      statsA[vA].G++; wonA ? statsA[vA].W++ : statsA[vA].L++;
      statsB[vB].G++; wonA ? statsB[vB].L++ : statsB[vB].W++;
    }

    res.json({
      teamA: { id: teamA.toUpperCase(), manager: mgrA[0].name, birthDate: mgrA[0].birth_date, destiny: mgrA[0].destiny_number },
      teamB: { id: teamB.toUpperCase(), manager: mgrB[0].name, birthDate: mgrB[0].birth_date, destiny: mgrB[0].destiny_number },
      season: parseInt(season),
      totalGames: games.length,
      statsA,
      statsB,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/analysis/today ───────────────────────────────
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const vDay = vibrationDay(today);
    const { rows: mgrs } = await pool.query(`
      SELECT m.*, t.name as team_name, t.abbr
      FROM managers m JOIN teams t ON m.team_id=t.id
      WHERE m.season=2026 ORDER BY t.name
    `);
    const teams = mgrs.map(m => ({
      teamId: m.team_id,
      teamName: m.team_name,
      abbr: m.abbr,
      manager: m.name,
      vibrationToday: safeVib(m.birth_date, today) || 1,
      destinyNumber: m.destiny_number,
    }));
    res.json({ date: today, vibrationDay: vDay, teams });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
