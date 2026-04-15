// ============================================================
// routes/mlb.js
// Proxy para la API oficial de MLB stats
// Agrega en server.js: const mlbRoutes = require('./routes/mlb');
//                       app.use('/api/mlb', mlbRoutes);
// ============================================================

const express = require('express');
const router = express.Router();

const MLB_BASE = 'https://statsapi.mlb.com/api/v1';

// Helper: fetch con timeout
async function mlbFetch(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`MLB API error: ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ─── GET /api/mlb/schedule?teamId=119&season=2025 ──────────────
// Devuelve todos los juegos de un equipo en una temporada
// con la fecha del juego, resultado (W/L) y oponente
router.get('/schedule', async (req, res) => {
  try {
    const { teamId, season = 2025 } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId required' });

    const url = `${MLB_BASE}/schedule?sportId=1&teamId=${teamId}&season=${season}&gameType=R&fields=dates,date,games,gamePk,teams,away,home,team,id,name,isWinner,score,status,abstractGameState`;
    const data = await mlbFetch(url);

    // Flatten games
    const games = [];
    for (const dateObj of (data.dates || [])) {
      for (const game of (dateObj.games || [])) {
        const home = game.teams?.home;
        const away = game.teams?.away;
        const tid = parseInt(teamId);
        const isHome = home?.team?.id === tid;
        const myTeam = isHome ? home : away;
        const oppTeam = isHome ? away : home;

        if (game.status?.abstractGameState !== 'Final') continue;

        games.push({
          gamePk: game.gamePk,
          date: dateObj.date,          // YYYY-MM-DD
          isHome,
          win: myTeam?.isWinner === true,
          myScore: myTeam?.score,
          oppScore: oppTeam?.score,
          oppTeamId: oppTeam?.team?.id,
          oppTeamName: oppTeam?.team?.name,
        });
      }
    }

    res.json({ teamId: parseInt(teamId), season, games });
  } catch (err) {
    console.error('MLB schedule error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/mlb/player/stats?playerId=660271&season=2025 ─────
// Devuelve stats game-by-game de un bateador o pitcher
router.get('/player/stats', async (req, res) => {
  try {
    const { playerId, season = 2025, group = 'hitting' } = req.query;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });

    // Get game log
    const url = `${MLB_BASE}/people/${playerId}/stats?stats=gameLog&season=${season}&group=${group}&sportId=1&fields=stats,splits,date,stat,hits,homeRuns,rbi,strikeOuts,wins,losses,strikeOuts,inningsPitched,team,opponent,id,name`;
    const data = await mlbFetch(url);

    const splits = data.stats?.[0]?.splits || [];
    const games = splits.map(s => ({
      date: s.date,                          // YYYY-MM-DD
      oppTeamId: s.opponent?.id,
      oppTeamName: s.opponent?.name,
      // Hitting
      H:   s.stat?.hits ?? null,
      HR:  s.stat?.homeRuns ?? null,
      RBI: s.stat?.rbi ?? null,
      K:   s.stat?.strikeOuts ?? null,
      TB:  s.stat?.totalBases ?? null,
      // Pitching
      W:   s.stat?.wins ?? null,
      L:   s.stat?.losses ?? null,
      SO:  s.stat?.strikeOuts ?? null,
      IP:  s.stat?.inningsPitched ?? null,
    }));

    res.json({ playerId: parseInt(playerId), season, group, games });
  } catch (err) {
    console.error('MLB player stats error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/mlb/team/roster?teamId=119&season=2026 ───────────
// Devuelve el roster activo con playerIds (para luego buscar stats)
router.get('/team/roster', async (req, res) => {
  try {
    const { teamId, season = 2026 } = req.query;
    if (!teamId) return res.status(400).json({ error: 'teamId required' });

    const url = `${MLB_BASE}/teams/${teamId}/roster?rosterType=active&season=${season}&fields=roster,person,id,fullName,birthDate,primaryPosition,abbreviation`;
    const data = await mlbFetch(url);

    const roster = (data.roster || []).map(p => ({
      id: p.person?.id,
      name: p.person?.fullName,
      position: p.person?.primaryPosition?.abbreviation,
    }));

    res.json({ teamId: parseInt(teamId), season, roster });
  } catch (err) {
    console.error('MLB roster error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/mlb/player/info?playerId=660271 ──────────────────
// Devuelve birthDate y datos básicos del jugador
router.get('/player/info', async (req, res) => {
  try {
    const { playerId } = req.query;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });

    const url = `${MLB_BASE}/people/${playerId}?fields=people,id,fullName,birthDate,primaryPosition,abbreviation,currentTeam,id,name`;
    const data = await mlbFetch(url);
    const p = data.people?.[0];
    if (!p) return res.status(404).json({ error: 'Player not found' });

    res.json({
      id: p.id,
      name: p.fullName,
      birthDate: p.birthDate,
      position: p.primaryPosition?.abbreviation,
      team: p.currentTeam?.name,
    });
  } catch (err) {
    console.error('MLB player info error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
