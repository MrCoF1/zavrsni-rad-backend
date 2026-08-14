require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runSqlFile(client, filename) {
  const filePath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`Izvršavam ${filename} ...`);
  await client.query(sql);
  console.log(`${filename} uspješno izvršen.`);
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await runSqlFile(client, 'schema.sql');
    await runSqlFile(client, 'seed.sql');
    console.log('Inicijalizacija baze završena.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Greška pri inicijalizaciji baze:', err.message);
  process.exit(1);
});
