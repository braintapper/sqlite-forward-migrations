# reset

migrate = require("../index.js")
fs = require("fs-extra")
db = require('better-sqlite3')
chalk = require("chalk")


console.log chalk.yellow("Reset database")



config = fs.readJsonSync("./config.json")
resetSql = fs.readFileSync("./reset.sql").toString()


client = new db config.databasePath


client.exec(resetSql)
client.close()