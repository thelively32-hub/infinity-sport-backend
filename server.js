const express = require('express');
const cors = require('cors');
const mlbRoutes = require('./routes/mlb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ app: 'Infinity Sport Backend', status: 'running' });
});

app.use('/api/mlb', mlbRoutes);

app.listen(PORT, () => {
  console.log(`Infinity Sport Backend running on port ${PORT}`);
});
