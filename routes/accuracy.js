// routes/accuracy.js
// Aggregate accuracy over last N days
const router = require('express').Router();
const { computePicksWithVerification, verifyCache } = require('./verify');

function daysBack(n) {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

// GET /api/accuracy?days=7
router.get('/', async (req, res) => {
  try {
    const days = Math.min(30, Math.max(1, parseInt(req.query.days || '7')));
    const dates = daysBack(days);

    // Process in parallel but limit concurrency to 3 to avoid overwhelming MLB API
    const results = [];
    const BATCH = 3;
    for (let i = 0; i < dates.length; i += BATCH) {
      const batch = dates.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(async d => {
        try {
          if (verifyCache.has(d)) return verifyCache.get(d);
          const r = await computePicksWithVerification(d);
          verifyCache.set(d, r);
          return r;
        } catch(e) {
          return null;
        }
      }));
      results.push(...batchResults.filter(Boolean));
    }

    // Aggregate
    let overTotal = 0, overHits = 0, underTotal = 0, underHits = 0;
    const daily = results.map(r => {
      overTotal += r.summary.overTotal;
      overHits  += r.summary.overHits;
      underTotal += r.summary.underTotal;
      underHits  += r.summary.underHits;
      return {
        date: r.date,
        overTotal: r.summary.overTotal,
        overHits: r.summary.overHits,
        overAccuracy: r.summary.overAccuracy,
        underTotal: r.summary.underTotal,
        underHits: r.summary.underHits,
        underAccuracy: r.summary.underAccuracy,
      };
    });

    res.json({
      days,
      aggregate: {
        overTotal,
        overHits,
        overAccuracy: overTotal > 0 ? Math.round(overHits / overTotal * 100) : null,
        underTotal,
        underHits,
        underAccuracy: underTotal > 0 ? Math.round(underHits / underTotal * 100) : null,
        totalPicks: overTotal + underTotal,
        totalHits: overHits + underHits,
        overallAccuracy: (overTotal+underTotal) > 0 ? Math.round((overHits+underHits)/(overTotal+underTotal)*100) : null,
      },
      daily,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
