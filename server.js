require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db/pool');

const korisniciRouter = require('./routes/korisnici');
const vjezbeRouter = require('./routes/vjezbe');
const misicneSkupineRouter = require('./routes/misicneSkupine');
const tipoviTreningaRouter = require('./routes/tipoviTreninga');
const treninziRouter = require('./routes/treninzi');
const stavkeTreningaRouter = require('./routes/stavkeTreninga');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Trening App backend radi.');
});

app.use('/api/korisnici', korisniciRouter);
app.use('/api/vjezbe', vjezbeRouter);
app.use('/api/misicne-skupine', misicneSkupineRouter);
app.use('/api/tipovi-treninga', tipoviTreningaRouter);
app.use('/api/treninzi', treninziRouter);
app.use('/api/stavke-treninga', stavkeTreningaRouter);

async function testDbConnection() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT NOW()');
    console.log('Uspješna konekcija na bazu, trenutno vrijeme baze:', result.rows[0].now);
  } finally {
    client.release();
  }
}

async function start() {
  try {
    await testDbConnection();
  } catch (err) {
    console.error('Greška pri spajanju na bazu:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server pokrenut na http://localhost:${PORT}`);
  });
}

start();
