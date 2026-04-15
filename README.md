[README.md](https://github.com/user-attachments/files/26738471/README.md)
# Infinity Sport Backend

API proxy para MLB Stats + motor de numerología deportiva.

## Stack
- Node.js + Express
- node-cache (cache en memoria, 1h para stats, 24h para info)
- MLB Stats API (statsapi.mlb.com) — pública, sin auth

## Endpoints

| Método | Ruta | Parámetros |
|--------|------|-----------|
| GET | `/api/mlb/schedule` | `teamId`, `season` |
| GET | `/api/mlb/player/stats` | `playerId`, `season`, `group` (hitting\|pitching) |
| GET | `/api/mlb/player/info` | `playerId` |
| GET | `/api/mlb/team/roster` | `teamId`, `season` |
| GET | `/api/mlb/standings` | `season` |

## Deploy en Railway

1. Crear repo en GitHub: `infinity-sport-backend`
2. Push este código
3. En Railway → New Project → Deploy from GitHub repo
4. Seleccionar el repo
5. Railway detecta Node automáticamente y usa `npm start`
6. Listo — URL tipo: `infinity-sport-backend-production.up.railway.app`

## Local

```bash
npm install
npm run dev
```

## MLB Team IDs

| ID | Equipo |
|----|--------|
| 108 | LA Angels |
| 109 | Arizona |
| 110 | Baltimore |
| 111 | Boston |
| 112 | Chicago Cubs |
| 113 | Cincinnati |
| 114 | Cleveland |
| 115 | Colorado |
| 116 | Detroit |
| 117 | Houston |
| 118 | Kansas City |
| 119 | LA Dodgers |
| 120 | Washington |
| 121 | NY Mets |
| 133 | Oakland |
| 134 | Pittsburgh |
| 135 | San Diego |
| 136 | Seattle |
| 137 | San Francisco |
| 138 | St. Louis |
| 139 | Tampa Bay |
| 140 | Texas |
| 141 | Toronto |
| 142 | Minnesota |
| 143 | Philadelphia |
| 144 | Atlanta |
| 145 | Chicago White Sox |
| 146 | Miami |
| 147 | NY Yankees |
| 158 | Milwaukee |
