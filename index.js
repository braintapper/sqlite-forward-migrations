var SQLiteForwardMigration, Sugar, chalk, fs, hasha, klawSync, path;

Sugar = require("sugar-and-spice");

Sugar.extend();

path = require("path");

hasha = require("hasha");

fs = require("fs-extra");

chalk = require("chalk");

klawSync = require('klaw-sync');

SQLiteForwardMigration = (function() {
  class SQLiteForwardMigration {
    constructor(config) {
      var Database;
      Database = require('better-sqlite3');
      this.config = config;
      this.client = new Database(config.databasePath);
    }

    
    // Check the migrations table, create if it doesn't exist, then enqueue migrations
    ensure_migrations_table() {
      var migrationSql, that;
      that = this;
      console.log(chalk.gray("Check Migrations Table"));
      migrationSql = `CREATE TABLE IF NOT EXISTS ${that.config.migrationTable}\n(\n  id INTEGER PRIMARY KEY,\n  version_tag TEXT not null,\n  description TEXT not null,\n  script_path TEXT not null,\n  script_filename TEXT not null,\n  script_md5 TEXT not null,\n  executed_at TEXT NOT NULL DEFAULT current_timestamp,\n  execution_duration integer not null,\n  success integer not null\n);\n\n`;
      console.log(chalk.gray("Ensuring that `migrations` table exists."));
      return this.client.exec(migrationSql);
    }

    migrate() {
      var migrationFilter, migrationPaths, migrationsStatement, scannedFiles, sql, that;
      that = this;
      console.log(chalk.white("SQLite Forward Migrations"));
      this.ensure_migrations_table();
      migrationFilter = function(item) {
        return item.path.endsWith(".sql") && item.path.includes("__");
      };
      scannedFiles = klawSync(`${this.config.migrationPath}`, {
        nodir: true,
        filter: migrationFilter
      }).sortBy(function(item) {
        return item.path;
      });
      migrationPaths = scannedFiles.map(function(item) {
        return item.path;
      });
      migrationPaths.forEach(function(item) {
        var description, filename, filename_chunks, version_tag;
        filename = path.basename(item, ".sql");
        filename_chunks = filename.split("__");
        version_tag = filename.split("__")[0];
        description = filename.from(version_tag.length + 2).spacify();
        return that.queued_migrations.push({
          version_tag: version_tag,
          description: description,
          script_path: item,
          script_filename: path.basename(item),
          script_md5: hasha.fromFileSync(item, {
            algorithm: 'md5'
          }),
          executed_at: null,
          execution_duration: null,
          success: 0
        });
      });
      // populate executed_migrations array from db
      console.log(chalk.gray("Checking for completed migrations"));
      that = this;
      sql = `select * from ${that.config.migrationTable} order by id asc`;
      migrationsStatement = this.client.prepare(sql);
      that.executed_migrations = migrationsStatement.all();
      console.log(chalk.gray("Cleaning up executed migrations from queue..."));
      that.executed_migrations.forEach(function(executed_migration) {
        return that.queued_migrations.remove(function(file_migration) {
          if (file_migration.script_filename === executed_migration.script_filename) {
            console.log(chalk.gray(`${executed_migration.script_filename} already executed. Skipping`));
          }
          return file_migration.script_filename === executed_migration.script_filename;
        });
      });
      that.queued_migrations.forEach(function(currentMigration) {
        var executed_at, migratedSql, migrationSql;
        console.info(chalk.green(`Migrating: ${currentMigration.script_filename}`));
        executed_at = Date.create();
        // YYYY-MM-DDTHH:MM:SS.SSS
        currentMigration.executed_at = executed_at.format("{yyyy}-{MM}-{dd}T{HH}:{mm}:{ss}.{SSS}");
        migrationSql = fs.readFileSync(currentMigration.script_path).toString();
        that.client.exec(migrationSql);
        currentMigration.execution_duration = executed_at.millisecondsAgo();
        currentMigration.success = 1;
        migratedSql = that.client.prepare(`insert into ${that.config.migrationTable} \n  (version_tag,description,script_path,script_filename,script_md5,executed_at,execution_duration, success) \nvalues \n  (@version_tag, @description, @script_path, @script_filename, @script_md5, @executed_at, @execution_duration, @success)\n; `);
        return migratedSql.run(currentMigration);
      });
      this.client.close();
      return console.log(chalk.white(`Task finished. ${that.queued_migrations.length} migrations were executed.`));
    }

  };

  SQLiteForwardMigration.prototype.client = {};

  SQLiteForwardMigration.prototype.config = {};

  SQLiteForwardMigration.prototype.executed_migrations = [];

  SQLiteForwardMigration.prototype.queued_migrations = [];

  SQLiteForwardMigration.prototype.completed_migrations = [];

  return SQLiteForwardMigration;

}).call(this);

module.exports = SQLiteForwardMigration;
