const pool = require('../db/pool');
const pocetneVrijednosti = require('../config/pocetneVrijednosti');

const BROJ_SERIJA = 3;

function zaokruziNaParan(broj) {
  return Math.round(broj / 2) * 2;
}

function izracunajPonavljanja(repsBaza, cilj) {
  if (cilj === 'mrsavljenje') {
    return zaokruziNaParan(repsBaza * 1.2);
  }
  return repsBaza;
}

function izracunajPocetneVrijednosti(nazivVjezbe, tezinaKg, cilj) {
  const podaci = pocetneVrijednosti[nazivVjezbe];
  if (!podaci) {
    throw new Error(`Nepoznata vježba: ${nazivVjezbe}`);
  }

  const { koeficijent, format, reps_baza } = podaci;

  if (format === 'barbell' || format === 'machine') {
    let tezina = koeficijent * tezinaKg;
    if (cilj === 'mrsavljenje') {
      tezina *= 0.92;
    }
    tezina = zaokruziNaParan(tezina);
    const ponavljanja = izracunajPonavljanja(reps_baza, cilj);
    return {
      planirana_tezina: tezina,
      planirana_ponavljanja: ponavljanja,
      prikaz_tezine: `${tezina}kg`
    };
  }

  if (format === 'dumbbell') {
    let tezinaUkupna = koeficijent * tezinaKg;
    if (cilj === 'mrsavljenje') {
      tezinaUkupna *= 0.92;
    }
    const tezinaPoBucici = zaokruziNaParan(tezinaUkupna / 2);
    const ponavljanja = izracunajPonavljanja(reps_baza, cilj);
    return {
      planirana_tezina: tezinaPoBucici,
      planirana_ponavljanja: ponavljanja,
      prikaz_tezine: `2x${tezinaPoBucici}kg`
    };
  }

  if (format === 'bodyweight_reps') {
    let ponavljanja = koeficijent * tezinaKg;
    if (cilj === 'mrsavljenje') {
      ponavljanja *= 1.2;
    }
    ponavljanja = zaokruziNaParan(ponavljanja);
    return {
      planirana_tezina: null,
      planirana_ponavljanja: ponavljanja,
      prikaz_tezine: 'tjelesna težina'
    };
  }

  if (format === 'cardio_minutes') {
    let minute = koeficijent * tezinaKg;
    if (cilj === 'mrsavljenje') {
      minute *= 1.2;
    }
    minute = Math.ceil(minute);
    return {
      planirana_tezina: null,
      planirana_ponavljanja: minute,
      prikaz_tezine: 'minute'
    };
  }

  throw new Error(`Nepoznat format vježbe "${nazivVjezbe}": ${format}`);
}

async function dohvatiPlanZaVjezbu(korisnikId, vjezbaId) {
  const vjezbaRes = await pool.query('SELECT naziv FROM vjezbe WHERE id = $1', [vjezbaId]);
  if (vjezbaRes.rows.length === 0) {
    throw new Error(`Vježba s id=${vjezbaId} ne postoji.`);
  }
  const nazivVjezbe = vjezbaRes.rows[0].naziv;

  const stanjeRes = await pool.query(
    'SELECT trenutna_tezina, trenutna_ponavljanja FROM korisnik_vjezba_stanje WHERE korisnik_id = $1 AND vjezba_id = $2',
    [korisnikId, vjezbaId]
  );

  if (stanjeRes.rows.length > 0) {
    const { trenutna_tezina, trenutna_ponavljanja } = stanjeRes.rows[0];
    return {
      broj_serija: BROJ_SERIJA,
      planirana_tezina: trenutna_tezina,
      planirana_ponavljanja: trenutna_ponavljanja
    };
  }

  const profilRes = await pool.query(
    'SELECT tezina_kg, cilj FROM korisnicki_profili WHERE korisnik_id = $1',
    [korisnikId]
  );
  if (profilRes.rows.length === 0) {
    throw new Error(`Korisnički profil ne postoji za korisnika ${korisnikId}.`);
  }
  const { tezina_kg, cilj } = profilRes.rows[0];

  const pocetne = izracunajPocetneVrijednosti(nazivVjezbe, tezina_kg, cilj);

  return {
    broj_serija: BROJ_SERIJA,
    planirana_tezina: pocetne.planirana_tezina,
    planirana_ponavljanja: pocetne.planirana_ponavljanja
  };
}

async function azurirajProgresiju(korisnikId, vjezbaId, ishod) {
  const vjezbaRes = await pool.query('SELECT naziv FROM vjezbe WHERE id = $1', [vjezbaId]);
  if (vjezbaRes.rows.length === 0) {
    throw new Error(`Vježba s id=${vjezbaId} ne postoji.`);
  }
  const nazivVjezbe = vjezbaRes.rows[0].naziv;

  const podaci = pocetneVrijednosti[nazivVjezbe];
  if (!podaci) {
    throw new Error(`Nepoznata vježba: ${nazivVjezbe}`);
  }
  const { format, reps_baza } = podaci;

  const stanjeRes = await pool.query(
    'SELECT trenutna_tezina, trenutna_ponavljanja, uzastopni_pogodci FROM korisnik_vjezba_stanje WHERE korisnik_id = $1 AND vjezba_id = $2',
    [korisnikId, vjezbaId]
  );
  const redakPostoji = stanjeRes.rows.length > 0;

  let trenutnaTezina;
  let trenutnaPonavljanja;
  let uzastopniPogodci;

  if (redakPostoji) {
    ({
      trenutna_tezina: trenutnaTezina,
      trenutna_ponavljanja: trenutnaPonavljanja,
      uzastopni_pogodci: uzastopniPogodci
    } = stanjeRes.rows[0]);
  } else {
    const profilRes = await pool.query(
      'SELECT tezina_kg, cilj FROM korisnicki_profili WHERE korisnik_id = $1',
      [korisnikId]
    );
    if (profilRes.rows.length === 0) {
      throw new Error(`Korisnički profil ne postoji za korisnika ${korisnikId}.`);
    }
    const { tezina_kg, cilj } = profilRes.rows[0];
    const pocetne = izracunajPocetneVrijednosti(nazivVjezbe, tezina_kg, cilj);
    trenutnaTezina = pocetne.planirana_tezina;
    trenutnaPonavljanja = pocetne.planirana_ponavljanja;
    uzastopniPogodci = 0;
  }

  if (ishod === 'manje') {
    if (!redakPostoji) {
      await pool.query(
        `INSERT INTO korisnik_vjezba_stanje (korisnik_id, vjezba_id, trenutna_tezina, trenutna_ponavljanja, uzastopni_pogodci)
         VALUES ($1, $2, $3, $4, $5)`,
        [korisnikId, vjezbaId, trenutnaTezina, trenutnaPonavljanja, uzastopniPogodci]
      );
    }
    return { trenutna_tezina: trenutnaTezina, trenutna_ponavljanja: trenutnaPonavljanja, uzastopni_pogodci: uzastopniPogodci };
  }

  if (nazivVjezbe === 'Push-ups') {
    trenutnaPonavljanja += 1;
  } else if (format === 'bodyweight_reps' || format === 'cardio_minutes') {
    uzastopniPogodci += 1;
    if (uzastopniPogodci >= 2) {
      trenutnaPonavljanja += 1;
      uzastopniPogodci = 0;
    }
  } else {
    uzastopniPogodci += 1;
    if (uzastopniPogodci >= 2) {
      let increment = reps_baza === 8 ? 2 : 0.5;
      if (format === 'dumbbell') {
        increment /= 2;
      }
      trenutnaTezina = Math.round((Number(trenutnaTezina) + increment) * 100) / 100;
      uzastopniPogodci = 0;
    }
  }

  await pool.query(
    `INSERT INTO korisnik_vjezba_stanje (korisnik_id, vjezba_id, trenutna_tezina, trenutna_ponavljanja, uzastopni_pogodci, zadnje_azuriranje)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (korisnik_id, vjezba_id)
     DO UPDATE SET trenutna_tezina = EXCLUDED.trenutna_tezina,
                   trenutna_ponavljanja = EXCLUDED.trenutna_ponavljanja,
                   uzastopni_pogodci = EXCLUDED.uzastopni_pogodci,
                   zadnje_azuriranje = NOW()`,
    [korisnikId, vjezbaId, trenutnaTezina, trenutnaPonavljanja, uzastopniPogodci]
  );

  return { trenutna_tezina: trenutnaTezina, trenutna_ponavljanja: trenutnaPonavljanja, uzastopni_pogodci: uzastopniPogodci };
}

module.exports = {
  zaokruziNaParan,
  izracunajPocetneVrijednosti,
  dohvatiPlanZaVjezbu,
  azurirajProgresiju
};
