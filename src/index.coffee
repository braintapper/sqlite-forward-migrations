Sugar = require "sugar-and-spice"
Sugar.extend()
path = require "path"
hasha = require "hasha"
fs = require "fs-extra"
chalk = require "chalk"
klawSync = require('klaw-sync')

class SQLiteForwardMigration

  client: {}
  config: {}

  executed_migrations: [] # from sqlite_migrations
  queued_migrations: [] # populated with file_migrations
  completed_migrations: [] # populated with freshly executed migrations

  constructor: (config)->
    Database = require('better-sqlite3')
    @config = config
    
    @client = new Database config.databasePath

    







  # Check the migrations table, create if it doesn't exist, then enqueue migrations
  ensure_migrations_table: ()->
    that = @

    console.log chalk.gray("Check Migrations Table")

    migrationSql ="""
      CREATE TABLE IF NOT EXISTS #{that.config.migrationTable}
      (
        id INTEGER PRIMARY KEY,
        version_tag TEXT not null,
        description TEXT not null,
        script_path TEXT not null,
        script_filename TEXT not null,
        script_md5 TEXT not null,
        executed_at TEXT NOT NULL DEFAULT current_timestamp,
        execution_duration integer not null,
        success integer not null
      );


    """
    console.log chalk.gray("Ensuring that `migrations` table exists.")
    @client.exec(migrationSql)

    

  migrate: ()->
    that = @
    console.log chalk.white("SQLite Forward Migrations")
    @ensure_migrations_table()

    migrationFilter = (item)->
      item.path.endsWith(".sql") && item.path.includes("__")

    scannedFiles = klawSync("#{@config.migrationPath}" , {nodir: true, filter: migrationFilter}).sortBy (item)->
      return item.path

    migrationPaths = scannedFiles.map (item)->
      item.path

    migrationPaths.forEach (item)->
      filename = path.basename(item,".sql")
      filename_chunks = filename.split("__")
      version_tag = filename.split("__")[0]
      description = filename.from(version_tag.length + 2).spacify()

      that.queued_migrations.push
        version_tag: version_tag
        description: description
        script_path: item
        script_filename: path.basename(item)
        script_md5: hasha.fromFileSync(item, {algorithm: 'md5'})
        executed_at: null
        execution_duration: null
        success: 0

    # populate executed_migrations array from db

    console.log chalk.gray("Checking for completed migrations")

    that = @

    sql = "select * from #{that.config.migrationTable} order by id asc"
    migrationsStatement = @client.prepare(sql)

    that.executed_migrations = migrationsStatement.all()



    console.log chalk.gray("Cleaning up executed migrations from queue...")
    that.executed_migrations.forEach (executed_migration)->
       that.queued_migrations.remove (file_migration)->
         if (file_migration.script_filename == executed_migration.script_filename)
           console.log chalk.gray("#{executed_migration.script_filename} already executed. Skipping")
    



    that.queued_migrations.forEach (currentMigration)->
      console.info chalk.green("Migrating: #{currentMigration.script_filename}")
      executed_at = Date.create()
      # YYYY-MM-DDTHH:MM:SS.SSS
      currentMigration.executed_at = executed_at.format("{yyyy}-{MM}-{dd}T{HH}:{mm}:{ss}.{SSS}")
      migrationSql = fs.readFileSync(currentMigration.script_path).toString()
      that.client.exec(migrationSql)
      currentMigration.execution_duration = executed_at.millisecondsAgo()
      currentMigration.success = 1

      migratedSql = that.client.prepare """
        insert into #{that.config.migrationTable} 
          (version_tag,description,script_path,script_filename,script_md5,executed_at,execution_duration, success) 
        values 
          (@version_tag, @description, @script_path, @script_filename, @script_md5, @executed_at, @execution_duration, @success)
        ; 
      """
      migratedSql.run currentMigration
    


    

    @client.close()
      



    console.log chalk.white("Task finished. #{that.queued_migrations.length} migrations were executed.")



module.exports = SQLiteForwardMigration
