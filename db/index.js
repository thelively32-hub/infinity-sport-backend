const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

console.log('DB connecting to:', connectionString ? connectionString.split('@')[1] : 'NO URL FOUND');

const pool = new Pool({
  connectionString,
  ssl: false,
});

pool.on('error', (err) => {
  console.error('DB pool error:', err.message);
});

module.exports = pool;
