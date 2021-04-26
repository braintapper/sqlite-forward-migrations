var SQLiteForwardMigration, config, fs, migrationJob;

SQLiteForwardMigration = require("../index.js");

fs = require("fs-extra");

config = fs.readJsonSync("./config.json");

migrationJob = new SQLiteForwardMigration(config);

migrationJob.migrate();
