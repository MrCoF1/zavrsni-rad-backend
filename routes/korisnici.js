const express = require('express');
const pool = require('../db/pool');
const splitPredlosci = require('../config/splitPredlosci');
const { generirajTrening } = require('../services/treninziGenerator');

const router = express.Router();

const DOZVOLJENI_CILJEVI = ['mrsavljenje', 'bulk', 'clean_bulk'];
const DOZVOLJENI_BROJ_DANA = [2, 3, 4, 5];

// POST /api/korisnici - kreira novog korisnika
router.post('/', async (req, res) => {
  const { google_id, email, ime } = req.body;

  if (!google_id || !email || !ime) {
    return res.status(400).json({ greska: 'Polja google_id, email i ime su obavezna.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO korisnici (google_id, email, ime)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [google_id, email, ime]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ greska: 'Korisnik s tim google_id ili email-om već postoji.' });
    }
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

// GET /api/korisnici/:id - dohvati korisnika po id-u
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  try {
    const result = await pool.query('SELECT * FROM korisnici WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ greska: 'Korisnik nije pronađen.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

// POST /api/korisnici/:id/profil - kreira ili ažurira profil korisnika
router.post('/:id/profil', async (req, res) => {
  const { id } = req.params;
  const { cilj, visina_cm, tezina_kg, tip_tijela, broj_dana_tjedno } = req.body;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  if (!DOZVOLJENI_CILJEVI.includes(cilj)) {
    return res.status(400).json({ greska: `cilj mora biti jedno od: ${DOZVOLJENI_CILJEVI.join(', ')}.` });
  }
  if (!Number.isInteger(visina_cm)) {
    return res.status(400).json({ greska: 'visina_cm mora biti cijeli broj.' });
  }
  if (typeof tezina_kg !== 'number' || Number.isNaN(tezina_kg)) {
    return res.status(400).json({ greska: 'tezina_kg mora biti broj.' });
  }
  if (!Number.isInteger(tip_tijela) || tip_tijela < 1 || tip_tijela > 4) {
    return res.status(400).json({ greska: 'tip_tijela mora biti cijeli broj između 1 i 4.' });
  }
  if (!DOZVOLJENI_BROJ_DANA.includes(broj_dana_tjedno)) {
    return res.status(400).json({ greska: `broj_dana_tjedno mora biti jedno od: ${DOZVOLJENI_BROJ_DANA.join(', ')}.` });
  }

  try {
    const korisnik = await pool.query('SELECT id FROM korisnici WHERE id = $1', [id]);
    if (korisnik.rows.length === 0) {
      return res.status(404).json({ greska: 'Korisnik nije pronađen.' });
    }

    const postojeci = await pool.query(
      'SELECT id FROM korisnicki_profili WHERE korisnik_id = $1',
      [id]
    );

    let result;
    if (postojeci.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO korisnicki_profili (korisnik_id, cilj, visina_cm, tezina_kg, tip_tijela, broj_dana_tjedno)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, cilj, visina_cm, tezina_kg, tip_tijela, broj_dana_tjedno]
      );
      return res.status(201).json(result.rows[0]);
    }

    result = await pool.query(
      `UPDATE korisnicki_profili
       SET cilj = $2, visina_cm = $3, tezina_kg = $4, tip_tijela = $5, broj_dana_tjedno = $6
       WHERE korisnik_id = $1
       RETURNING *`,
      [id, cilj, visina_cm, tezina_kg, tip_tijela, broj_dana_tjedno]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

// GET /api/korisnici/:id/profil - dohvati profil korisnika
router.get('/:id/profil', async (req, res) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM korisnicki_profili WHERE korisnik_id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ greska: 'Profil nije pronađen.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

// POST /api/korisnici/:id/prioriteti - zamijeni prioritete korisnika
router.post('/:id/prioriteti', async (req, res) => {
  const { id } = req.params;
  const { misicna_skupina_id } = req.body;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  if (!Array.isArray(misicna_skupina_id) || misicna_skupina_id.some((x) => !Number.isInteger(x))) {
    return res.status(400).json({ greska: 'misicna_skupina_id mora biti niz cijelih brojeva.' });
  }

  const client = await pool.connect();
  try {
    const korisnik = await client.query('SELECT id FROM korisnici WHERE id = $1', [id]);
    if (korisnik.rows.length === 0) {
      return res.status(404).json({ greska: 'Korisnik nije pronađen.' });
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM korisnik_prioriteti WHERE korisnik_id = $1', [id]);

    let rows = [];
    if (misicna_skupina_id.length > 0) {
      const values = misicna_skupina_id
        .map((_, i) => `($1, $${i + 2})`)
        .join(', ');
      const insertResult = await client.query(
        `INSERT INTO korisnik_prioriteti (korisnik_id, misicna_skupina_id)
         VALUES ${values}
         RETURNING *`,
        [id, ...misicna_skupina_id]
      );
      rows = insertResult.rows;
    }

    await client.query('COMMIT');
    res.status(200).json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') {
      return res.status(400).json({ greska: 'Jedna ili više misicna_skupina_id ne postoji.' });
    }
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  } finally {
    client.release();
  }
});

// POST /api/korisnici/:id/generiraj-ciklus - generira sve treninge za korisnikov split
router.post('/:id/generiraj-ciklus', async (req, res) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  try {
    const profilRes = await pool.query(
      'SELECT broj_dana_tjedno FROM korisnicki_profili WHERE korisnik_id = $1',
      [id]
    );
    if (profilRes.rows.length === 0) {
      return res.status(400).json({ greska: 'Korisnički profil ne postoji.' });
    }
    const { broj_dana_tjedno } = profilRes.rows[0];

    const listaPredlozaka = splitPredlosci[broj_dana_tjedno];
    if (!listaPredlozaka) {
      return res.status(400).json({ greska: `Ne postoji split predložak za broj_dana_tjedno=${broj_dana_tjedno}.` });
    }

    const kreiraniTreninzi = [];
    for (let i = 0; i < listaPredlozaka.length; i++) {
      const trening = await generirajTrening(Number(id), i, i);
      kreiraniTreninzi.push(trening);
    }

    res.status(201).json(kreiraniTreninzi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

// GET /api/korisnici/:id/treninzi - vrati planirane treninge korisnika
router.get('/:id/treninzi', async (req, res) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  try {
    const result = await pool.query(
      `SELECT t.id, t.korisnik_id, t.tip_treninga_id, tt.naziv AS tip_treninga, t.datum, t.status
       FROM treninzi t
       JOIN tipovi_treninga tt ON tt.id = t.tip_treninga_id
       WHERE t.korisnik_id = $1 AND t.status = 'planiran'
       ORDER BY t.datum ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

module.exports = router;
