const express = require('express');
const pool = require('../db/pool');
const { azurirajProgresiju } = require('../services/vjezbaStanje');

const router = express.Router();

const DOZVOLJENI_ISHODI = ['tocno', 'manje'];

// PUT /api/stavke-treninga/:id/ishod - zabilježi ishod vježbe i ažuriraj progresiju
router.put('/:id/ishod', async (req, res) => {
  const { id } = req.params;
  const { ishod } = req.body;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }
  if (!DOZVOLJENI_ISHODI.includes(ishod)) {
    return res.status(400).json({ greska: `ishod mora biti jedno od: ${DOZVOLJENI_ISHODI.join(', ')}.` });
  }

  try {
    const stavkaRes = await pool.query(
      `SELECT st.id, st.vjezba_id, t.korisnik_id
       FROM stavke_treninga st
       JOIN treninzi t ON t.id = st.trening_id
       WHERE st.id = $1`,
      [id]
    );
    if (stavkaRes.rows.length === 0) {
      return res.status(404).json({ greska: 'Stavka treninga nije pronađena.' });
    }
    const { vjezba_id: vjezbaId, korisnik_id: korisnikId } = stavkaRes.rows[0];

    const azuriranaStavkaRes = await pool.query(
      `UPDATE stavke_treninga
       SET ishod = $2
       WHERE id = $1
       RETURNING id, trening_id, vjezba_id, redni_broj, ishod`,
      [id, ishod]
    );

    await azurirajProgresiju(korisnikId, vjezbaId, ishod);

    res.json(azuriranaStavkaRes.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

module.exports = router;
