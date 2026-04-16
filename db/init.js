// db/init.js
const pool = require('./index');

async function init() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        abbr VARCHAR(5),
        division VARCHAR(20),
        mlb_id INTEGER,
        espn_id VARCHAR(20),
        colors JSONB
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS managers (
        id SERIAL PRIMARY KEY,
        team_id VARCHAR(10) REFERENCES teams(id),
        name VARCHAR(100) NOT NULL,
        birth_date DATE,
        destiny_number INTEGER,
        season INTEGER DEFAULT 2026,
        UNIQUE(team_id, season)
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        team_id VARCHAR(10) REFERENCES teams(id),
        name VARCHAR(100) NOT NULL,
        birth_date DATE,
        destiny_number INTEGER,
        position VARCHAR(10),
        mlb_id INTEGER,
        espn_id VARCHAR(20),
        season INTEGER DEFAULT 2026
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        id VARCHAR(30) PRIMARY KEY,
        date DATE NOT NULL,
        season INTEGER,
        team_home VARCHAR(10) REFERENCES teams(id),
        team_away VARCHAR(10) REFERENCES teams(id),
        score_home INTEGER,
        score_away INTEGER,
        winner VARCHAR(10),
        status VARCHAR(20) DEFAULT 'final',
        espn_id VARCHAR(30),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS player_stats (
        id SERIAL PRIMARY KEY,
        game_id VARCHAR(30) REFERENCES games(id),
        player_id INTEGER REFERENCES players(id),
        hits INTEGER DEFAULT 0,
        rbi INTEGER DEFAULT 0,
        runs INTEGER DEFAULT 0,
        hr INTEGER DEFAULT 0,
        strikeouts INTEGER DEFAULT 0,
        at_bats INTEGER DEFAULT 0,
        walks INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        so_pitcher INTEGER DEFAULT 0,
        innings_pitched DECIMAL(4,1) DEFAULT 0,
        era DECIMAL(5,2),
        UNIQUE(game_id, player_id)
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_games_date ON games(date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_games_season ON games(season)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id)');

    await client.query('COMMIT');
    console.log('✅ Tables ready');

    await seedTeams(client);
    await seedManagers(client);
    await seedPlayers(client);
    console.log('✅ All data seeded');
  } catch(e) {
    await client.query('ROLLBACK');
    console.error('❌ Init error:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedTeams(client) {
  await client.query('DELETE FROM player_stats');
  await client.query('DELETE FROM players');
  await client.query('DELETE FROM managers');
  await client.query('DELETE FROM games');
  await client.query('DELETE FROM teams');
  const teams = [
    {id:'AZ', name:'Arizona Diamondbacks',   abbr:'AZ',  division:'NL West',    mlb_id:109, colors:'{"bg":"#A71930","tx":"#E3D4AD"}'},
    {id:'ATL',name:'Atlanta Braves',          abbr:'ATL', division:'NL East',    mlb_id:144, colors:'{"bg":"#CE1141","tx":"#FFFFFF"}'},
    {id:'BAL',name:'Baltimore Orioles',       abbr:'BAL', division:'AL East',    mlb_id:110, colors:'{"bg":"#DF4601","tx":"#000000"}'},
    {id:'BOS',name:'Boston Red Sox',          abbr:'BOS', division:'AL East',    mlb_id:111, colors:'{"bg":"#BD3039","tx":"#FFFFFF"}'},
    {id:'CHC',name:'Chicago Cubs',            abbr:'CHC', division:'NL Central', mlb_id:112, colors:'{"bg":"#0E3386","tx":"#FFFFFF"}'},
    {id:'CWS',name:'Chicago White Sox',       abbr:'CWS', division:'AL Central', mlb_id:145, colors:'{"bg":"#27251F","tx":"#C4CED4"}'},
    {id:'CIN',name:'Cincinnati Reds',         abbr:'CIN', division:'NL Central', mlb_id:113, colors:'{"bg":"#C6011F","tx":"#FFFFFF"}'},
    {id:'CLE',name:'Cleveland Guardians',     abbr:'CLE', division:'AL Central', mlb_id:114, colors:'{"bg":"#00385D","tx":"#E31937"}'},
    {id:'COL',name:'Colorado Rockies',        abbr:'COL', division:'NL West',    mlb_id:115, colors:'{"bg":"#33006F","tx":"#C4CED4"}'},
    {id:'DET',name:'Detroit Tigers',          abbr:'DET', division:'AL Central', mlb_id:116, colors:'{"bg":"#0C2340","tx":"#FA4616"}'},
    {id:'HOU',name:'Houston Astros',          abbr:'HOU', division:'AL West',    mlb_id:117, colors:'{"bg":"#002D62","tx":"#EB6E1F"}'},
    {id:'KC', name:'Kansas City Royals',      abbr:'KC',  division:'AL Central', mlb_id:118, colors:'{"bg":"#004687","tx":"#BD9B60"}'},
    {id:'LAA',name:'Los Angeles Angels',      abbr:'LAA', division:'AL West',    mlb_id:108, colors:'{"bg":"#BA0021","tx":"#FFFFFF"}'},
    {id:'LAD',name:'Los Angeles Dodgers',     abbr:'LAD', division:'NL West',    mlb_id:119, colors:'{"bg":"#003DA5","tx":"#FFFFFF"}'},
    {id:'MIA',name:'Miami Marlins',           abbr:'MIA', division:'NL East',    mlb_id:146, colors:'{"bg":"#00A3E0","tx":"#EF3340"}'},
    {id:'MIL',name:'Milwaukee Brewers',       abbr:'MIL', division:'NL Central', mlb_id:158, colors:'{"bg":"#12284B","tx":"#FFC52F"}'},
    {id:'MIN',name:'Minnesota Twins',         abbr:'MIN', division:'AL Central', mlb_id:142, colors:'{"bg":"#002B5C","tx":"#D31145"}'},
    {id:'NYM',name:'New York Mets',           abbr:'NYM', division:'NL East',    mlb_id:121, colors:'{"bg":"#002D72","tx":"#FF5910"}'},
    {id:'NYY',name:'New York Yankees',        abbr:'NYY', division:'AL East',    mlb_id:147, colors:'{"bg":"#003087","tx":"#FFFFFF"}'},
    {id:'OAK',name:'Oakland Athletics',       abbr:'OAK', division:'AL West',    mlb_id:133, colors:'{"bg":"#003831","tx":"#EFB21E"}'},
    {id:'PHI',name:'Philadelphia Phillies',   abbr:'PHI', division:'NL East',    mlb_id:143, colors:'{"bg":"#E81828","tx":"#FFFFFF"}'},
    {id:'PIT',name:'Pittsburgh Pirates',      abbr:'PIT', division:'NL Central', mlb_id:134, colors:'{"bg":"#27251F","tx":"#FDB827"}'},
    {id:'SD', name:'San Diego Padres',        abbr:'SD',  division:'NL West',    mlb_id:135, colors:'{"bg":"#2F241D","tx":"#FFC425"}'},
    {id:'SEA',name:'Seattle Mariners',        abbr:'SEA', division:'AL West',    mlb_id:136, colors:'{"bg":"#0C2C56","tx":"#005C5C"}'},
    {id:'SFG',name:'San Francisco Giants',    abbr:'SFG', division:'NL West',    mlb_id:137, colors:'{"bg":"#FD5A1E","tx":"#27251F"}'},
    {id:'STL',name:'St. Louis Cardinals',     abbr:'STL', division:'NL Central', mlb_id:138, colors:'{"bg":"#C41E3A","tx":"#FEDB00"}'},
    {id:'TB', name:'Tampa Bay Rays',          abbr:'TB',  division:'AL East',    mlb_id:139, colors:'{"bg":"#092C5C","tx":"#8FBCE6"}'},
    {id:'TEX',name:'Texas Rangers',           abbr:'TEX', division:'AL West',    mlb_id:140, colors:'{"bg":"#003278","tx":"#C0111F"}'},
    {id:'TOR',name:'Toronto Blue Jays',       abbr:'TOR', division:'AL East',    mlb_id:141, colors:'{"bg":"#134A8E","tx":"#FFFFFF"}'},
    {id:'WSH',name:'Washington Nationals',    abbr:'WSH', division:'NL East',    mlb_id:120, colors:'{"bg":"#AB0003","tx":"#FFFFFF"}'},
  ];
  for (const t of teams) {
    await client.query(`
      INSERT INTO teams (id,name,abbr,division,mlb_id,colors)
      VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    `, [t.id, t.name, t.abbr, t.division, t.mlb_id, t.colors]);
  }
  console.log('  → Teams seeded (30)');
}

async function seedManagers(client) {
  const { reduce } = require('../numerology');
  const managers = [
    {team_id:'AZ', name:'Torey Lovullo',       birth_date:'1965-07-25'},
    {team_id:'ATL',name:'Walt Weiss',           birth_date:'1963-11-28'},
    {team_id:'BAL',name:'Craig Albernaz',       birth_date:'1983-03-21'},
    {team_id:'BOS',name:'Alex Cora',            birth_date:'1975-10-18'},
    {team_id:'CHC',name:'Craig Counsell',       birth_date:'1970-08-21'},
    {team_id:'CWS',name:'Will Venable',         birth_date:'1982-10-29'},
    {team_id:'CIN',name:'Terry Francona',       birth_date:'1959-04-22'},
    {team_id:'CLE',name:'Stephen Vogt',         birth_date:'1984-11-01'},
    {team_id:'COL',name:'Warren Schaeffer',     birth_date:'1980-09-18'},
    {team_id:'DET',name:'A.J. Hinch',           birth_date:'1974-05-15'},
    {team_id:'HOU',name:'Joe Espada',           birth_date:'1975-08-30'},
    {team_id:'KC', name:'Matt Quatraro',        birth_date:'1973-11-14'},
    {team_id:'LAA',name:'Kurt Suzuki',          birth_date:'1983-10-04'},
    {team_id:'LAD',name:'Dave Roberts',         birth_date:'1972-05-31'},
    {team_id:'MIA',name:'Clayton McCullough',   birth_date:'1982-04-15'},
    {team_id:'MIL',name:'Pat Murphy',           birth_date:'1958-11-28'},
    {team_id:'MIN',name:'Derek Shelton',        birth_date:'1970-07-30'},
    {team_id:'NYM',name:'Carlos Mendoza',       birth_date:'1979-11-27'},
    {team_id:'NYY',name:'Aaron Boone',          birth_date:'1973-03-09'},
    {team_id:'OAK',name:'Mark Kotsay',          birth_date:'1975-12-02'},
    {team_id:'PHI',name:'Rob Thomson',          birth_date:'1963-08-16'},
    {team_id:'PIT',name:'Don Kelly',            birth_date:'1980-02-15'},
    {team_id:'SD', name:'Craig Stammen',        birth_date:'1984-03-09'},
    {team_id:'SEA',name:'Scott Servais',        birth_date:'1967-06-04'},
    {team_id:'SFG',name:'Tony Vitello',         birth_date:'1984-10-02'},
    {team_id:'STL',name:'Oliver Marmol',        birth_date:'1986-07-02'},
    {team_id:'TB', name:'Kevin Cash',           birth_date:'1977-12-06'},
    {team_id:'TEX',name:'Skip Schumaker',       birth_date:'1980-02-03'},
    {team_id:'TOR',name:'John Schneider',       birth_date:'1980-02-14'},
    {team_id:'WSH',name:'Blake Butera',         birth_date:'1992-10-31'},
  ];
  for (const m of managers) {
    const [y,mo,d] = m.birth_date.split('-').map(Number);
    const dn = reduce(y + mo + d);
    await client.query(`
      INSERT INTO managers (team_id,name,birth_date,destiny_number,season)
      VALUES ($1,$2,$3,$4,2026)
    `, [m.team_id, m.name, m.birth_date, dn]);
  }
  console.log('  → Managers seeded (30)');
}

async function seedPlayers(client) {
  const { reduce } = require('../numerology');
  const players = [
    {team_id:'AZ', name:'Corbin Carroll',        birth_date:'2000-08-21',pos:'RF', mlb_id:682998},
    {team_id:'AZ', name:'Ketel Marte',           birth_date:'1993-10-12',pos:'2B', mlb_id:606466},
    {team_id:'AZ', name:'Geraldo Perdomo',       birth_date:'1999-10-22',pos:'SS', mlb_id:669080},
    {team_id:'AZ', name:'Lourdes Gurriel Jr.',   birth_date:'1993-10-10',pos:'OF', mlb_id:666971},
    {team_id:'AZ', name:'Jordan Montgomery',     birth_date:'1992-12-27',pos:'SP', mlb_id:622982},
    {team_id:'ATL',name:'Ronald Acuña Jr.',      birth_date:'1997-12-18',pos:'RF', mlb_id:660670},
    {team_id:'ATL',name:'Austin Riley',          birth_date:'1997-04-02',pos:'3B', mlb_id:663586},
    {team_id:'ATL',name:'Matt Olson',            birth_date:'1994-03-29',pos:'1B', mlb_id:621566},
    {team_id:'ATL',name:'Michael Harris II',     birth_date:'2001-03-07',pos:'CF', mlb_id:677800},
    {team_id:'ATL',name:'Spencer Strider',       birth_date:'1998-10-28',pos:'SP', mlb_id:675911},
    {team_id:'BAL',name:'Gunnar Henderson',      birth_date:'2001-06-29',pos:'SS', mlb_id:683002},
    {team_id:'BAL',name:'Adley Rutschman',       birth_date:'1998-02-06',pos:'C',  mlb_id:668939},
    {team_id:'BAL',name:'Jordan Westburg',       birth_date:'1999-02-18',pos:'2B', mlb_id:676059},
    {team_id:'BAL',name:'Pete Alonso',           birth_date:'1994-12-07',pos:'1B', mlb_id:624413},
    {team_id:'BAL',name:'Jackson Holliday',      birth_date:'2003-12-04',pos:'SS', mlb_id:800014},
    {team_id:'BOS',name:'Garrett Crochet',       birth_date:'1999-06-21',pos:'SP', mlb_id:676979},
    {team_id:'BOS',name:'Roman Anthony',         birth_date:'2004-01-14',pos:'OF', mlb_id:701350},
    {team_id:'BOS',name:'Rafael Devers',         birth_date:'1996-10-22',pos:'3B', mlb_id:646240},
    {team_id:'BOS',name:'Sonny Gray',            birth_date:'1989-11-07',pos:'SP', mlb_id:543243},
    {team_id:'BOS',name:'Triston Casas',         birth_date:'2000-01-15',pos:'1B', mlb_id:683737},
    {team_id:'CHC',name:'Pete Crow-Armstrong',   birth_date:'2001-03-25',pos:'CF', mlb_id:694298},
    {team_id:'CHC',name:'Nico Hoerner',          birth_date:'1997-05-13',pos:'2B', mlb_id:663538},
    {team_id:'CHC',name:'Ian Happ',              birth_date:'1994-08-12',pos:'OF', mlb_id:664023},
    {team_id:'CHC',name:'Seiya Suzuki',          birth_date:'1994-08-18',pos:'RF', mlb_id:673548},
    {team_id:'CHC',name:'Justin Steele',         birth_date:'1996-07-11',pos:'SP', mlb_id:664728},
    {team_id:'CWS',name:'Luis Robert Jr.',       birth_date:'1997-08-03',pos:'CF', mlb_id:673357},
    {team_id:'CWS',name:'Andrew Vaughn',         birth_date:'1998-04-03',pos:'1B', mlb_id:683734},
    {team_id:'CWS',name:'Colson Montgomery',     birth_date:'2002-02-27',pos:'SS', mlb_id:694854},
    {team_id:'CWS',name:'Erick Fedde',           birth_date:'1993-02-25',pos:'SP', mlb_id:601713},
    {team_id:'CWS',name:'Gavin Sheets',          birth_date:'1996-04-23',pos:'DH', mlb_id:657757},
    {team_id:'CIN',name:'Elly De La Cruz',       birth_date:'2002-01-11',pos:'SS', mlb_id:682829},
    {team_id:'CIN',name:'Matt McLain',           birth_date:'2000-06-27',pos:'2B', mlb_id:682928},
    {team_id:'CIN',name:'Hunter Greene',         birth_date:'1999-08-06',pos:'SP', mlb_id:668901},
    {team_id:'CIN',name:'Spencer Steer',         birth_date:'1998-12-02',pos:'1B', mlb_id:683737},
    {team_id:'CIN',name:'Nick Lodolo',           birth_date:'1998-02-05',pos:'SP', mlb_id:669062},
    {team_id:'CLE',name:'José Ramírez',          birth_date:'1992-09-17',pos:'3B', mlb_id:608070},
    {team_id:'CLE',name:'Steven Kwan',           birth_date:'1997-09-05',pos:'OF', mlb_id:680757},
    {team_id:'CLE',name:'Andrés Giménez',        birth_date:'1998-09-04',pos:'2B', mlb_id:665926},
    {team_id:'CLE',name:'Josh Naylor',           birth_date:'1997-06-25',pos:'1B', mlb_id:647304},
    {team_id:'CLE',name:'Tanner Bibee',          birth_date:'1999-10-05',pos:'SP', mlb_id:694297},
    {team_id:'COL',name:'Ezequiel Tovar',        birth_date:'2001-08-01',pos:'SS', mlb_id:694354},
    {team_id:'COL',name:'Brenton Doyle',         birth_date:'1998-05-14',pos:'CF', mlb_id:681867},
    {team_id:'COL',name:'Nolan Jones',           birth_date:'1997-05-07',pos:'OF', mlb_id:666152},
    {team_id:'COL',name:'Kyle Freeland',         birth_date:'1993-05-14',pos:'SP', mlb_id:621237},
    {team_id:'COL',name:'Elehuris Montero',      birth_date:'1998-08-17',pos:'3B', mlb_id:678622},
    {team_id:'DET',name:'Tarik Skubal',          birth_date:'1996-11-20',pos:'SP', mlb_id:669373},
    {team_id:'DET',name:'Riley Greene',          birth_date:'2000-09-28',pos:'OF', mlb_id:682985},
    {team_id:'DET',name:'Spencer Torkelson',     birth_date:'2000-08-26',pos:'1B', mlb_id:679529},
    {team_id:'DET',name:'Colt Keith',            birth_date:'2000-08-14',pos:'2B', mlb_id:694192},
    {team_id:'DET',name:'Kerry Carpenter',       birth_date:'1997-02-04',pos:'OF', mlb_id:694481},
    {team_id:'HOU',name:'Yordan Álvarez',        birth_date:'1997-06-27',pos:'LF', mlb_id:670541},
    {team_id:'HOU',name:'Alex Bregman',          birth_date:'1994-03-30',pos:'3B', mlb_id:608324},
    {team_id:'HOU',name:'Hunter Brown',          birth_date:'1998-08-29',pos:'SP', mlb_id:686613},
    {team_id:'HOU',name:'Framber Valdez',        birth_date:'1994-11-19',pos:'SP', mlb_id:664285},
    {team_id:'HOU',name:'Jeremy Peña',           birth_date:'1997-09-22',pos:'SS', mlb_id:665606},
    {team_id:'KC', name:'Bobby Witt Jr.',        birth_date:'2000-06-14',pos:'SS', mlb_id:677951},
    {team_id:'KC', name:'Salvador Pérez',        birth_date:'1990-05-10',pos:'C',  mlb_id:521692},
    {team_id:'KC', name:'Vinnie Pasquantino',    birth_date:'1997-10-10',pos:'1B', mlb_id:686469},
    {team_id:'KC', name:'Cole Ragans',           birth_date:'1997-12-12',pos:'SP', mlb_id:669062},
    {team_id:'KC', name:'Michael Wacha',         birth_date:'1991-07-01',pos:'SP', mlb_id:572020},
    {team_id:'LAA',name:'Mike Trout',            birth_date:'1991-08-07',pos:'CF', mlb_id:545361},
    {team_id:'LAA',name:'Zach Neto',             birth_date:'2000-01-16',pos:'SS', mlb_id:694196},
    {team_id:'LAA',name:'Jo Adell',              birth_date:'1999-04-08',pos:'OF', mlb_id:668709},
    {team_id:'LAA',name:"Logan O'Hoppe",         birth_date:'2000-02-09',pos:'C',  mlb_id:681867},
    {team_id:'LAA',name:'Tyler Anderson',        birth_date:'1989-12-06',pos:'SP', mlb_id:542881},
    {team_id:'LAD',name:'Shohei Ohtani',         birth_date:'1994-07-05',pos:'DH', mlb_id:660271},
    {team_id:'LAD',name:'Mookie Betts',          birth_date:'1992-10-07',pos:'SS', mlb_id:605141},
    {team_id:'LAD',name:'Freddie Freeman',       birth_date:'1989-09-12',pos:'1B', mlb_id:518692},
    {team_id:'LAD',name:'Yoshinobu Yamamoto',    birth_date:'1998-08-17',pos:'SP', mlb_id:808967},
    {team_id:'LAD',name:'Kyle Tucker',           birth_date:'1996-01-17',pos:'RF', mlb_id:663656},
    {team_id:'MIA',name:'Xavier Edwards',        birth_date:'2000-08-09',pos:'2B', mlb_id:672356},
    {team_id:'MIA',name:'Sandy Alcántara',       birth_date:'1995-09-07',pos:'SP', mlb_id:645261},
    {team_id:'MIA',name:'Eury Pérez',            birth_date:'2003-04-15',pos:'SP', mlb_id:694943},
    {team_id:'MIA',name:'Otto Lopez',            birth_date:'1998-10-01',pos:'OF', mlb_id:672356},
    {team_id:'MIA',name:'Kyle Stowers',          birth_date:'1998-01-02',pos:'OF', mlb_id:681867},
    {team_id:'MIL',name:'Jackson Chourio',       birth_date:'2004-03-11',pos:'OF', mlb_id:694497},
    {team_id:'MIL',name:'William Contreras',     birth_date:'1997-12-24',pos:'C',  mlb_id:661388},
    {team_id:'MIL',name:'Freddy Peralta',        birth_date:'1996-06-04',pos:'SP', mlb_id:641154},
    {team_id:'MIL',name:'Willy Adames',          birth_date:'1995-09-02',pos:'SS', mlb_id:642715},
    {team_id:'MIL',name:'Joey Wiemer',           birth_date:'1999-02-11',pos:'OF', mlb_id:694854},
    {team_id:'MIN',name:'Byron Buxton',          birth_date:'1993-12-18',pos:'CF', mlb_id:621439},
    {team_id:'MIN',name:'Carlos Correa',         birth_date:'1994-09-22',pos:'SS', mlb_id:621043},
    {team_id:'MIN',name:'Ryan Jeffers',          birth_date:'1997-06-03',pos:'C',  mlb_id:680777},
    {team_id:'MIN',name:'Pablo López',           birth_date:'1996-03-07',pos:'SP', mlb_id:641154},
    {team_id:'MIN',name:'Joe Ryan',              birth_date:'1996-06-05',pos:'SP', mlb_id:666201},
    {team_id:'NYM',name:'Juan Soto',             birth_date:'1998-10-25',pos:'OF', mlb_id:665742},
    {team_id:'NYM',name:'Francisco Lindor',      birth_date:'1993-11-14',pos:'SS', mlb_id:596019},
    {team_id:'NYM',name:'Pete Alonso',           birth_date:'1994-12-07',pos:'1B', mlb_id:624413},
    {team_id:'NYM',name:'Sean Manaea',           birth_date:'1992-02-01',pos:'SP', mlb_id:592836},
    {team_id:'NYM',name:'David Peterson',        birth_date:'1996-09-03',pos:'SP', mlb_id:669392},
    {team_id:'NYY',name:'Aaron Judge',           birth_date:'1992-04-26',pos:'RF', mlb_id:592450},
    {team_id:'NYY',name:'Max Fried',             birth_date:'1994-01-18',pos:'SP', mlb_id:608331},
    {team_id:'NYY',name:'Jazz Chisholm Jr.',     birth_date:'1998-02-01',pos:'3B', mlb_id:665862},
    {team_id:'NYY',name:'Cody Bellinger',        birth_date:'1995-07-13',pos:'OF', mlb_id:641355},
    {team_id:'NYY',name:'Austin Wells',          birth_date:'2000-07-12',pos:'C',  mlb_id:669224},
    {team_id:'OAK',name:'Nick Kurtz',            birth_date:'2002-10-29',pos:'1B', mlb_id:808982},
    {team_id:'OAK',name:'Brent Rooker',          birth_date:'1994-11-01',pos:'DH', mlb_id:668942},
    {team_id:'OAK',name:'Jacob Wilson',          birth_date:'2002-07-17',pos:'SS', mlb_id:808967},
    {team_id:'OAK',name:'Mason Miller',          birth_date:'1998-09-08',pos:'RP', mlb_id:694538},
    {team_id:'OAK',name:'JP Sears',              birth_date:'1996-02-19',pos:'SP', mlb_id:672515},
    {team_id:'PHI',name:'Kyle Schwarber',        birth_date:'1993-03-05',pos:'DH', mlb_id:656941},
    {team_id:'PHI',name:'Trea Turner',           birth_date:'1993-06-30',pos:'SS', mlb_id:607208},
    {team_id:'PHI',name:'Bryce Harper',          birth_date:'1992-10-16',pos:'1B', mlb_id:547180},
    {team_id:'PHI',name:'Zack Wheeler',          birth_date:'1990-05-30',pos:'SP', mlb_id:554430},
    {team_id:'PHI',name:'Cristopher Sánchez',    birth_date:'1996-12-12',pos:'SP', mlb_id:669060},
    {team_id:'PIT',name:'Paul Skenes',           birth_date:'2002-05-29',pos:'SP', mlb_id:694973},
    {team_id:'PIT',name:'Oneil Cruz',            birth_date:'1998-10-04',pos:'SS', mlb_id:665833},
    {team_id:'PIT',name:'Bryan Reynolds',        birth_date:'1995-01-27',pos:'OF', mlb_id:668804},
    {team_id:'PIT',name:'Rowdy Tellez',          birth_date:'1994-03-16',pos:'1B', mlb_id:642731},
    {team_id:'PIT',name:'Marco Gonzales',        birth_date:'1992-02-16',pos:'SP', mlb_id:594835},
    {team_id:'SD', name:'Fernando Tatis Jr.',    birth_date:'1999-01-02',pos:'RF', mlb_id:665487},
    {team_id:'SD', name:'Manny Machado',         birth_date:'1992-07-06',pos:'3B', mlb_id:592518},
    {team_id:'SD', name:'Jake Cronenworth',      birth_date:'1994-01-21',pos:'2B', mlb_id:683737},
    {team_id:'SD', name:'Yu Darvish',            birth_date:'1986-08-16',pos:'SP', mlb_id:506433},
    {team_id:'SD', name:'Xander Bogaerts',       birth_date:'1992-10-01',pos:'SS', mlb_id:595777},
    {team_id:'SEA',name:'Cal Raleigh',           birth_date:'1996-11-26',pos:'C',  mlb_id:663728},
    {team_id:'SEA',name:'Julio Rodríguez',       birth_date:'2000-12-29',pos:'CF', mlb_id:677594},
    {team_id:'SEA',name:'George Kirby',          birth_date:'1998-02-04',pos:'SP', mlb_id:669923},
    {team_id:'SEA',name:'Logan Gilbert',         birth_date:'1997-05-05',pos:'SP', mlb_id:669302},
    {team_id:'SEA',name:'Ty France',             birth_date:'1994-07-13',pos:'1B', mlb_id:664353},
    {team_id:'SFG',name:'Logan Webb',            birth_date:'1997-11-18',pos:'SP', mlb_id:657277},
    {team_id:'SFG',name:'Matt Chapman',          birth_date:'1993-04-28',pos:'3B', mlb_id:656305},
    {team_id:'SFG',name:'Jung Hoo Lee',          birth_date:'1998-08-20',pos:'CF', mlb_id:800058},
    {team_id:'SFG',name:'Patrick Bailey',        birth_date:'1999-05-29',pos:'C',  mlb_id:672724},
    {team_id:'SFG',name:'Heliot Ramos',          birth_date:'1999-09-07',pos:'OF', mlb_id:671218},
    {team_id:'STL',name:'Masyn Winn',            birth_date:'2001-05-21',pos:'SS', mlb_id:694002},
    {team_id:'STL',name:'Nolan Arenado',         birth_date:'1991-04-16',pos:'3B', mlb_id:571448},
    {team_id:'STL',name:'Lars Nootbaar',         birth_date:'1997-09-08',pos:'OF', mlb_id:663993},
    {team_id:'STL',name:'Miles Mikolas',         birth_date:'1988-08-23',pos:'SP', mlb_id:571945},
    {team_id:'STL',name:'Ivan Herrera',          birth_date:'2000-06-01',pos:'C',  mlb_id:678622},
    {team_id:'TB', name:'Junior Caminero',       birth_date:'2003-07-05',pos:'3B', mlb_id:691406},
    {team_id:'TB', name:'Shane McClanahan',      birth_date:'1997-04-28',pos:'SP', mlb_id:663556},
    {team_id:'TB', name:'Yandy Díaz',            birth_date:'1991-08-08',pos:'1B', mlb_id:650490},
    {team_id:'TB', name:'Drew Rasmussen',        birth_date:'1995-07-27',pos:'SP', mlb_id:670174},
    {team_id:'TB', name:'Jonathan Aranda',       birth_date:'1998-05-23',pos:'1B', mlb_id:677800},
    {team_id:'TEX',name:'Corey Seager',          birth_date:'1994-04-27',pos:'SS', mlb_id:608369},
    {team_id:'TEX',name:'Marcus Semien',         birth_date:'1990-09-17',pos:'2B', mlb_id:543760},
    {team_id:'TEX',name:'Adolis García',         birth_date:'1993-03-02',pos:'RF', mlb_id:666969},
    {team_id:'TEX',name:'Nathaniel Lowe',        birth_date:'1995-07-07',pos:'1B', mlb_id:663993},
    {team_id:'TEX',name:'Jacob deGrom',          birth_date:'1988-06-19',pos:'SP', mlb_id:594798},
    {team_id:'TOR',name:'Vladimir Guerrero Jr.', birth_date:'1999-03-16',pos:'1B', mlb_id:665489},
    {team_id:'TOR',name:'Alejandro Kirk',        birth_date:'2000-11-06',pos:'C',  mlb_id:672386},
    {team_id:'TOR',name:'George Springer',       birth_date:'1989-09-19',pos:'OF', mlb_id:543807},
    {team_id:'TOR',name:'Kevin Gausman',         birth_date:'1991-01-06',pos:'SP', mlb_id:592332},
    {team_id:'TOR',name:'Daulton Varsho',        birth_date:'1996-07-02',pos:'OF', mlb_id:661388},
    {team_id:'WSH',name:'James Wood',            birth_date:'2002-09-17',pos:'OF', mlb_id:694484},
    {team_id:'WSH',name:'CJ Abrams',             birth_date:'2001-10-03',pos:'SS', mlb_id:682928},
    {team_id:'WSH',name:'MacKenzie Gore',        birth_date:'1999-02-24',pos:'SP', mlb_id:669388},
    {team_id:'WSH',name:'Jacob Young',           birth_date:'2000-11-19',pos:'OF', mlb_id:694354},
    {team_id:'WSH',name:'Josiah Gray',           birth_date:'1997-12-21',pos:'SP', mlb_id:669062},
  ];
  for (const p of players) {
    const [y,m,d] = p.birth_date.split('-').map(Number);
    const dn = reduce(y + m + d);
    await client.query(`
      INSERT INTO players (team_id,name,birth_date,destiny_number,position,mlb_id,season)
      VALUES ($1,$2,$3,$4,$5,$6,2026)
    `, [p.team_id, p.name, p.birth_date, dn, p.pos, p.mlb_id]);
  }
  console.log('  → Players seeded (150)');
}

init().catch(console.error);
