const router = require('express').Router();
const pool = require('../db');
const { vibrationPerson, vibrationDay, destinyNumber } = require('../numerology');

// ── GET /api/analysis/manager?teamId=LAD&season=2025 ──────
// W/L record by vibration number
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
      SELECT g.date, g.winner, g.team_home, g.team_away, g.score_home, g.score_away
      FROM games g
      WHERE (g.team_home = $1 OR g.team_away = $1)
        AND g.season = $2 AND g.status = 'final'
      ORDER BY g.date
    `, [teamId.toUpperCase(), parseInt(season)]);

    // Build stats by vibration
    const stats = {};
    for (let v = 1; v <= 9; v++) stats[v] = { G: 0, W: 0, L: 0 };

    for (const g of games) {
      const gameDate = g.date instanceof Date ? g.date.toISOString().split('T')[0] : String(g.date).split('T')[0];
      const v = vibrationPerson(mgr.birth_date, gameDate);
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
        vibrationToday: vibrationPerson(mgr.birth_date, new Date().toISOString().split('T')[0]),
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
// H/HR/RBI/K or W/L/SO by vibration number
router.get('/player', async (req, res) => {
  try {
    const { playerId, season = 2025 } = req.query;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });

    const { rows: ps } = await pool.query('SELECT * FROM players WHERE id = $1', [playerId]);
    if (!ps.length) return res.status(404).json({ error: 'Player not found' });
    const player = ps[0];

    const isPitcher = ['SP','RP','P'].includes(player.position || '');

    const { rows: gamestats } = await pool.query(`
      SELECT g.date, ps.hits, ps.rbi, ps.runs, ps.hr, ps.strikeouts,
             ps.wins, ps.losses, ps.so_pitcher, ps.at_bats
      FROM player_stats ps
      JOIN games g ON ps.game_id = g.id
      WHERE ps.player_id = $1 AND g.season = $2
      ORDER BY g.date
    `, [parseInt(playerId), parseInt(season)]);

    const stats = {};
    for (let v = 1; v <= 9; v++) {
      stats[v] = isPitcher
        ? { G: 0, W: 0, L: 0, SO: 0 }
        : { G: 0, H: 0, HR: 0, RBI: 0, K: 0, R: 0, AB: 0 };
    }

    for (const gs of gamestats) {
      const d = gs.date instanceof Date ? gs.date.toISOString().split('T')[0] : String(gs.date).split('T')[0];
      const v = vibrationPerson(player.birth_date, d);
      stats[v].G++;
      if (isPitcher) {
        stats[v].W  += gs.wins || 0;
        stats[v].L  += gs.losses || 0;
        stats[v].SO += gs.so_pitcher || 0;
      } else {
        stats[v].H   += gs.hits || 0;
        stats[v].HR  += gs.hr || 0;
        stats[v].RBI += gs.rbi || 0;
        stats[v].K   += gs.strikeouts || 0;
        stats[v].R   += gs.runs || 0;
        stats[v].AB  += gs.at_bats || 0;
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
        vibrationToday: vibrationPerson(player.birth_date, new Date().toISOString().split('T')[0]),
      },
      season: parseInt(season),
      totalGames: gamestats.length,
      stats,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/analysis/vs?teamA=LAD&teamB=CLE&season=2025 ──
// Head to head by manager vibration
router.get('/vs', async (req, res) => {
  try {
    const { teamA, teamB, season = 2025 } = req.query;
    if (!teamA || !teamB) return res.status(400).json({ error: 'teamA and teamB required' });

    const { rows: mgrA } = await pool.query('SELECT * FROM managers WHERE team_id=$1 AND season=2026', [teamA.toUpperCase()]);
    const { rows: mgrB } = await pool.query('SELECT * FROM managers WHERE team_id=$1 AND season=2026', [teamB.toUpperCase()]);
    if (!mgrA.length || !mgrB.length) return res.status(404).json({ error: 'Manager not found' });

    const { rows: games } = await pool.query(`
      SELECT g.date, g.winner, g.score_home, g.score_away, g.team_home, g.team_away
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
      const d = g.date instanceof Date ? g.date.toISOString().split('T')[0] : String(g.date).split('T')[0];
      const vA = vibrationPerson(mgrA[0].birth_date, d);
      const vB = vibrationPerson(mgrB[0].birth_date, d);
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

// ── GET /api/analysis/calendar?teamId=LAD&year=2025&month=5 ──
router.get('/calendar', async (req, res) => {
  try {
    const { teamId, year, month } = req.query;
    if (!teamId || !year || !month) return res.status(400).json({ error: 'teamId, year, month required' });

    const { rows: mgrs } = await pool.query('SELECT * FROM managers WHERE team_id=$1 AND season=2026', [teamId.toUpperCase()]);
    if (!mgrs.length) return res.status(404).json({ error: 'Manager not found' });
    const mgr = mgrs[0];

    const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const { rows: games } = await pool.query(`
      SELECT g.date, g.winner, g.score_home, g.score_away, g.team_home, g.team_away,
             th.abbr as home_abbr, ta.abbr as away_abbr
      FROM games g
      JOIN teams th ON g.team_home = th.id
      JOIN teams ta ON g.team_away = ta.id
      WHERE (g.team_home=$1 OR g.team_away=$1)
        AND g.date >= $2 AND g.date <= $3
        AND g.status = 'final'
      ORDER BY g.date
    `, [teamId.toUpperCase(), startDate, endDate]);

    const days = {};
    for (const g of games) {
      const d = g.date instanceof Date ? g.date.toISOString().split('T')[0] : String(g.date).split('T')[0];
      const vDay = vibrationDay(d);
      const vMgr = vibrationPerson(mgr.birth_date, d);
      const isHome = g.team_home === teamId.toUpperCase();
      const won = g.winner === teamId.toUpperCase();
      const opp = isHome ? g.away_abbr : g.home_abbr;
      const scoreTeam = isHome ? g.score_home : g.score_away;
      const scoreOpp  = isHome ? g.score_away : g.score_home;
      days[d] = { date: d, vibDay: vDay, vibManager: vMgr, won, opp, score: `${scoreTeam}-${scoreOpp}` };
    }

    res.json({ teamId: teamId.toUpperCase(), year: parseInt(year), month: parseInt(month), days });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/analysis/today?teamId=LAD ───────────────────
router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const vDay = vibrationDay(today);

    // All teams' vibration today
    const { rows: mgrs } = await pool.query('SELECT m.*, t.name as team_name, t.abbr FROM managers m JOIN teams t ON m.team_id=t.id WHERE m.season=2026 ORDER BY t.name');
    const teams = mgrs.map(m => ({
      teamId: m.team_id,
      teamName: m.team_name,
      abbr: m.abbr,
      manager: m.name,
      vibrationToday: vibrationPerson(m.birth_date, today),
      destinyNumber: m.destiny_number,
    }));

    res.json({ date: today, vibrationDay: vDay, meaning: vibMeaning(vDay), teams });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

function vibMeaning(v) {
  const m = {1:'Liderazgo · Inicio',2:'Cooperación · Balance',3:'Creatividad · Energía',4:'Estabilidad · Disciplina',5:'Libertad · Cambio',6:'Armonía · Protección',7:'Análisis · Precisión',8:'Poder · Resultados',9:'Sabiduría · Cierre'};
  return m[v] || '';
}

module.exports = router;
