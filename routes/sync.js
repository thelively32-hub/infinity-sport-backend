// db/sync.js
// Fetches games from ESPN and stores in PostgreSQL

const pool = require('../db/index');
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb';

async function espnFetch(url) {
  const cached = cache.get(url);
  if (cached) return cached;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`ESPN ${res.status}: ${url}`);
  const data = await res.json();
  cache.set(url, data);
  return data;
}

// Get team map: mlb_id → team.id
async function getTeamMap() {
  const { rows } = await pool.query('SELECT id, mlb_id FROM teams');
  const map = {};
  rows.forEach(r => { if (r.mlb_id) map[r.mlb_id] = r.id; });
  return map;
}

// Sync games for a specific date
async function syncDate(date) {
  const teamMap = await getTeamMap();
  const url = `${ESPN_BASE}/scoreboard?dates=${date.replace(/-/g, '')}`;
  const data = await espnFetch(url);
  const events = data.events || [];
  let synced = 0;

  for (const event of events) {
    try {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const status = event.status?.type?.name;
      if (status !== 'STATUS_FINAL') continue;

      const home = comp.competitors?.find(c => c.homeAway === 'home');
      const away = comp.competitors?.find(c => c.homeAway === 'away');
      if (!home || !away) continue;

      const homeId = teamMap[parseInt(home.team?.id)];
      const awayId = teamMap[parseInt(away.team?.id)];
      if (!homeId || !awayId) continue;

      const homeScore = parseInt(home.score) || 0;
      const awayScore = parseInt(away.score) || 0;
      const winner = homeScore > awayScore ? homeId : awayId;
      const season = new Date(date).getFullYear();

      await pool.query(`
        INSERT INTO games (id, date, season, team_home, team_away, score_home, score_away, winner, status, espn_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'final', $9)
        ON CONFLICT (id) DO UPDATE SET
          score_home=EXCLUDED.score_home, score_away=EXCLUDED.score_away,
          winner=EXCLUDED.winner, status=EXCLUDED.status
      `, [
        `${date}_${homeId}_${awayId}`,
        date, season, homeId, awayId,
        homeScore, awayScore, winner, String(event.id)
      ]);

      // Sync player stats for this game
      await syncGameStats(event.id, `${date}_${homeId}_${awayId}`);
      synced++;
    } catch(e) {
      console.error(`  Game sync error: ${e.message}`);
    }
  }
  return synced;
}

// Sync player stats for a game
async function syncGameStats(espnEventId, gameId) {
  try {
    const url = `${ESPN_BASE}/summary?event=${espnEventId}`;
    const data = await espnFetch(url);
    const boxscore = data.boxscore;
    if (!boxscore) return;

    for (const team of (boxscore.players || [])) {
      for (const cat of (team.statistics || [])) {
        const isPitching = cat.name === 'pitching';
        const isHitting = cat.name === 'batting';
        if (!isPitching && !isHitting) continue;

        const labels = cat.labels || [];
        for (const athlete of (cat.athletes || [])) {
          const stats = athlete.stats || [];
          const mlbId = parseInt(athlete.athlete?.id);
          if (!mlbId) continue;

          // Find player in DB
          const { rows } = await pool.query(
            'SELECT id FROM players WHERE mlb_id = $1 LIMIT 1', [mlbId]
          );
          if (!rows.length) continue;
          const playerId = rows[0].id;

          let record = { hits:0, rbi:0, runs:0, hr:0, strikeouts:0, at_bats:0, wins:0, losses:0, so_pitcher:0 };

          if (isHitting) {
            const AB  = stats[labels.indexOf('AB')]  || '0';
            const R   = stats[labels.indexOf('R')]   || '0';
            const H   = stats[labels.indexOf('H')]   || '0';
            const RBI = stats[labels.indexOf('RBI')] || '0';
            const HR  = stats[labels.indexOf('HR')]  || '0';
            const SO  = stats[labels.indexOf('SO')]  || '0';
            record.at_bats    = parseInt(AB) || 0;
            record.runs       = parseInt(R) || 0;
            record.hits       = parseInt(H) || 0;
            record.rbi        = parseInt(RBI) || 0;
            record.hr         = parseInt(HR) || 0;
            record.strikeouts = parseInt(SO) || 0;
          }

          if (isPitching) {
            const W  = stats[labels.indexOf('W')]  !== undefined ? stats[labels.indexOf('W')] : '0';
            const L  = stats[labels.indexOf('L')]  !== undefined ? stats[labels.indexOf('L')] : '0';
            const SO = stats[labels.indexOf('SO')] || '0';
            record.wins       = parseInt(W) || 0;
            record.losses     = parseInt(L) || 0;
            record.so_pitcher = parseInt(SO) || 0;
          }

          await pool.query(`
            INSERT INTO player_stats
              (game_id, player_id, hits, rbi, runs, hr, strikeouts, at_bats, wins, losses, so_pitcher)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            ON CONFLICT (game_id, player_id) DO UPDATE SET
              hits=EXCLUDED.hits, rbi=EXCLUDED.rbi, runs=EXCLUDED.runs,
              hr=EXCLUDED.hr, strikeouts=EXCLUDED.strikeouts,
              wins=EXCLUDED.wins, losses=EXCLUDED.losses, so_pitcher=EXCLUDED.so_pitcher
          `, [
            gameId, playerId,
            record.hits, record.rbi, record.runs, record.hr, record.strikeouts,
            record.at_bats, record.wins, record.losses, record.so_pitcher
          ]);
        }
      }
    }
  } catch(e) {
    // Non-fatal: stats will be empty for this game
  }
}

// Sync today
async function syncToday() {
  const today = new Date().toISOString().split('T')[0];
  return syncDate(today);
}

// Sync full season (date range)
async function syncSeason(season) {
  const start = new Date(`${season}-03-20`);
  const end   = new Date(`${season}-10-05`);
  const today = new Date();
  const limit = end < today ? end : today;
  let total = 0;

  for (let d = new Date(start); d <= limit; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    try {
      const count = await syncDate(dateStr);
      if (count > 0) console.log(`  ${dateStr}: ${count} games`);
      total += count;
      // Small delay to be respectful to ESPN
      await new Promise(r => setTimeout(r, 200));
    } catch(e) {
      // Skip failed dates
    }
  }
  return total;
}

module.exports = { syncToday, syncDate, syncSeason };
