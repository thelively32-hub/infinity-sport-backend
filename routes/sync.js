const express = require('express');
const router = express.Router();

// GET /api/sync/init-db — initialize and seed all data
router.get('/init-db', async (req, res) => {
  const pool = require('../db/index');
  const { reduce } = require('../numerology');
  try {
    // Create tables
    await pool.query(`CREATE TABLE IF NOT EXISTS teams (
      id VARCHAR(10) PRIMARY KEY, name VARCHAR(100) NOT NULL,
      abbr VARCHAR(5), division VARCHAR(20), mlb_id INTEGER, colors JSONB)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS managers (
      id SERIAL PRIMARY KEY, team_id VARCHAR(10) REFERENCES teams(id),
      name VARCHAR(100), birth_date DATE, destiny_number INTEGER,
      season INTEGER DEFAULT 2026, UNIQUE(team_id,season))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS players (
      id SERIAL PRIMARY KEY, team_id VARCHAR(10) REFERENCES teams(id),
      name VARCHAR(100), birth_date DATE, destiny_number INTEGER,
      position VARCHAR(10), mlb_id INTEGER, season INTEGER DEFAULT 2026)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS games (
      id VARCHAR(30) PRIMARY KEY, date DATE, season INTEGER,
      team_home VARCHAR(10) REFERENCES teams(id),
      team_away VARCHAR(10) REFERENCES teams(id),
      score_home INTEGER, score_away INTEGER, winner VARCHAR(10),
      status VARCHAR(20) DEFAULT 'final', espn_id VARCHAR(30),
      created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS player_stats (
      id SERIAL PRIMARY KEY, game_id VARCHAR(30) REFERENCES games(id),
      player_id INTEGER REFERENCES players(id),
      hits INTEGER DEFAULT 0, rbi INTEGER DEFAULT 0, runs INTEGER DEFAULT 0,
      hr INTEGER DEFAULT 0, strikeouts INTEGER DEFAULT 0, at_bats INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, so_pitcher INTEGER DEFAULT 0,
      UNIQUE(game_id,player_id))`);

    // Clear existing data
    await pool.query('DELETE FROM player_stats');
    await pool.query('DELETE FROM players');
    await pool.query('DELETE FROM managers');
    await pool.query('DELETE FROM games');
    await pool.query('DELETE FROM teams');

    // Seed teams
    const teams = [
      {id:'AZ', name:'Arizona Diamondbacks',  abbr:'AZ',  div:'NL West',    mlb:109, c:'{"bg":"#A71930","tx":"#E3D4AD"}'},
      {id:'ATL',name:'Atlanta Braves',         abbr:'ATL', div:'NL East',    mlb:144, c:'{"bg":"#CE1141","tx":"#FFFFFF"}'},
      {id:'BAL',name:'Baltimore Orioles',      abbr:'BAL', div:'AL East',    mlb:110, c:'{"bg":"#DF4601","tx":"#000000"}'},
      {id:'BOS',name:'Boston Red Sox',         abbr:'BOS', div:'AL East',    mlb:111, c:'{"bg":"#BD3039","tx":"#FFFFFF"}'},
      {id:'CHC',name:'Chicago Cubs',           abbr:'CHC', div:'NL Central', mlb:112, c:'{"bg":"#0E3386","tx":"#FFFFFF"}'},
      {id:'CWS',name:'Chicago White Sox',      abbr:'CWS', div:'AL Central', mlb:145, c:'{"bg":"#27251F","tx":"#C4CED4"}'},
      {id:'CIN',name:'Cincinnati Reds',        abbr:'CIN', div:'NL Central', mlb:113, c:'{"bg":"#C6011F","tx":"#FFFFFF"}'},
      {id:'CLE',name:'Cleveland Guardians',    abbr:'CLE', div:'AL Central', mlb:114, c:'{"bg":"#00385D","tx":"#E31937"}'},
      {id:'COL',name:'Colorado Rockies',       abbr:'COL', div:'NL West',    mlb:115, c:'{"bg":"#33006F","tx":"#C4CED4"}'},
      {id:'DET',name:'Detroit Tigers',         abbr:'DET', div:'AL Central', mlb:116, c:'{"bg":"#0C2340","tx":"#FA4616"}'},
      {id:'HOU',name:'Houston Astros',         abbr:'HOU', div:'AL West',    mlb:117, c:'{"bg":"#002D62","tx":"#EB6E1F"}'},
      {id:'KC', name:'Kansas City Royals',     abbr:'KC',  div:'AL Central', mlb:118, c:'{"bg":"#004687","tx":"#BD9B60"}'},
      {id:'LAA',name:'Los Angeles Angels',     abbr:'LAA', div:'AL West',    mlb:108, c:'{"bg":"#BA0021","tx":"#FFFFFF"}'},
      {id:'LAD',name:'Los Angeles Dodgers',    abbr:'LAD', div:'NL West',    mlb:119, c:'{"bg":"#003DA5","tx":"#FFFFFF"}'},
      {id:'MIA',name:'Miami Marlins',          abbr:'MIA', div:'NL East',    mlb:146, c:'{"bg":"#00A3E0","tx":"#EF3340"}'},
      {id:'MIL',name:'Milwaukee Brewers',      abbr:'MIL', div:'NL Central', mlb:158, c:'{"bg":"#12284B","tx":"#FFC52F"}'},
      {id:'MIN',name:'Minnesota Twins',        abbr:'MIN', div:'AL Central', mlb:142, c:'{"bg":"#002B5C","tx":"#D31145"}'},
      {id:'NYM',name:'New York Mets',          abbr:'NYM', div:'NL East',    mlb:121, c:'{"bg":"#002D72","tx":"#FF5910"}'},
      {id:'NYY',name:'New York Yankees',       abbr:'NYY', div:'AL East',    mlb:147, c:'{"bg":"#003087","tx":"#FFFFFF"}'},
      {id:'OAK',name:'Oakland Athletics',      abbr:'OAK', div:'AL West',    mlb:133, c:'{"bg":"#003831","tx":"#EFB21E"}'},
      {id:'PHI',name:'Philadelphia Phillies',  abbr:'PHI', div:'NL East',    mlb:143, c:'{"bg":"#E81828","tx":"#FFFFFF"}'},
      {id:'PIT',name:'Pittsburgh Pirates',     abbr:'PIT', div:'NL Central', mlb:134, c:'{"bg":"#27251F","tx":"#FDB827"}'},
      {id:'SD', name:'San Diego Padres',       abbr:'SD',  div:'NL West',    mlb:135, c:'{"bg":"#2F241D","tx":"#FFC425"}'},
      {id:'SEA',name:'Seattle Mariners',       abbr:'SEA', div:'AL West',    mlb:136, c:'{"bg":"#0C2C56","tx":"#005C5C"}'},
      {id:'SFG',name:'San Francisco Giants',   abbr:'SFG', div:'NL West',    mlb:137, c:'{"bg":"#FD5A1E","tx":"#27251F"}'},
      {id:'STL',name:'St. Louis Cardinals',    abbr:'STL', div:'NL Central', mlb:138, c:'{"bg":"#C41E3A","tx":"#FEDB00"}'},
      {id:'TB', name:'Tampa Bay Rays',         abbr:'TB',  div:'AL East',    mlb:139, c:'{"bg":"#092C5C","tx":"#8FBCE6"}'},
      {id:'TEX',name:'Texas Rangers',          abbr:'TEX', div:'AL West',    mlb:140, c:'{"bg":"#003278","tx":"#C0111F"}'},
      {id:'TOR',name:'Toronto Blue Jays',      abbr:'TOR', div:'AL East',    mlb:141, c:'{"bg":"#134A8E","tx":"#FFFFFF"}'},
      {id:'WSH',name:'Washington Nationals',   abbr:'WSH', div:'NL East',    mlb:120, c:'{"bg":"#AB0003","tx":"#FFFFFF"}'},
    ];
    for (const t of teams) {
      await pool.query(
        'INSERT INTO teams (id,name,abbr,division,mlb_id,colors) VALUES ($1,$2,$3,$4,$5,$6::jsonb)',
        [t.id, t.name, t.abbr, t.div, t.mlb, t.c]
      );
    }

    // Seed managers
    const managers = [
      {t:'AZ', n:'Torey Lovullo',     b:'1965-07-25'},
      {t:'ATL',n:'Walt Weiss',        b:'1963-11-28'},
      {t:'BAL',n:'Craig Albernaz',    b:'1983-03-21'},
      {t:'BOS',n:'Alex Cora',         b:'1975-10-18'},
      {t:'CHC',n:'Craig Counsell',    b:'1970-08-21'},
      {t:'CWS',n:'Will Venable',      b:'1982-10-29'},
      {t:'CIN',n:'Terry Francona',    b:'1959-04-22'},
      {t:'CLE',n:'Stephen Vogt',      b:'1984-11-01'},
      {t:'COL',n:'Warren Schaeffer',  b:'1980-09-18'},
      {t:'DET',n:'A.J. Hinch',        b:'1974-05-15'},
      {t:'HOU',n:'Joe Espada',        b:'1975-08-30'},
      {t:'KC', n:'Matt Quatraro',     b:'1973-11-14'},
      {t:'LAA',n:'Kurt Suzuki',       b:'1983-10-04'},
      {t:'LAD',n:'Dave Roberts',      b:'1972-05-31'},
      {t:'MIA',n:'Clayton McCullough',b:'1982-04-15'},
      {t:'MIL',n:'Pat Murphy',        b:'1958-11-28'},
      {t:'MIN',n:'Derek Shelton',     b:'1970-07-30'},
      {t:'NYM',n:'Carlos Mendoza',    b:'1979-11-27'},
      {t:'NYY',n:'Aaron Boone',       b:'1973-03-09'},
      {t:'OAK',n:'Mark Kotsay',       b:'1975-12-02'},
      {t:'PHI',n:'Rob Thomson',       b:'1963-08-16'},
      {t:'PIT',n:'Don Kelly',         b:'1980-02-15'},
      {t:'SD', n:'Craig Stammen',     b:'1984-03-09'},
      {t:'SEA',n:'Scott Servais',     b:'1967-06-04'},
      {t:'SFG',n:'Tony Vitello',      b:'1984-10-02'},
      {t:'STL',n:'Oliver Marmol',     b:'1986-07-02'},
      {t:'TB', n:'Kevin Cash',        b:'1977-12-06'},
      {t:'TEX',n:'Skip Schumaker',    b:'1980-02-03'},
      {t:'TOR',n:'John Schneider',    b:'1980-02-14'},
      {t:'WSH',n:'Blake Butera',      b:'1992-10-31'},
    ];
    for (const m of managers) {
      const [y,mo,d] = m.b.split('-').map(Number);
      const dn = reduce(y+mo+d);
      await pool.query(
        'INSERT INTO managers (team_id,name,birth_date,destiny_number,season) VALUES ($1,$2,$3,$4,2026)',
        [m.t, m.n, m.b, dn]
      );
    }

    // Seed players
    const players = [
      {t:'AZ', n:'Corbin Carroll',       b:'2000-08-21',p:'RF',id:682998},
      {t:'AZ', n:'Ketel Marte',          b:'1993-10-12',p:'2B',id:606466},
      {t:'AZ', n:'Geraldo Perdomo',      b:'1999-10-22',p:'SS',id:669080},
      {t:'AZ', n:'Lourdes Gurriel Jr.',  b:'1993-10-10',p:'OF',id:666971},
      {t:'AZ', n:'Jordan Montgomery',    b:'1992-12-27',p:'SP',id:622982},
      {t:'ATL',n:'Ronald Acuña Jr.',     b:'1997-12-18',p:'RF',id:660670},
      {t:'ATL',n:'Austin Riley',         b:'1997-04-02',p:'3B',id:663586},
      {t:'ATL',n:'Matt Olson',           b:'1994-03-29',p:'1B',id:621566},
      {t:'ATL',n:'Michael Harris II',    b:'2001-03-07',p:'CF',id:677800},
      {t:'ATL',n:'Spencer Strider',      b:'1998-10-28',p:'SP',id:675911},
      {t:'BAL',n:'Gunnar Henderson',     b:'2001-06-29',p:'SS',id:683002},
      {t:'BAL',n:'Adley Rutschman',      b:'1998-02-06',p:'C', id:668939},
      {t:'BAL',n:'Jordan Westburg',      b:'1999-02-18',p:'2B',id:676059},
      {t:'BAL',n:'Pete Alonso',          b:'1994-12-07',p:'1B',id:624413},
      {t:'BAL',n:'Jackson Holliday',     b:'2003-12-04',p:'SS',id:800014},
      {t:'BOS',n:'Garrett Crochet',      b:'1999-06-21',p:'SP',id:676979},
      {t:'BOS',n:'Roman Anthony',        b:'2004-01-14',p:'OF',id:701350},
      {t:'BOS',n:'Rafael Devers',        b:'1996-10-22',p:'3B',id:646240},
      {t:'BOS',n:'Sonny Gray',           b:'1989-11-07',p:'SP',id:543243},
      {t:'BOS',n:'Triston Casas',        b:'2000-01-15',p:'1B',id:683737},
      {t:'CHC',n:'Pete Crow-Armstrong',  b:'2001-03-25',p:'CF',id:694298},
      {t:'CHC',n:'Nico Hoerner',         b:'1997-05-13',p:'2B',id:663538},
      {t:'CHC',n:'Ian Happ',             b:'1994-08-12',p:'OF',id:664023},
      {t:'CHC',n:'Seiya Suzuki',         b:'1994-08-18',p:'RF',id:673548},
      {t:'CHC',n:'Justin Steele',        b:'1996-07-11',p:'SP',id:664728},
      {t:'CWS',n:'Luis Robert Jr.',      b:'1997-08-03',p:'CF',id:673357},
      {t:'CWS',n:'Andrew Vaughn',        b:'1998-04-03',p:'1B',id:683734},
      {t:'CWS',n:'Colson Montgomery',    b:'2002-02-27',p:'SS',id:694854},
      {t:'CWS',n:'Erick Fedde',          b:'1993-02-25',p:'SP',id:601713},
      {t:'CWS',n:'Gavin Sheets',         b:'1996-04-23',p:'DH',id:657757},
      {t:'CIN',n:'Elly De La Cruz',      b:'2002-01-11',p:'SS',id:682829},
      {t:'CIN',n:'Matt McLain',          b:'2000-06-27',p:'2B',id:682928},
      {t:'CIN',n:'Hunter Greene',        b:'1999-08-06',p:'SP',id:668901},
      {t:'CIN',n:'Spencer Steer',        b:'1998-12-02',p:'1B',id:683737},
      {t:'CIN',n:'Nick Lodolo',          b:'1998-02-05',p:'SP',id:669062},
      {t:'CLE',n:'José Ramírez',         b:'1992-09-17',p:'3B',id:608070},
      {t:'CLE',n:'Steven Kwan',          b:'1997-09-05',p:'OF',id:680757},
      {t:'CLE',n:'Andrés Giménez',       b:'1998-09-04',p:'2B',id:665926},
      {t:'CLE',n:'Josh Naylor',          b:'1997-06-25',p:'1B',id:647304},
      {t:'CLE',n:'Tanner Bibee',         b:'1999-10-05',p:'SP',id:694297},
      {t:'COL',n:'Ezequiel Tovar',       b:'2001-08-01',p:'SS',id:694354},
      {t:'COL',n:'Brenton Doyle',        b:'1998-05-14',p:'CF',id:681867},
      {t:'COL',n:'Nolan Jones',          b:'1997-05-07',p:'OF',id:666152},
      {t:'COL',n:'Kyle Freeland',        b:'1993-05-14',p:'SP',id:621237},
      {t:'COL',n:'Elehuris Montero',     b:'1998-08-17',p:'3B',id:678622},
      {t:'DET',n:'Tarik Skubal',         b:'1996-11-20',p:'SP',id:669373},
      {t:'DET',n:'Riley Greene',         b:'2000-09-28',p:'OF',id:682985},
      {t:'DET',n:'Spencer Torkelson',    b:'2000-08-26',p:'1B',id:679529},
      {t:'DET',n:'Colt Keith',           b:'2000-08-14',p:'2B',id:694192},
      {t:'DET',n:'Kerry Carpenter',      b:'1997-02-04',p:'OF',id:694481},
      {t:'HOU',n:'Yordan Álvarez',       b:'1997-06-27',p:'LF',id:670541},
      {t:'HOU',n:'Alex Bregman',         b:'1994-03-30',p:'3B',id:608324},
      {t:'HOU',n:'Hunter Brown',         b:'1998-08-29',p:'SP',id:686613},
      {t:'HOU',n:'Framber Valdez',       b:'1994-11-19',p:'SP',id:664285},
      {t:'HOU',n:'Jeremy Peña',          b:'1997-09-22',p:'SS',id:665606},
      {t:'KC', n:'Bobby Witt Jr.',       b:'2000-06-14',p:'SS',id:677951},
      {t:'KC', n:'Salvador Pérez',       b:'1990-05-10',p:'C', id:521692},
      {t:'KC', n:'Vinnie Pasquantino',   b:'1997-10-10',p:'1B',id:686469},
      {t:'KC', n:'Cole Ragans',          b:'1997-12-12',p:'SP',id:669062},
      {t:'KC', n:'Michael Wacha',        b:'1991-07-01',p:'SP',id:572020},
      {t:'LAA',n:'Mike Trout',           b:'1991-08-07',p:'CF',id:545361},
      {t:'LAA',n:'Zach Neto',            b:'2000-01-16',p:'SS',id:694196},
      {t:'LAA',n:'Jo Adell',             b:'1999-04-08',p:'OF',id:668709},
      {t:'LAA',n:"Logan O'Hoppe",        b:'2000-02-09',p:'C', id:681867},
      {t:'LAA',n:'Tyler Anderson',       b:'1989-12-06',p:'SP',id:542881},
      {t:'LAD',n:'Shohei Ohtani',        b:'1994-07-05',p:'DH',id:660271},
      {t:'LAD',n:'Mookie Betts',         b:'1992-10-07',p:'SS',id:605141},
      {t:'LAD',n:'Freddie Freeman',      b:'1989-09-12',p:'1B',id:518692},
      {t:'LAD',n:'Yoshinobu Yamamoto',   b:'1998-08-17',p:'SP',id:808967},
      {t:'LAD',n:'Kyle Tucker',          b:'1996-01-17',p:'RF',id:663656},
      {t:'MIA',n:'Xavier Edwards',       b:'2000-08-09',p:'2B',id:672356},
      {t:'MIA',n:'Sandy Alcántara',      b:'1995-09-07',p:'SP',id:645261},
      {t:'MIA',n:'Eury Pérez',           b:'2003-04-15',p:'SP',id:694943},
      {t:'MIA',n:'Otto Lopez',           b:'1998-10-01',p:'OF',id:672356},
      {t:'MIA',n:'Kyle Stowers',         b:'1998-01-02',p:'OF',id:681867},
      {t:'MIL',n:'Jackson Chourio',      b:'2004-03-11',p:'OF',id:694497},
      {t:'MIL',n:'William Contreras',    b:'1997-12-24',p:'C', id:661388},
      {t:'MIL',n:'Freddy Peralta',       b:'1996-06-04',p:'SP',id:641154},
      {t:'MIL',n:'Willy Adames',         b:'1995-09-02',p:'SS',id:642715},
      {t:'MIL',n:'Joey Wiemer',          b:'1999-02-11',p:'OF',id:694854},
      {t:'MIN',n:'Byron Buxton',         b:'1993-12-18',p:'CF',id:621439},
      {t:'MIN',n:'Carlos Correa',        b:'1994-09-22',p:'SS',id:621043},
      {t:'MIN',n:'Ryan Jeffers',         b:'1997-06-03',p:'C', id:680777},
      {t:'MIN',n:'Pablo López',          b:'1996-03-07',p:'SP',id:641154},
      {t:'MIN',n:'Joe Ryan',             b:'1996-06-05',p:'SP',id:666201},
      {t:'NYM',n:'Juan Soto',            b:'1998-10-25',p:'OF',id:665742},
      {t:'NYM',n:'Francisco Lindor',     b:'1993-11-14',p:'SS',id:596019},
      {t:'NYM',n:'Pete Alonso',          b:'1994-12-07',p:'1B',id:624413},
      {t:'NYM',n:'Sean Manaea',          b:'1992-02-01',p:'SP',id:592836},
      {t:'NYM',n:'David Peterson',       b:'1996-09-03',p:'SP',id:669392},
      {t:'NYY',n:'Aaron Judge',          b:'1992-04-26',p:'RF',id:592450},
      {t:'NYY',n:'Max Fried',            b:'1994-01-18',p:'SP',id:608331},
      {t:'NYY',n:'Jazz Chisholm Jr.',    b:'1998-02-01',p:'3B',id:665862},
      {t:'NYY',n:'Cody Bellinger',       b:'1995-07-13',p:'OF',id:641355},
      {t:'NYY',n:'Austin Wells',         b:'2000-07-12',p:'C', id:669224},
      {t:'OAK',n:'Nick Kurtz',           b:'2002-10-29',p:'1B',id:808982},
      {t:'OAK',n:'Brent Rooker',         b:'1994-11-01',p:'DH',id:668942},
      {t:'OAK',n:'Jacob Wilson',         b:'2002-07-17',p:'SS',id:808967},
      {t:'OAK',n:'Mason Miller',         b:'1998-09-08',p:'RP',id:694538},
      {t:'OAK',n:'JP Sears',             b:'1996-02-19',p:'SP',id:672515},
      {t:'PHI',n:'Kyle Schwarber',       b:'1993-03-05',p:'DH',id:656941},
      {t:'PHI',n:'Trea Turner',          b:'1993-06-30',p:'SS',id:607208},
      {t:'PHI',n:'Bryce Harper',         b:'1992-10-16',p:'1B',id:547180},
      {t:'PHI',n:'Zack Wheeler',         b:'1990-05-30',p:'SP',id:554430},
      {t:'PHI',n:'Cristopher Sánchez',   b:'1996-12-12',p:'SP',id:669060},
      {t:'PIT',n:'Paul Skenes',          b:'2002-05-29',p:'SP',id:694973},
      {t:'PIT',n:'Oneil Cruz',           b:'1998-10-04',p:'SS',id:665833},
      {t:'PIT',n:'Bryan Reynolds',       b:'1995-01-27',p:'OF',id:668804},
      {t:'PIT',n:'Rowdy Tellez',         b:'1994-03-16',p:'1B',id:642731},
      {t:'PIT',n:'Marco Gonzales',       b:'1992-02-16',p:'SP',id:594835},
      {t:'SD', n:'Fernando Tatis Jr.',   b:'1999-01-02',p:'RF',id:665487},
      {t:'SD', n:'Manny Machado',        b:'1992-07-06',p:'3B',id:592518},
      {t:'SD', n:'Jake Cronenworth',     b:'1994-01-21',p:'2B',id:683737},
      {t:'SD', n:'Yu Darvish',           b:'1986-08-16',p:'SP',id:506433},
      {t:'SD', n:'Xander Bogaerts',      b:'1992-10-01',p:'SS',id:595777},
      {t:'SEA',n:'Cal Raleigh',          b:'1996-11-26',p:'C', id:663728},
      {t:'SEA',n:'Julio Rodríguez',      b:'2000-12-29',p:'CF',id:677594},
      {t:'SEA',n:'George Kirby',         b:'1998-02-04',p:'SP',id:669923},
      {t:'SEA',n:'Logan Gilbert',        b:'1997-05-05',p:'SP',id:669302},
      {t:'SEA',n:'Ty France',            b:'1994-07-13',p:'1B',id:664353},
      {t:'SFG',n:'Logan Webb',           b:'1997-11-18',p:'SP',id:657277},
      {t:'SFG',n:'Matt Chapman',         b:'1993-04-28',p:'3B',id:656305},
      {t:'SFG',n:'Jung Hoo Lee',         b:'1998-08-20',p:'CF',id:800058},
      {t:'SFG',n:'Patrick Bailey',       b:'1999-05-29',p:'C', id:672724},
      {t:'SFG',n:'Heliot Ramos',         b:'1999-09-07',p:'OF',id:671218},
      {t:'STL',n:'Masyn Winn',           b:'2001-05-21',p:'SS',id:694002},
      {t:'STL',n:'Nolan Arenado',        b:'1991-04-16',p:'3B',id:571448},
      {t:'STL',n:'Lars Nootbaar',        b:'1997-09-08',p:'OF',id:663993},
      {t:'STL',n:'Miles Mikolas',        b:'1988-08-23',p:'SP',id:571945},
      {t:'STL',n:'Ivan Herrera',         b:'2000-06-01',p:'C', id:678622},
      {t:'TB', n:'Junior Caminero',      b:'2003-07-05',p:'3B',id:691406},
      {t:'TB', n:'Shane McClanahan',     b:'1997-04-28',p:'SP',id:663556},
      {t:'TB', n:'Yandy Díaz',           b:'1991-08-08',p:'1B',id:650490},
      {t:'TB', n:'Drew Rasmussen',       b:'1995-07-27',p:'SP',id:670174},
      {t:'TB', n:'Jonathan Aranda',      b:'1998-05-23',p:'1B',id:677800},
      {t:'TEX',n:'Corey Seager',         b:'1994-04-27',p:'SS',id:608369},
      {t:'TEX',n:'Marcus Semien',        b:'1990-09-17',p:'2B',id:543760},
      {t:'TEX',n:'Adolis García',        b:'1993-03-02',p:'RF',id:666969},
      {t:'TEX',n:'Nathaniel Lowe',       b:'1995-07-07',p:'1B',id:663993},
      {t:'TEX',n:'Jacob deGrom',         b:'1988-06-19',p:'SP',id:594798},
      {t:'TOR',n:'Vladimir Guerrero Jr.',b:'1999-03-16',p:'1B',id:665489},
      {t:'TOR',n:'Alejandro Kirk',       b:'2000-11-06',p:'C', id:672386},
      {t:'TOR',n:'George Springer',      b:'1989-09-19',p:'OF',id:543807},
      {t:'TOR',n:'Kevin Gausman',        b:'1991-01-06',p:'SP',id:592332},
      {t:'TOR',n:'Daulton Varsho',       b:'1996-07-02',p:'OF',id:661388},
      {t:'WSH',n:'James Wood',           b:'2002-09-17',p:'OF',id:694484},
      {t:'WSH',n:'CJ Abrams',            b:'2001-10-03',p:'SS',id:682928},
      {t:'WSH',n:'MacKenzie Gore',       b:'1999-02-24',p:'SP',id:669388},
      {t:'WSH',n:'Jacob Young',          b:'2000-11-19',p:'OF',id:694354},
      {t:'WSH',n:'Josiah Gray',          b:'1997-12-21',p:'SP',id:669062},
    ];
    for (const p of players) {
      const [y,m,d] = p.b.split('-').map(Number);
      const dn = reduce(y+m+d);
      await pool.query(
        'INSERT INTO players (team_id,name,birth_date,destiny_number,position,mlb_id,season) VALUES ($1,$2,$3,$4,$5,$6,2026)',
        [p.t, p.n, p.b, dn, p.p, p.id]
      );
    }

    res.json({ ok: true, message: '✅ DB initialized — 30 teams, 30 managers, 150 players' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sync/today
router.post('/today', async (req, res) => {
  try {
    const { syncToday } = require('../db/sync');
    const count = await syncToday();
    res.json({ ok: true, gamesSync: count, date: new Date().toISOString().split('T')[0] });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sync/season?season=2025
router.get('/season', async (req, res) => {
  const { season = 2025 } = req.query;
  res.json({ ok: true, message: `Syncing season ${season} in background...` });
  const { syncSeason } = require('../db/sync');
  syncSeason(parseInt(season))
    .then(n => console.log(`[SYNC] Season ${season}: ${n} games`))
    .catch(e => console.error(`[SYNC] Error:`, e.message));
});

// POST /api/sync/season
router.post('/season', async (req, res) => {
  const { season = 2025 } = req.query;
  res.json({ ok: true, message: `Syncing season ${season} in background...` });
  const { syncSeason } = require('../db/sync');
  syncSeason(parseInt(season))
    .then(n => console.log(`[SYNC] Season ${season}: ${n} games`))
    .catch(e => console.error(`[SYNC] Error:`, e.message));
});

// GET /api/sync/status
router.get('/status', async (req, res) => {
  try {
    const pool = require('../db/index');
    const { rows } = await pool.query(
      'SELECT season, COUNT(*) as games, MAX(date) as last_game FROM games GROUP BY season ORDER BY season DESC'
    );
    res.json({ synced: rows });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sync/rosters — sync active 26-man rosters for all teams from MLB API
// Updates players table to reflect current active rosters (trades, call-ups, etc.)
router.post('/rosters', async (req, res) => {
  const pool = require('../db/index');
  const { reduce } = require('../numerology');
  const season = parseInt(req.query.season || '2026');

  res.json({ ok: true, message: `Syncing ${season} rosters in background…` });

  // Run in background
  (async () => {
    try {
      // First: remove duplicate entries (same mlb_id, keep latest inserted)
      try {
        await pool.query(`
          DELETE FROM player_stats ps USING players p
          WHERE ps.player_id = p.id AND p.season = $1 AND p.id IN (
            SELECT a.id FROM players a JOIN players b
              ON a.mlb_id = b.mlb_id AND a.season = b.season AND a.id < b.id
            WHERE a.season = $1
          )
        `, [season]);
        const dupDel = await pool.query(`
          DELETE FROM players a USING players b
          WHERE a.id < b.id AND a.mlb_id = b.mlb_id AND a.season = b.season AND a.season = $1
        `, [season]);
        console.log(`[roster-sync] cleaned duplicates: ${dupDel.rowCount||0}`);
      } catch(e) {
        console.error('[roster-sync] dedup error:', e.message);
      }

      const { rows: teams } = await pool.query('SELECT id, mlb_id FROM teams');
      let totalInserted = 0, totalUpdated = 0, totalRemoved = 0;

      // Collect all current mlb_ids across all teams for later cleanup
      const currentMlbIds = new Set();

      for (const team of teams) {
        try {
          const url = `https://statsapi.mlb.com/api/v1/teams/${team.mlb_id}/roster/active?season=${season}&hydrate=person`;
          const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
          if (!r.ok) { console.error(`[roster-sync] ${team.id}: HTTP ${r.status}`); continue; }
          const data = await r.json();
          const roster = data.roster || [];

          for (const p of roster) {
            const person = p.person || {};
            if (!person.birthDate) continue;
            currentMlbIds.add(person.id);

            const [y,m,d] = person.birthDate.split('-').map(Number);
            const destinyNum = reduce(y + m + d);
            const posAbbr = p.position?.abbreviation || person.primaryPosition?.abbreviation || '';

            // Check if player exists (by mlb_id for this season)
            const existing = await pool.query(
              'SELECT id, team_id, position FROM players WHERE mlb_id = $1 AND season = $2 LIMIT 1',
              [person.id, season]
            );

            if (existing.rows.length === 0) {
              await pool.query(`
                INSERT INTO players (team_id, name, birth_date, destiny_number, position, mlb_id, season)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
              `, [team.id, person.fullName, person.birthDate, destinyNum, posAbbr, person.id, season]);
              totalInserted++;
            } else {
              const ex = existing.rows[0];
              await pool.query(`
                UPDATE players SET team_id = $1, position = $2, name = $3, birth_date = $4, destiny_number = $5
                WHERE id = $6
              `, [team.id, posAbbr, person.fullName, person.birthDate, destinyNum, ex.id]);
              totalUpdated++;
            }
          }
          console.log(`[roster-sync] ${team.id}: ${roster.length} players synced`);
        } catch(e) {
          console.error(`[roster-sync] ${team.id} error:`, e.message);
        }
      }

      // Remove players no longer on any active roster for this season
      if (currentMlbIds.size > 0) {
        try {
          // First remove FK references
          await pool.query(`
            DELETE FROM player_stats ps USING players p
            WHERE ps.player_id = p.id AND p.season = $1
              AND (p.mlb_id IS NULL OR NOT (p.mlb_id = ANY($2)))
          `, [season, [...currentMlbIds]]);
          const result = await pool.query(
            `DELETE FROM players WHERE season = $1 AND (mlb_id IS NULL OR NOT (mlb_id = ANY($2)))`,
            [season, [...currentMlbIds]]
          );
          totalRemoved = result.rowCount || 0;
        } catch(e) {
          console.error('[roster-sync] cleanup error:', e.message);
        }
      }

      console.log(`[roster-sync] ✅ DONE · inserted:${totalInserted} updated:${totalUpdated} removed:${totalRemoved}`);
    } catch(e) {
      console.error('[roster-sync] fatal:', e.message);
    }
  })();
});

// POST /api/sync/cleanup-dups — aggressively dedupe players by mlb_id
router.post('/cleanup-dups', async (req, res) => {
  const pool = require('../db/index');
  const season = parseInt(req.query.season || '2026');
  try {
    // Step 1: find duplicate mlb_ids, get all duplicate IDs (except latest)
    const { rows: dups } = await pool.query(`
      SELECT id FROM players p1
      WHERE season = $1 AND mlb_id IS NOT NULL
        AND id NOT IN (
          SELECT MAX(id) FROM players WHERE season = $1 AND mlb_id = p1.mlb_id
        )
    `, [season]);

    if (dups.length === 0) {
      return res.json({ ok: true, cleaned: 0, message: 'No duplicates found' });
    }

    const idsToDelete = dups.map(d => d.id);

    // Step 2: delete player_stats referencing those IDs
    await pool.query('DELETE FROM player_stats WHERE player_id = ANY($1)', [idsToDelete]);
    // Step 3: delete the player rows
    const result = await pool.query('DELETE FROM players WHERE id = ANY($1)', [idsToDelete]);

    // Step 4: delete any players with NULL mlb_id (leftover from seed)
    await pool.query('DELETE FROM player_stats WHERE player_id IN (SELECT id FROM players WHERE season = $1 AND mlb_id IS NULL)', [season]);
    const nullResult = await pool.query('DELETE FROM players WHERE season = $1 AND mlb_id IS NULL', [season]);

    res.json({
      ok: true,
      duplicatesRemoved: result.rowCount,
      nullMlbIdsRemoved: nullResult.rowCount,
      total: (result.rowCount||0) + (nullResult.rowCount||0),
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;