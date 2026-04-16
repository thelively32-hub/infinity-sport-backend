router.get('/player', async (req, res) => {
  try {
    const { playerId, season = 2025 } = req.query;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });

    const { rows: ps } = await pool.query('SELECT * FROM players WHERE id = $1', [playerId]);
    if (!ps.length) return res.status(404).json({ error: 'Player not found' });
    const player = ps[0];
    const isPitcher = ['SP','RP','P'].includes(player.position || '');

    // Fetch directly from MLB Stats API
    const group = isPitcher ? 'pitching' : 'hitting';
    const url = `https://statsapi.mlb.com/api/v1/people/${player.mlb_id}/stats?stats=gameLog&season=${season}&group=${group}&sportId=1`;
    const res2 = await fetch(url);
    const data = await res2.json();
    const splits = data.stats?.[0]?.splits || [];

    const { vibrationPerson } = require('../numerology');
    const stats = {};
    for (let v = 1; v <= 9; v++) {
      stats[v] = isPitcher
        ? { G: 0, W: 0, L: 0, SO: 0 }
        : { G: 0, H: 0, HR: 0, RBI: 0, K: 0, R: 0, AB: 0 };
    }

    for (const s of splits) {
      if (!s.date) continue;
      const v = vibrationPerson(player.birth_date, s.date);
      stats[v].G++;
      if (isPitcher) {
        stats[v].W  += s.stat?.wins || 0;
        stats[v].L  += s.stat?.losses || 0;
        stats[v].SO += s.stat?.strikeOuts || 0;
      } else {
        stats[v].H   += s.stat?.hits || 0;
        stats[v].HR  += s.stat?.homeRuns || 0;
        stats[v].RBI += s.stat?.rbi || 0;
        stats[v].K   += s.stat?.strikeOuts || 0;
        stats[v].R   += s.stat?.runs || 0;
        stats[v].AB  += s.stat?.atBats || 0;
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
      totalGames: splits.length,
      stats,
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});
