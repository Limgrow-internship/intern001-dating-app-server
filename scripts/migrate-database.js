const { MongoClient } = require('mongodb');

// Configuration
const OLD_DB_URI = 'mongodb+srv://hoangduy00987_db_user:3OARg0RMT9ReXe1Z@cluster0.0sicpi3.mongodb.net';
const NEW_DB_URI = 'mongodb+srv://vunguyendev92_db_user:gT0IVjmy2OG7Oowg@cluster0.opdvy6a.mongodb.net/?appName=Cluster0';
const DB_NAME = 'dating-app';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}→${colors.reset} ${msg}`),
};

async function migrateDatabase() {
  let oldClient, newClient;

  try {
    log.step('Starting database migration...\n');

    // Connect to old database
    log.step('Connecting to OLD database...');
    oldClient = new MongoClient(OLD_DB_URI);
    await oldClient.connect();
    const oldDb = oldClient.db(DB_NAME);
    log.success(`Connected to OLD database: ${DB_NAME}`);

    // Connect to new database
    log.step('Connecting to NEW database...');
    newClient = new MongoClient(NEW_DB_URI);
    await newClient.connect();
    const newDb = newClient.db(DB_NAME);
    log.success(`Connected to NEW database: ${DB_NAME}\n`);

    // Get all collections from old database
    const collections = await oldDb.listCollections().toArray();

    if (collections.length === 0) {
      log.warning('No collections found in old database!');
      return;
    }

    log.info(`Found ${collections.length} collection(s) to migrate:\n`);
    collections.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.name}`);
    });
    console.log();

    let totalDocuments = 0;
    let totalCollections = 0;

    // Migrate each collection
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;

      // Skip system collections
      if (collectionName.startsWith('system.')) {
        log.warning(`Skipping system collection: ${collectionName}`);
        continue;
      }

      log.step(`Migrating collection: ${collectionName}`);

      const oldCollection = oldDb.collection(collectionName);
      const newCollection = newDb.collection(collectionName);

      const documents = await oldCollection.find({}).toArray();

      if (documents.length === 0) {
        log.warning(`Collection "${collectionName}" is empty, skipping...`);
        continue;
      }

      log.info(`Found ${documents.length} document(s)`);

      // Check if collection already exists in new database
      const existingDocs = await newCollection.countDocuments();
      if (existingDocs > 0) {
        log.warning(`Collection "${collectionName}" already has ${existingDocs} document(s) in new database`);
        log.info(`Clearing existing documents before migration...`);
        await newCollection.deleteMany({});
      }

      // Insert documents into new collection
      if (documents.length > 0) {
        await newCollection.insertMany(documents, { ordered: false });
        log.success(`Migrated ${documents.length} document(s) successfully`);

        totalDocuments += documents.length;
        totalCollections++;
      }

      // Copy indexes
      const indexes = await oldCollection.indexes();
      if (indexes.length > 1) {
        log.info(`Copying ${indexes.length - 1} index(es)...`);
        for (const index of indexes) {
          if (index.name !== '_id_') {
            try {
              const indexSpec = { ...index.key };
              const options = {};
              if (index.unique) options.unique = true;
              if (index.sparse) options.sparse = true;
              if (index.name) options.name = index.name;

              await newCollection.createIndex(indexSpec, options);
              log.success(`Created index: ${index.name}`);
            } catch (err) {
              if (err.code !== 85 && err.code !== 86) { // Ignore "index already exists" errors
                log.warning(`Failed to create index ${index.name}: ${err.message}`);
              }
            }
          }
        }
      }

      console.log();
    }

    console.log('='.repeat(60));
    log.success('Migration completed successfully!\n');
    log.info(`Summary:`);
    console.log(`Collections migrated: ${totalCollections}`);
    console.log(`Total documents migrated: ${totalDocuments}`);
    console.log('='.repeat(60));

  } catch (error) {
    log.error(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (oldClient) {
      await oldClient.close();
      log.info('\nClosed connection to OLD database');
    }
    if (newClient) {
      await newClient.close();
      log.info('Closed connection to NEW database');
    }
  }
}

async function verifyMigration() {
  let oldClient, newClient;

  try {
    log.step('\n\nVerifying migration...\n');

    oldClient = new MongoClient(OLD_DB_URI);
    await oldClient.connect();
    const oldDb = oldClient.db(DB_NAME);

    newClient = new MongoClient(NEW_DB_URI);
    await newClient.connect();
    const newDb = newClient.db(DB_NAME);

    const oldCollections = await oldDb.listCollections().toArray();

    for (const collectionInfo of oldCollections) {
      const collectionName = collectionInfo.name;

      if (collectionName.startsWith('system.')) continue;

      const oldCount = await oldDb.collection(collectionName).countDocuments();
      const newCount = await newDb.collection(collectionName).countDocuments();

      if (oldCount === newCount) {
        log.success(`${collectionName}: ${newCount} documents ✓`);
      } else {
        log.error(`${collectionName}: OLD=${oldCount}, NEW=${newCount} (mismatch!)`);
      }
    }

  } catch (error) {
    log.error(`Verification failed: ${error.message}`);
  } finally {
    if (oldClient) await oldClient.close();
    if (newClient) await newClient.close();
  }
}

// Run migration
(async () => {
  console.log('\n' + '='.repeat(60));
  console.log('  DATABASE MIGRATION TOOL');
  console.log('='.repeat(60) + '\n');

  await migrateDatabase();
  await verifyMigration();

  console.log('\n' + '='.repeat(60));
  log.success('All done!');
  console.log('='.repeat(60) + '\n');
})();
