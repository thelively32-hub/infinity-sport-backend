const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json([{ id: 'yankees', name: 'New York Yankees' }]);
});

module.exports = router;
