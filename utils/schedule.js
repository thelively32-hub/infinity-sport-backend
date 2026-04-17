// utils/schedule.js — fetches MLB schedule for a given date
// Returns { mlbIds: [], games: [] }

async function getTeamsPlayingOn(date) {
  try {
    const url = `https://statsapi.mlb.com/api/v1/schedule?date=${date}&sportId=1`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { mlbIds: [], games: [] };
    const data = await r.json();
    const games = data.dates?.[0]?.games || [];
    const mlbIds = new Set();
    games.forEach(g => {
      const h = g.teams?.home?.team?.id;
      const a = g.teams?.away?.team?.id;
      if (h) mlbIds.add(h);
      if (a) mlbIds.add(a);
    });
    return { mlbIds: [...mlbIds], games };
  } catch (e) {
    console.error('[schedule] error', e.message);
    return { mlbIds: [], games: [] };
  }
}

module.exports = { getTeamsPlayingOn };
