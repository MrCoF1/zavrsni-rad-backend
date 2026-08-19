const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const splitPredlosci = require('../config/splitPredlosci');
const { izracunajOffsetDana } = require('../config/rasporedDana');
const { generirajTrening, dohvatiKandidate } = require('../services/treninziGenerator');

const router = express.Router();

const DOZVOLJENI_CILJEVI = ['mrsavljenje', 'bulk', 'clean_bulk'];
const DOZVOLJENI_BROJ_DANA = [2, 3, 4, 5];

// POST /api/korisnici/registracija - registrira novog korisnika s email/lozinkom
router.post('/registracija', async (req, res) => {
  const { email, korisnicko_ime, lozinka } = req.body;

  if (!email || !korisnicko_ime || !lozinka) {
    return res.status(400).json({ greska: 'Polja email, korisnicko_ime i lozinka su obavezna.' });
  }
  if (lozinka.length < 6) {
    return res.status(400).json({ greska: 'Lozinka mora imati barem 6 znakova.' });
  }
  if (!email.includes('@')) {
    return res.status(400).json({ greska: 'Email nije ispravnog formata.' });
  }

  try {
    const hash = await bcrypt.hash(lozinka, 10);
    const result = await pool.query(
      `INSERT INTO korisnici (email, ime, lozinka_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, ime, datum_registracije`,
      [email, korisnicko_ime, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ greska: 'Korisnik s tim emailom već postoji.' });
    }
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

// POST /api/korisnici/prijava - prijava korisnika s email/lozinkom
router.post('/prijava', async (req, res) => {
  const { email, lozinka } = req.body;

  if (!email || !lozinka) {
    return res.status(400).json({ greska: 'Polja email i lozinka su obavezna.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, ime, lozinka_hash FROM korisnici WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ greska: 'Neispravan email ili lozinka.' });
    }

    const redak = result.rows[0];
    if (!redak.lozinka_hash) {
      return res.status(401).json({ greska: 'Neispravan email ili lozinka.' });
    }

    const ok = await bcrypt.compare(lozinka, redak.lozinka_hash);
    if (!ok) {
      return res.status(401).json({ greska: 'Neispravan email ili lozinka.' });
    }

    res.status(200).json({ id: redak.id, email: redak.email, ime: redak.ime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

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

// GET /api/korisnici/:id/prioriteti - vrati prioritetne misicne skupine korisnika
router.get('/:id/prioriteti', async (req, res) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  try {
    const result = await pool.query(
      `SELECT ms.id, ms.naziv
       FROM korisnik_prioriteti kp
       JOIN misicne_skupine ms ON ms.id = kp.misicna_skupina_id
       WHERE kp.korisnik_id = $1
       ORDER BY ms.id`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
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

    const prioritetiRes = await pool.query(
      `SELECT kp.misicna_skupina_id, ms.naziv
       FROM korisnik_prioriteti kp
       JOIN misicne_skupine ms ON ms.id = kp.misicna_skupina_id
       WHERE kp.korisnik_id = $1
       ORDER BY kp.misicna_skupina_id`,
      [id]
    );
    const prioriteti = prioritetiRes.rows.slice(0, 2);

    const tipTreningaIdPoNazivu = new Map();
    async function dohvatiTipTreningaId(naziv) {
      if (tipTreningaIdPoNazivu.has(naziv)) {
        return tipTreningaIdPoNazivu.get(naziv);
      }
      const tipRes = await pool.query('SELECT id FROM tipovi_treninga WHERE naziv = $1', [naziv]);
      if (tipRes.rows.length === 0) {
        throw new Error(`Tip treninga "${naziv}" ne postoji.`);
      }
      tipTreningaIdPoNazivu.set(naziv, tipRes.rows[0].id);
      return tipRes.rows[0].id;
    }

    // Za svaki prioritet, odredi koji dani u ovom splitu imaju prioritet_slot
    // i barem jednu kompatibilnu vježbu za tu mišićnu skupinu.
    const kompatibilniDaniPoPrioritetu = [];
    for (const prioritet of prioriteti) {
      const dani = [];
      for (let i = 0; i < listaPredlozaka.length; i++) {
        const predlozak = listaPredlozaka[i];
        if (!predlozak.prioritet_slot) continue;
        const tipTreningaId = await dohvatiTipTreningaId(predlozak.tip_treninga);
        const kandidati = await dohvatiKandidate(prioritet.naziv, tipTreningaId);
        if (kandidati.length > 0) {
          dani.push(i);
        }
      }
      kompatibilniDaniPoPrioritetu.push(dani);
    }

    // Rasporedi svaki prioritet na svoj (različit) kompatibilan dan, ako je moguće.
    const prioritetPoTreningu = new Array(listaPredlozaka.length).fill(null);
    if (prioriteti.length === 1) {
      const dani = kompatibilniDaniPoPrioritetu[0];
      if (dani.length > 0) {
        prioritetPoTreningu[dani[0]] = prioriteti[0].naziv;
      }
    } else if (prioriteti.length === 2) {
      const dani0 = kompatibilniDaniPoPrioritetu[0];
      const dani1 = kompatibilniDaniPoPrioritetu[1];
      let dodijeljeno = false;
      for (const d0 of dani0) {
        for (const d1 of dani1) {
          if (d0 !== d1) {
            prioritetPoTreningu[d0] = prioriteti[0].naziv;
            prioritetPoTreningu[d1] = prioriteti[1].naziv;
            dodijeljeno = true;
            break;
          }
        }
        if (dodijeljeno) break;
      }
      if (!dodijeljeno) {
        if (dani0.length > 0) {
          prioritetPoTreningu[dani0[0]] = prioriteti[0].naziv;
        }
        if (dani1.length > 0 && prioritetPoTreningu[dani1[0]] === null) {
          prioritetPoTreningu[dani1[0]] = prioriteti[1].naziv;
        }
      }
    }

    const client = await pool.connect();
    let kreiraniTreninzi;
    try {
      await client.query('BEGIN');

      await client.query(
        `DELETE FROM treninzi WHERE korisnik_id = $1 AND status = 'planiran'`,
        [id]
      );

      kreiraniTreninzi = [];
      for (let i = 0; i < listaPredlozaka.length; i++) {
        const offsetDana = izracunajOffsetDana(broj_dana_tjedno, i);
        const trening = await generirajTrening(Number(id), i, offsetDana, client, prioritetPoTreningu[i]);
        kreiraniTreninzi.push(trening);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
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
      `SELECT t.id, t.korisnik_id, t.tip_treninga_id, tt.naziv AS tip_treninga, TO_CHAR(t.datum, 'YYYY-MM-DD') AS datum, t.status, t.prioritetna_skupina
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

// GET /api/korisnici/:id/vjezbe-povijest - vrati jedinstvene vježbe iz odrađenih treninga korisnika
router.get('/:id/vjezbe-povijest', async (req, res) => {
  const { id } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }

  try {
    const result = await pool.query(
      `SELECT DISTINCT v.id, v.naziv, ms.naziv AS misicna_skupina
       FROM stavke_treninga st
       JOIN treninzi t ON t.id = st.trening_id
       JOIN vjezbe v ON v.id = st.vjezba_id
       JOIN misicne_skupine ms ON ms.id = v.misicna_skupina_id
       WHERE t.korisnik_id = $1 AND t.status = 'odradjen'
       ORDER BY v.naziv`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

// GET /api/korisnici/:id/napredak/:vjezbaId - vrati povijest planirane tezine/ponavljanja za vjezbu
router.get('/:id/napredak/:vjezbaId', async (req, res) => {
  const { id, vjezbaId } = req.params;

  if (!Number.isInteger(Number(id))) {
    return res.status(400).json({ greska: 'id mora biti broj.' });
  }
  if (!Number.isInteger(Number(vjezbaId))) {
    return res.status(400).json({ greska: 'vjezbaId mora biti broj.' });
  }

  try {
    const result = await pool.query(
      `SELECT TO_CHAR(t.datum, 'YYYY-MM-DD') AS datum, s.planirana_tezina, s.planirana_ponavljanja
       FROM serije s
       JOIN stavke_treninga st ON st.id = s.stavka_treninga_id
       JOIN treninzi t ON t.id = st.trening_id
       WHERE t.korisnik_id = $1 AND t.status = 'odradjen' AND st.vjezba_id = $2 AND s.redni_broj = 1
       ORDER BY t.datum ASC`,
      [id, vjezbaId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ greska: 'Greška na serveru.' });
  }
});

module.exports = router;
