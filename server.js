const express = require('express');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? process.env.DATABASE_URL.split('@')[1] : 'NOT SET');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'], allowedHeaders: '*' }));
app.options('*', (req, res) => { res.header('Access-Control-Allow-Origin','*'); res.sendStatus(204); });
app.use((req,res,next)=>{ res.header('Access-Control-Allow-Origin','*'); next(); });
app.use(express.json());

app.use('/api/today',    require('./routes/today'));
app.use('/api/verify',   require('./routes/verify'));
app.use('/api/accuracy', require('./routes/accuracy'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/teams',    require('./routes/teams'));
app.use('/api/players',  require('./routes/players'));
app.use('/api/games',    require('./routes/games'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/sync',     require('./routes/sync'));
app.use('/api/mlb', require('./routes/mlb'));
app.get('/', (req, res) => {
  res.json({ app: 'Sendero Deportivo Backend', version: '2.0.0', status: 'running' });
});

app.listen(PORT, () => {
  console.log(`Sendero Backend running on port ${PORT}`);

  // ── AUTO ROSTER SYNC: runs on startup + every 24h ─────
  const cron = require('node-cron');
  const { reduce } = require('./numerology');
  const pool = require('./db');

  async function runRosterSync(season = 2026) {
    console.log(`[auto-sync] Starting roster sync for ${season}...`);
    try {
      const { rows: teams } = await pool.query('SELECT id, mlb_id FROM teams');
      const currentMlbIds = new Set();
      let inserted = 0, updated = 0;

      for (const team of teams) {
        try {
          const url = `https://statsapi.mlb.com/api/v1/teams/${team.mlb_id}/roster/active?season=${season}&hydrate=person`;
          const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!r.ok) continue;
          const data = await r.json();
          for (const p of (data.roster || [])) {
            const person = p.person || {};
            if (!person.birthDate) continue;
            currentMlbIds.add(person.id);
            const [y,m,d] = person.birthDate.split('-').map(Number);
            const dn = reduce(y + m + d);
            const pos = p.position?.abbreviation || person.primaryPosition?.abbreviation || '';
            const ex = await pool.query('SELECT id FROM players WHERE mlb_id=$1 AND season=$2 LIMIT 1', [person.id, season]);
            if (ex.rows.length === 0) {
              await pool.query(`INSERT INTO players (team_id,name,birth_date,destiny_number,position,mlb_id,season) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [team.id, person.fullName, person.birthDate, dn, pos, person.id, season]);
              inserted++;
            } else {
              await pool.query(`UPDATE players SET team_id=$1,position=$2,name=$3,birth_date=$4,destiny_number=$5 WHERE id=$6`,
                [team.id, pos, person.fullName, person.birthDate, dn, ex.rows[0].id]);
              updated++;
            }
          }
        } catch(e) { /* skip team */ }
      }

      // Cleanup stale
      if (currentMlbIds.size > 100) {
        await pool.query(`DELETE FROM player_stats WHERE player_id IN (SELECT id FROM players WHERE season=$1 AND (mlb_id IS NULL OR NOT (mlb_id=ANY($2))))`, [season, [...currentMlbIds]]);
        const cleaned = await pool.query(`DELETE FROM players WHERE season=$1 AND (mlb_id IS NULL OR NOT (mlb_id=ANY($2)))`, [season, [...currentMlbIds]]);
        console.log(`[auto-sync] ✅ inserted:${inserted} updated:${updated} stale-removed:${cleaned.rowCount}`);
      }
    } catch(e) {
      console.error('[auto-sync] error:', e.message);
    }
  }

  // Run daily at 7:00 AM UTC (~3 AM ET) — before games start
  cron.schedule('0 7 * * *', () => runRosterSync(2026));
  console.log('[auto-sync] Scheduled roster sync daily at 07:00 UTC');
});
