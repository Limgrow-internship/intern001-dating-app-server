require('dotenv').config();

const config = {
  mongodb: {
    url: process.env.MONGO_URI,            // Lấy từ .env
    
    databaseName: process.env.MONGO_DB_NAME, // Lấy từ .env

    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  migrationsDir: "migrations",
  changelogCollectionName: "changelog",
  lockCollectionName: "changelog_lock",
  lockTtl: 0,

  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "commonjs",
};

module.exports = config;
