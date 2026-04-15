const express = require('express');
const router = express.Router();

// 📊 análisis jugador
router.get('/player', (req, res) => {
  res.json({ message: "player analysis OK" });
});

// 📊 análisis manager
router.get('/manager', (req, res) => {
  res.json({ message: "manager analysis OK" });
});

// ⚔️ VS
router.get('/vs', (req, res) => {
  res.json({ message: "vs analysis OK" });
});

// 📅 calendario
router.get('/calendar', (req, res) => {
  res.json({ message: "calendar analysis OK" });
});

module.exports = router;
