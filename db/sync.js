// db/sync.js
// Fetches games from MLB Stats API and stores in PostgreSQL

const pool = require('./index');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

const MLB_BASE = 'https://statsapi.mlb.com/api/v1';

async function mlbFetch(url) {
  const cached = cache.get(url);
  if (cached) return cached;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`MLB API ${res.status}: ${url}`);
    const data = await res.json();
    cache.set(url, data);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

// Get team map: mlb_id → team.id
async function getTeamMap() {
  const { rows } = await pool.query('SELECT id, mlb_id FROM teams');
  const map = {};
  rows.forEach(r => { if (r.mlb_id) map[r.mlb_id] = r.id; });
  return map;
}

// Sync all games for a team+season using MLB Stats API
async function syncTeamSeason(teamMlbId, teamId, season) {
  const url = `${MLB_BASE}/schedule?sportId=1&teamId=${teamMlbId}&season=${season}&gameType=R&fields=dates,date,games,gamePk,teams,away,home,team,id,name,isWinner,score,status,abstractGameState`;
  const data = await mlbFetch(url);
  let synced = 0;

  const teamMap = await getTeamMap();

  for (const dateObj of (data.dates || [])) {
    for (const game of (dateObj.games || [])) {
      try {
        if (game.status?.abstractGameState !== 'Final') continue;

        const home = game.teams?.home;
        const away = game.teams?.away;
        const isHome = home?.team?.id === teamMlbId;
        const myTeam = isHome ? home : away;
        const oppTeam = isHome ? away : home;

        const oppMlbId = oppTeam?.team?.id;
        const oppId = teamMap[oppMlbId];
        if (!oppId) continue;

        const homeScore = home?.score || 0;
        const awayScore = away?.score || 0;
        const winner = homeScore > awayScore ? teamMap[home?.team?.id] : teamMap[away?.team?.id];
        if (!winner) continue;

        const gameDate = dateObj.date;
        const gameId = `${gameDate}_${isHome ? teamId : oppId}_${isHome ? oppId : teamId}`;

        await pool.query(`
          INSERT INTO games (id, date, season, team_home, team_away, score_home, score_away, winner, status, espn_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'final', $9)
          ON CONFLICT (id) DO UPDATE SET
            score_home=EXCLUDED.score_home, score_away=EXCLUDED.score_away,
            winner=EXCLUDED.winner, status=EXCLUDED.status
        `, [
          gameId, gameDate, season,
          isHome ? teamId : oppId,
          isHome ? oppId : teamId,
          homeScore, awayScore,
          winner, String(game.gamePk)
        ]);
        synced++;
      } catch(e) {
        // skip failed games
      }
    }
  }
  return synced;
}

// Sync player game log for a season
async function syncPlayerSeason(playerMlbId, playerId, season, isPitcher) {
  const group = isPitcher ? 'pitching' : 'hitting';
  const url = `${MLB_BASE}/people/${playerMlbId}/stats?stats=gameLog&season=${season}&group=${group}&sportId=1`;
  const data = await mlbFetch(url);
  const splits = data.stats?.[0]?.splits || [];

  for (const s of splits) {
    try {
      const gameDate = s.date;
      if (!gameDate) continue;

      // Find game in DB by date and team
      const { rows: gameRows } = await pool.query(`
        SELECT g.id FROM games g
        JOIN players p ON p.id = $1
        WHERE g.date = $2 AND (g.team_home = p.team_id OR g.team_away = p.team_id)
        LIMIT 1
      `, [playerId, gameDate]);

      if (!gameRows.length) continue;
      const gameId = gameRows[0].id;

      if (isPitcher) {
        await pool.query(`
          INSERT INTO player_stats (game_id, player_id, wins, losses, so_pitcher)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (game_id, player_id) DO UPDATE SET
            wins=EXCLUDED.wins, losses=EXCLUDED.losses, so_pitcher=EXCLUDED.so_pitcher
        `, [gameId, playerId, s.stat?.wins||0, s.stat?.losses||0, s.stat?.strikeOuts||0]);
      } else {
        await pool.query(`
          INSERT INTO player_stats (game_id, player_id, hits, hr, rbi, strikeouts, at_bats, runs)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (game_id, player_id) DO UPDATE SET
            hits=EXCLUDED.hits, hr=EXCLUDED.hr, rbi=EXCLUDED.rbi,
            strikeouts=EXCLUDED.strikeouts, at_bats=EXCLUDED.at_bats, runs=EXCLUDED.runs
        `, [gameId, playerId,
            s.stat?.hits||0, s.stat?.homeRuns||0, s.stat?.rbi||0,
            s.stat?.strikeOuts||0, s.stat?.atBats||0, s.stat?.runs||0]);
      }
    } catch(e) {
      // skip
    }
  }
  return splits.length;
}

// Sync today
async function syncToday() {
  const today = new Date().toISOString().split('T')[0];
  const teamMap = await getTeamMap();
  let total = 0;

  // Sync each team for today
  for (const [mlbId, teamId] of Object.entries(teamMap)) {
    try {
      const count = await syncTeamSeason(parseInt(mlbId), teamId, new Date().getFullYear());
      total += count;
    } catch(e) { /* skip */ }
  }
  return total;
}

// Sync full season for all teams
async function syncSeason(season) {
  const { rows: teams } = await pool.query('SELECT id, mlb_id FROM teams WHERE mlb_id IS NOT NULL');
  let total = 0;

  for (const team of teams) {
    try {
      console.log(`  Syncing ${team.id} ${season}...`);
      const count = await syncTeamSeason(team.mlb_id, team.id, season);
      total += count;
      console.log(`  ${team.id}: ${count} games`);
      await new Promise(r => setTimeout(r, 300));
    } catch(e) {
      console.error(`  ${team.id} error: ${e.message}`);
    }
  }

  // Sync player stats
  console.log('  Syncing player stats...');
  const { rows: players } = await pool.query('SELECT id, mlb_id, position FROM players WHERE mlb_id IS NOT NULL AND season = 2026');
  for (const p of players) {
    try {
      const isPitcher = ['SP','RP','P'].includes(p.position||'');
      await syncPlayerSeason(p.mlb_id, p.id, season, isPitcher);
      await new Promise(r => setTimeout(r, 200));
    } catch(e) { /* skip */ }
  }

  console.log(`[SYNC] Season ${season} complete: ${total} games`);
  return total;
}

module.exports = { syncToday, syncSeason, syncTeamSeason, syncPlayerSeason };
