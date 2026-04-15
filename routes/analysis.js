const express = require('express');
const router = express.Router();

router.get('/player', (req, res) => {
  res.json({ message: "player analysis OK" });
});

router.get('/manager', (req, res) => {
  res.json({ message: "manager analysis OK" });
});

router.get('/vs', (req, res) => {
  res.json({ message: "vs analysis OK" });
});

router.get('/calendar', (req, res) => {
  res.json({ message: "calendar OK" });
});

module.exports = router;
