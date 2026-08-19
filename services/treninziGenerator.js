const pool = require('../db/pool');
const splitPredlosci = require('../config/splitPredlosci');
const { dohvatiPlanZaVjezbu } = require('./vjezbaStanje');

async function dohvatiKandidate(misicnaSkupina, tipTreningaId) {
  const res = await pool.query(
    `SELECT v.id, v.naziv
     FROM vjezbe v
     JOIN misicne_skupine ms ON ms.id = v.misicna_skupina_id
     JOIN vjezba_tip_treninga vtt ON vtt.vjezba_id = v.id
     WHERE ms.naziv = $1 AND vtt.tip_treninga_id = $2`,
    [misicnaSkupina, tipTreningaId]
  );
  return res.rows;
}

function izaberiNasumicno(kandidati, broj, odabraniIdovi) {
  const dostupni = kandidati.filter((k) => !odabraniIdovi.has(k.id));
  const odabrani = [];
  for (let i = 0; i < broj && dostupni.length > 0; i++) {
    const index = Math.floor(Math.random() * dostupni.length);
    odabrani.push(dostupni.splice(index, 1)[0]);
  }
  return odabrani;
}

function odaberiVjezbeRotacijom(kandidati, brojTrazenih, brojGeneracija, brojDanaTjedno) {
  const sortirani = [...kandidati].sort((a, b) => a.id - b.id);
  if (sortirani.length === 0 || brojTrazenih <= 0) {
    return [];
  }

  const odabrani = [sortirani[0]];
  const ostali = sortirani.slice(1);

  if (ostali.length === 0) {
    return odabrani;
  }

  const rotacijaIndex = (brojDanaTjedno === 2 || brojDanaTjedno === 3)
    ? Math.floor(brojGeneracija / 2)
    : brojGeneracija;

  const iskoristeniIndeksi = new Set();
  for (let p = 0; p < brojTrazenih - 1 && iskoristeniIndeksi.size < ostali.length; p++) {
    const index = (rotacijaIndex + p) % ostali.length;
    if (iskoristeniIndeksi.has(index)) continue;
    iskoristeniIndeksi.add(index);
    odabrani.push(ostali[index]);
  }

  return odabrani;
}

async function generirajTrening(korisnikId, redniIndeksUSplitu, offsetDana, client, prioritetnaSkupinaOverride) {
  const koristiEksplicitniPrioritet = prioritetnaSkupinaOverride !== undefined;

  const profilRes = await pool.query(
    'SELECT cilj, broj_dana_tjedno, tezina_kg FROM korisnicki_profili WHERE korisnik_id = $1',
    [korisnikId]
  );
  if (profilRes.rows.length === 0) {
    throw new Error(`Korisnički profil ne postoji za korisnika ${korisnikId}.`);
  }
  const { cilj, broj_dana_tjedno: brojDanaTjedno } = profilRes.rows[0];

  let prioriteti = [];
  if (!koristiEksplicitniPrioritet) {
    const prioritetiRes = await pool.query(
      `SELECT kp.misicna_skupina_id, ms.naziv
       FROM korisnik_prioriteti kp
       JOIN misicne_skupine ms ON ms.id = kp.misicna_skupina_id
       WHERE kp.korisnik_id = $1
       ORDER BY kp.misicna_skupina_id`,
      [korisnikId]
    );
    prioriteti = prioritetiRes.rows;
  }

  const listaPredlozaka = splitPredlosci[brojDanaTjedno];
  if (!listaPredlozaka) {
    throw new Error(`Ne postoji split predložak za broj_dana_tjedno=${brojDanaTjedno}.`);
  }

  const predlozak = listaPredlozaka[redniIndeksUSplitu];
  if (!predlozak) {
    throw new Error(
      `Predložak nije pronađen za redni_indeks_u_splitu=${redniIndeksUSplitu}, broj_dana_tjedno=${brojDanaTjedno}.`
    );
  }
  const tipTreningaNaziv = predlozak.tip_treninga;

  const tipTreningaRes = await pool.query('SELECT id FROM tipovi_treninga WHERE naziv = $1', [tipTreningaNaziv]);
  if (tipTreningaRes.rows.length === 0) {
    throw new Error(`Tip treninga "${tipTreningaNaziv}" ne postoji.`);
  }
  const tipTreningaId = tipTreningaRes.rows[0].id;

  const brojGeneracijaRes = await pool.query(
    'SELECT COUNT(*) FROM treninzi WHERE korisnik_id = $1 AND tip_treninga_id = $2',
    [korisnikId, tipTreningaId]
  );
  const brojGeneracija = Number(brojGeneracijaRes.rows[0].count);

  const odabraneVjezbe = [];
  const odabraniIdovi = new Set();

  for (const stavka of predlozak.sastav) {
    if (stavka.iskljucivo_vjezba) {
      const res = await pool.query('SELECT id, naziv FROM vjezbe WHERE naziv = $1', [stavka.iskljucivo_vjezba]);
      if (res.rows.length === 0) {
        throw new Error(`Vježba "${stavka.iskljucivo_vjezba}" (iskljucivo_vjezba) ne postoji.`);
      }
      const vjezba = res.rows[0];
      if (!odabraniIdovi.has(vjezba.id)) {
        odabraneVjezbe.push(vjezba);
        odabraniIdovi.add(vjezba.id);
      }
      continue;
    }

    const kandidati = await dohvatiKandidate(stavka.misicna_skupina, tipTreningaId);
    const dostupniKandidati = kandidati.filter((k) => !odabraniIdovi.has(k.id));
    const odabrani = odaberiVjezbeRotacijom(dostupniKandidati, stavka.broj, brojGeneracija, brojDanaTjedno);
    for (const v of odabrani) {
      odabraneVjezbe.push(v);
      odabraniIdovi.add(v.id);
    }
  }

  if (predlozak.kardio_za_ciljeve.includes(cilj)) {
    const kandidatiKardio = await dohvatiKandidate('cardio', tipTreningaId);
    const odabraniKardio = izaberiNasumicno(kandidatiKardio, 1, odabraniIdovi);
    if (odabraniKardio.length > 0) {
      odabraneVjezbe.push(odabraniKardio[0]);
      odabraniIdovi.add(odabraniKardio[0].id);
    }
  }

  let prioritetnaSkupinaNaziv = null;
  let nazivZaPrioritet = null;

  if (koristiEksplicitniPrioritet) {
    if (prioritetnaSkupinaOverride && predlozak.prioritet_slot) {
      nazivZaPrioritet = prioritetnaSkupinaOverride;
    }
  } else if (predlozak.prioritet_slot && prioriteti.length > 0) {
    let odabraniPrioritet;
    if (prioriteti.length === 1) {
      odabraniPrioritet = prioriteti[0];
    } else {
      odabraniPrioritet = predlozak.prioritet_uvijek_svaki_tjedan
        ? prioriteti[0]
        : prioriteti[brojGeneracija % 2];
    }
    nazivZaPrioritet = odabraniPrioritet.naziv;
  }

  if (nazivZaPrioritet) {
    const imaMjesta = odabraneVjezbe.length < 9;

    if (imaMjesta) {
      const kandidati = await dohvatiKandidate(nazivZaPrioritet, tipTreningaId);
      const odabrani = izaberiNasumicno(kandidati, 1, odabraniIdovi);
      if (odabrani.length > 0) {
        odabraneVjezbe.push(odabrani[0]);
        odabraniIdovi.add(odabrani[0].id);
        prioritetnaSkupinaNaziv = nazivZaPrioritet;
      }
    }
  }

  const vlastitiClient = !client;
  const dbClient = client || await pool.connect();
  try {
    if (vlastitiClient) {
      await dbClient.query('BEGIN');
    }

    const datum = new Date();
    datum.setDate(datum.getDate() + offsetDana);
    const datumStr = datum.toISOString().slice(0, 10);

    const treningRes = await dbClient.query(
      `INSERT INTO treninzi (korisnik_id, tip_treninga_id, datum, status, redni_indeks_u_splitu, prioritetna_skupina)
       VALUES ($1, $2, $3, 'planiran', $4, $5)
       RETURNING id, TO_CHAR(datum, 'YYYY-MM-DD') AS datum, status, redni_indeks_u_splitu, prioritetna_skupina`,
      [korisnikId, tipTreningaId, datumStr, redniIndeksUSplitu, prioritetnaSkupinaNaziv]
    );
    const trening = treningRes.rows[0];

    const stavke = [];
    let redniBrojStavke = 1;
    for (const vjezba of odabraneVjezbe) {
      const plan = await dohvatiPlanZaVjezbu(korisnikId, vjezba.id);

      const stavkaRes = await dbClient.query(
        `INSERT INTO stavke_treninga (trening_id, vjezba_id, redni_broj)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [trening.id, vjezba.id, redniBrojStavke]
      );
      const stavkaId = stavkaRes.rows[0].id;

      const serije = [];
      for (let i = 1; i <= plan.broj_serija; i++) {
        const serijaRes = await dbClient.query(
          `INSERT INTO serije (stavka_treninga_id, redni_broj, planirana_tezina, planirana_ponavljanja)
           VALUES ($1, $2, $3, $4)
           RETURNING id, redni_broj, planirana_tezina, planirana_ponavljanja`,
          [stavkaId, i, plan.planirana_tezina, plan.planirana_ponavljanja]
        );
        serije.push(serijaRes.rows[0]);
      }

      stavke.push({
        id: stavkaId,
        vjezba_id: vjezba.id,
        naziv_vjezbe: vjezba.naziv,
        redni_broj: redniBrojStavke,
        serije
      });

      redniBrojStavke++;
    }

    if (vlastitiClient) {
      await dbClient.query('COMMIT');
    }

    return {
      id: trening.id,
      korisnik_id: korisnikId,
      tip_treninga_id: tipTreningaId,
      tip_treninga: tipTreningaNaziv,
      datum: trening.datum,
      status: trening.status,
      redni_indeks_u_splitu: trening.redni_indeks_u_splitu,
      prioritetna_skupina: trening.prioritetna_skupina,
      vjezbe: stavke
    };
  } catch (err) {
    if (vlastitiClient) {
      await dbClient.query('ROLLBACK');
    }
    throw err;
  } finally {
    if (vlastitiClient) {
      dbClient.release();
    }
  }
}

module.exports = { generirajTrening, dohvatiKandidate };
