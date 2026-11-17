import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '.postgres_data');
const port = 54329;
const user = 'postgres';
const password = 'password';

console.log(`🚀 Starting Dedicated Real PostgreSQL Database on port ${port}...`);
console.log(`📁 Data directory: ${dbDir}`);

const pg = new EmbeddedPostgres({
  databaseDir: dbDir,
  user,
  password,
  port,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

async function main() {
  try {
    await pg.initialise();
  } catch (err) {
    // Already initialised is fine
    console.log('Database already initialized or notice:', err.message || err);
  }

  await pg.start();
  console.log(`✅ Real PostgreSQL server is RUNNING on port ${port}!`);

  // Connect to default 'postgres' database and ensure 'agri_procure' and 'agri_procure_demo' exist
  const client = pg.getPgClient();
  await client.connect();

  const dbs = await client.query("SELECT datname FROM pg_database WHERE datname IN ('agri_procure', 'agri_procure_demo')");
  const existingDbs = dbs.rows.map(r => r.datname);

  if (!existingDbs.includes('agri_procure')) {
    console.log('Creating database "agri_procure"...');
    await client.query('CREATE DATABASE agri_procure');
    console.log('Database "agri_procure" created.');
  } else {
    console.log('Database "agri_procure" already exists.');
  }

  if (!existingDbs.includes('agri_procure_demo')) {
    console.log('Creating database "agri_procure_demo"...');
    await client.query('CREATE DATABASE agri_procure_demo');
    console.log('Database "agri_procure_demo" created.');
  } else {
    console.log('Database "agri_procure_demo" already exists.');
  }

  await client.end();
  console.log('✅ PostgreSQL is ready for connections.');
  console.log(`Connection string: postgres://${user}:${password}@127.0.0.1:${port}/agri_procure`);

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Stopping PostgreSQL server...');
    try {
      await pg.stop();
      console.log('PostgreSQL stopped.');
    } catch (e) {
      console.error('Error stopping:', e);
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Failed to run PostgreSQL:', err);
  process.exit(1);
});
