const express = require('express');
const pool = require('../db/pool');
const { generirajTrening } = require('../services/treninziGenerator');

const router = express.Router();

// GET /api/treninzi/:id - vrati detalje jednog treninga sa stavkama i serijama
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  try {
    const treningRes = await pool.query(
      `SELECT t.id, t.korisnik_id, t.tip_treninga_id, tt.naziv AS tip_treninga, t.datum, t.status
       FROM treninzi t
       JOIN tipovi_treninga tt ON tt.id = t.tip_treninga_id
       WHERE t.id = $1`,
      [id]
    );
    if (treningRes.rows.length === 0) {
      return res.status(404).json({ greska: 'Trening nije pronađen.' });
    }
    const trening = treningRes.rows[0];

    const stavkeRes = await pool.query(
      `SELECT st.id, st.redni_broj, st.ishod, v.id AS vjezba_id, v.naziv AS naziv_vjezbe
       FROM stavke_treninga st
       JOIN vjezbe v ON v.id = st.vjezba_id
       WHERE st.trening_id = $1
       ORDER BY st.redni_broj ASC`,
      [id]
    );

    const stavke = [];
    for (const stavka of stavkeRes.rows) {
      const serijeRes = await pool.query(
        `SELECT id, redni_broj, planirana_tezina, planirana_ponavljanja
         FROM serije
         WHERE stavka_treninga_id = $1
         ORDER BY redni_broj ASC`,
        [stavka.id]
      );
      stavke.push({ ...stavka, serije: serijeRes.rows });
    }

    res.json({ ...trening, stavke });
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

// POST /api/treninzi/:id/zavrsi - oznaci trening kao odradjen
router.post('/:id/zavrsi', async (req, res) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  try {
    const zavrseniRes = await pool.query(
      `UPDATE treninzi
       SET status = 'odradjen'
       WHERE id = $1
       RETURNING id, korisnik_id, tip_treninga_id, datum, status, redni_indeks_u_splitu`,
      [id]
    );
    if (zavrseniRes.rows.length === 0) {
      return res.status(404).json({ greska: 'Trening nije pronađen.' });
    }
    const zavrseniTrening = zavrseniRes.rows[0];

    if (zavrseniTrening.redni_indeks_u_splitu == null) {
      return res.json({ zavrseni_trening: zavrseniTrening, sljedeci_trening: null });
    }

    const sljedeciDatum = new Date(zavrseniTrening.datum);
    sljedeciDatum.setDate(sljedeciDatum.getDate() + 7);

    const danas = new Date();
    danas.setHours(0, 0, 0, 0);

    const offsetDana = Math.round((sljedeciDatum.getTime() - danas.getTime()) / (1000 * 60 * 60 * 24));

    const sljedeciTrening = await generirajTrening(
      zavrseniTrening.korisnik_id,
      zavrseniTrening.redni_indeks_u_splitu,
      offsetDana
    );

    res.json({ zavrseni_trening: zavrseniTrening, sljedeci_trening: sljedeciTrening });
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

module.exports = router;
