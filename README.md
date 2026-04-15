# Sendero Deportivo Backend v2.0

MLB Numerology Engine — ESPN data + PostgreSQL + Numerology

## Stack
- Node.js + Express
- PostgreSQL (Railway)
- ESPN API (no auth needed)
- node-cron (auto-sync every hour)

## Setup en Railway

### 1. Crear PostgreSQL en Railway
1. Railway dashboard → New Project → Add PostgreSQL
2. Copiar `DATABASE_URL` de las variables

### 2. Deploy el backend
1. Nuevo repo GitHub: `sendero-backend`
2. Push este código
3. Railway → New Service → GitHub repo
4. Agregar variable de entorno: `DATABASE_URL` = (la de tu PostgreSQL)
5. Deploy

### 3. Inicializar la DB
Una vez deployado, llama a:
```
POST https://TU-URL.railway.app/api/sync/today
```

O desde Railway terminal:
```bash
node db/init.js
```

### 4. Cargar histórico 2025
```
POST https://TU-URL.railway.app/api/sync/season?season=2025
```
Tarda ~5-10 min, corre en background.

## Endpoints

| Endpoint | Descripción |
|---|---|
| `GET /api/teams` | Todos los equipos con manager |
| `GET /api/teams/:id` | Equipo específico |
| `GET /api/players?teamId=LAD` | Jugadores por equipo |
| `GET /api/analysis/today` | Vibración de todos los managers hoy |
| `GET /api/analysis/manager?teamId=LAD&season=2025` | W/L por vibración |
| `GET /api/analysis/player?playerId=1&season=2025` | Stats por vibración |
| `GET /api/analysis/vs?teamA=LAD&teamB=CLE&season=2025` | Head to head |
| `GET /api/analysis/calendar?teamId=LAD&year=2025&month=5` | Mes completo |
| `POST /api/sync/today` | Sync juegos de hoy |
| `POST /api/sync/date?date=2025-05-17` | Sync fecha específica |
| `POST /api/sync/season?season=2025` | Sync temporada completa |
| `GET /api/sync/status` | Ver qué está sincronizado |

## Numerología
- Solo del 1 al 9 — sin números maestros
- `vibrationPerson(birthDate, gameDate)` = reduce(sum(birth) + sum(date))
- `destinyNumber(birthDate)` = reduce(y + m + d)
- `vibrationDay(date)` = reduce(y + m + d) de la fecha

## Auto-sync
El backend sincroniza los juegos de hoy automáticamente cada hora via cron.
