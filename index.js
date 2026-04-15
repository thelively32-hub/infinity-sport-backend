<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sendero Deportivo</title>

<style>
body {
  margin:0;
  font-family: Arial;
  background:#0f172a;
  color:white;
  text-align:center;
}

.container {
  max-width:900px;
  margin:auto;
  padding:20px;
}

.card {
  background:#1e293b;
  padding:20px;
  border-radius:12px;
  margin-top:20px;
}

button {
  background:#6366f1;
  border:none;
  padding:10px 20px;
  border-radius:8px;
  color:white;
  cursor:pointer;
}

pre {
  text-align:left;
  background:#020617;
  padding:10px;
  border-radius:8px;
  overflow:auto;
}
</style>
</head>

<body>

<div class="container">
  <h1>⚡ Sendero Deportivo</h1>

  <div class="card">
    <h3>Test Backend</h3>
    <button onclick="testAPI()">Test API</button>
    <pre id="test"></pre>
  </div>

  <div class="card">
    <h3>Equipos</h3>
    <button onclick="loadTeams()">Cargar Equipos</button>
    <pre id="teams"></pre>
  </div>

  <div class="card">
    <h3>Juegos</h3>
    <button onclick="loadGames()">Cargar Juegos</button>
    <pre id="games"></pre>
  </div>

  <div class="card">
    <h3>Análisis</h3>
    <button onclick="loadAnalysis()">Ver Análisis</button>
    <pre id="analysis"></pre>
  </div>
</div>

<script>

const API = "https://infinity-sport-backend-production.up.railway.app/api";
let currentTeam = "yankees";

// TEST
async function testAPI(){
  try{
    const res = await fetch(API + "/teams");
    const data = await res.json();
    document.getElementById("test").innerText = JSON.stringify(data,null,2);
  }catch(e){
    document.getElementById("test").innerText = "ERROR: " + e.message;
  }
}

// TEAMS
async function loadTeams(){
  try{
    const res = await fetch(API + "/teams");
    const data = await res.json();
    document.getElementById("teams").innerText = JSON.stringify(data,null,2);
  }catch(e){
    document.getElementById("teams").innerText = "ERROR: " + e.message;
  }
}

// GAMES
async function loadGames(){
  try{
    const res = await fetch(API + `/games?teamId=${currentTeam}&season=2025`);
    const data = await res.json();
    document.getElementById("games").innerText = JSON.stringify(data,null,2);
  }catch(e){
    document.getElementById("games").innerText = "ERROR: " + e.message;
  }
}

// ANALYSIS
async function loadAnalysis(){
  try{
    const res = await fetch(API + `/analysis/manager?teamId=${currentTeam}&season=2025`);
    const data = await res.json();
    document.getElementById("analysis").innerText = JSON.stringify(data,null,2);
  }catch(e){
    document.getElementById("analysis").innerText = "ERROR: " + e.message;
  }
}

</script>

</body>
</html>
