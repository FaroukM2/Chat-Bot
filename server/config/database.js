const { Sequelize } = require("sequelize");

// create SQLite database
const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: process.env.NODE_ENV === "production" ? "/data/database.sqlite" : "./database.sqlite",
});

module.exports = sequelize;