const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','OPTIONS'], allowedHeaders: '*' }));
app.options('*', (req, res) => { res.header('Access-Control-Allow-Origin','*'); res.sendStatus(204); });
app.use((req,res,next)=>{ res.header('Access-Control-Allow-Origin','*'); next(); });
app.use(express.json());

// ── ROUTES ────────────────────────────────────────────────
app.use('/api/teams',    require('./routes/teams'));
app.use('/api/players',  require('./routes/players'));
app.use('/api/games',    require('./routes/games'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/sync',     require('./routes/sync'));

// ── HEALTH ────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    app: 'Sendero Deportivo Backend',
    version: '2.0.0',
    status: 'running',
    endpoints: [
      'GET  /api/teams',
      'GET  /api/players?teamId=',
      'GET  /api/games?teamId=&season=',
      'GET  /api/analysis/player?playerId=&season=',
      'GET  /api/analysis/manager?teamId=&season=',
      'GET  /api/analysis/vs?teamA=&teamB=&season=',
      'GET  /api/analysis/calendar?teamId=&year=&month=',
      'POST /api/sync/today',
      'POST /api/sync/season?teamId=&season=',
    ]
  });
});

// ── CRON: sync today's games every hour during season ─────
cron.schedule('0 * * * *', async () => {
  console.log('[CRON] Syncing today games...');
  try {
    const { syncToday } = require('./db/sync');
    await syncToday();
  } catch(e) {
    console.error('[CRON] Error:', e.message);
  }
});

app.listen(PORT, () => {
  console.log(`Sendero Backend running on port ${PORT}`);
});
