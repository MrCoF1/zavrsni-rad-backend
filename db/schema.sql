-- Shema baze za aplikaciju za planiranje treninga

DROP TABLE IF EXISTS korisnik_vjezba_stanje CASCADE;
DROP TABLE IF EXISTS serije CASCADE;
DROP TABLE IF EXISTS stavke_treninga CASCADE;
DROP TABLE IF EXISTS treninzi CASCADE;
DROP TABLE IF EXISTS vjezba_tip_treninga CASCADE;
DROP TABLE IF EXISTS vjezbe CASCADE;
DROP TABLE IF EXISTS tipovi_treninga CASCADE;
DROP TABLE IF EXISTS korisnik_prioriteti CASCADE;
DROP TABLE IF EXISTS misicne_skupine CASCADE;
DROP TABLE IF EXISTS korisnicki_profili CASCADE;
DROP TABLE IF EXISTS korisnici CASCADE;

-- 1. Korisnici
CREATE TABLE korisnici (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    ime VARCHAR(255) NOT NULL,
    lozinka_hash VARCHAR(255),
    datum_registracije TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Korisnicki profili (1:1 uz korisnika)
CREATE TABLE korisnicki_profili (
    id SERIAL PRIMARY KEY,
    korisnik_id INTEGER NOT NULL UNIQUE REFERENCES korisnici(id) ON DELETE CASCADE,
    cilj VARCHAR(20) NOT NULL CHECK (cilj IN ('mrsavljenje', 'bulk', 'clean_bulk')),
    visina_cm INTEGER NOT NULL,
    tezina_kg NUMERIC(5,2) NOT NULL,
    tip_tijela INTEGER NOT NULL CHECK (tip_tijela BETWEEN 1 AND 4),
    broj_dana_tjedno INTEGER NOT NULL CHECK (broj_dana_tjedno IN (2, 3, 4, 5))
);

-- 3. Misicne skupine
CREATE TABLE misicne_skupine (
    id SERIAL PRIMARY KEY,
    naziv VARCHAR(100) NOT NULL UNIQUE
);

-- 4. Korisnik prioriteti (many-to-many: korisnici <-> misicne_skupine)
CREATE TABLE korisnik_prioriteti (
    korisnik_id INTEGER NOT NULL REFERENCES korisnici(id) ON DELETE CASCADE,
    misicna_skupina_id INTEGER NOT NULL REFERENCES misicne_skupine(id) ON DELETE CASCADE,
    PRIMARY KEY (korisnik_id, misicna_skupina_id)
);

-- 5. Tipovi treninga
CREATE TABLE tipovi_treninga (
    id SERIAL PRIMARY KEY,
    naziv VARCHAR(50) NOT NULL UNIQUE
);

-- 6. Vjezbe
CREATE TABLE vjezbe (
    id SERIAL PRIMARY KEY,
    naziv VARCHAR(255) NOT NULL,
    misicna_skupina_id INTEGER NOT NULL REFERENCES misicne_skupine(id),
    tip VARCHAR(10) NOT NULL CHECK (tip IN ('snaga', 'kardio', 'oba'))
);

-- 7. Vjezba tip treninga (many-to-many: vjezbe <-> tipovi_treninga)
CREATE TABLE vjezba_tip_treninga (
    vjezba_id INTEGER NOT NULL REFERENCES vjezbe(id) ON DELETE CASCADE,
    tip_treninga_id INTEGER NOT NULL REFERENCES tipovi_treninga(id) ON DELETE CASCADE,
    PRIMARY KEY (vjezba_id, tip_treninga_id)
);

-- 8. Treninzi
CREATE TABLE treninzi (
    id SERIAL PRIMARY KEY,
    korisnik_id INTEGER NOT NULL REFERENCES korisnici(id) ON DELETE CASCADE,
    tip_treninga_id INTEGER NOT NULL REFERENCES tipovi_treninga(id),
    datum DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('planiran', 'odradjen')),
    redni_indeks_u_splitu INTEGER,
    prioritetna_skupina VARCHAR(50)
);

-- 9. Stavke treninga
CREATE TABLE stavke_treninga (
    id SERIAL PRIMARY KEY,
    trening_id INTEGER NOT NULL REFERENCES treninzi(id) ON DELETE CASCADE,
    vjezba_id INTEGER NOT NULL REFERENCES vjezbe(id),
    redni_broj INTEGER NOT NULL,
    ishod VARCHAR(10) CHECK (ishod IN ('tocno', 'manje'))
);

-- 10. Serije
CREATE TABLE serije (
    id SERIAL PRIMARY KEY,
    stavka_treninga_id INTEGER NOT NULL REFERENCES stavke_treninga(id) ON DELETE CASCADE,
    redni_broj INTEGER NOT NULL,
    planirana_tezina NUMERIC(6,2),
    planirana_ponavljanja INTEGER NOT NULL
);

-- 11. Korisnik vjezba stanje (trenutno ocekivana tezina/ponavljanja po paru korisnik-vjezba)
CREATE TABLE korisnik_vjezba_stanje (
    id SERIAL PRIMARY KEY,
    korisnik_id INTEGER NOT NULL REFERENCES korisnici(id) ON DELETE CASCADE,
    vjezba_id INTEGER NOT NULL REFERENCES vjezbe(id) ON DELETE CASCADE,
    trenutna_tezina NUMERIC,
    trenutna_ponavljanja INTEGER NOT NULL,
    uzastopni_pogodci INTEGER NOT NULL DEFAULT 0,
    zadnje_azuriranje TIMESTAMP DEFAULT NOW(),
    UNIQUE (korisnik_id, vjezba_id)
);
