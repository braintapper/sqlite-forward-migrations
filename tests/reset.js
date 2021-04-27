// reset
var chalk, client, config, db, fs, migrate, resetSql;

migrate = require("../index.js");

fs = require("fs-extra");

db = require('better-sqlite3');

chalk = require("chalk");

console.log(chalk.yellow("Reset database"));

config = fs.readJsonSync("./config.json");

// reset file is just a bunch of drop table statements (including dropping _migrations) to clear out database
resetSql = fs.readFileSync("../db/reset.sql").toString();

client = new db(config.databasePath);

client.exec(resetSql);

client.close();
