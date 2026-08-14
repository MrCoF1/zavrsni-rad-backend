const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/misicne-skupine - sve misicne skupine
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM misicne_skupine ORDER BY naziv');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

module.exports = router;
