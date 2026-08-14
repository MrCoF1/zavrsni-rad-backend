const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

// GET /api/vjezbe - sve vjezbe s tipovima treninga i nazivom misicne skupine
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        v.id,
        v.naziv,
        v.tip,
        ms.id AS misicna_skupina_id,
        ms.naziv AS misicna_skupina_naziv,
        COALESCE(
          json_agg(
            json_build_object('id', tt.id, 'naziv', tt.naziv)
            ORDER BY tt.naziv
          ) FILTER (WHERE tt.id IS NOT NULL),
          '[]'
        ) AS tipovi_treninga
      FROM vjezbe v
      JOIN misicne_skupine ms ON ms.id = v.misicna_skupina_id
      LEFT JOIN vjezba_tip_treninga vtt ON vtt.vjezba_id = v.id
      LEFT JOIN tipovi_treninga tt ON tt.id = vtt.tip_treninga_id
      GROUP BY v.id, ms.id
      ORDER BY v.naziv
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

module.exports = router;
