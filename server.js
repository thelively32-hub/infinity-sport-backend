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
});
