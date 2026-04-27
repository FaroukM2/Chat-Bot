const { Sequelize } = require("sequelize");

// create SQLite database
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite", // file-based DB
});

module.exports = sequelize;