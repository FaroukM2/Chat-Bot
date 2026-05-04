const sequelize = require("../server/config/database");
const User = require("../server/models/User");
const Message = require("../server/models/Message");

async function clearDB() {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB.");
    
    // Force sync (drops all tables and recreates them)
    await sequelize.sync({ force: true });
    console.log("Database cleared successfully! All users and messages deleted.");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing DB:", error);
    process.exit(1);
  }
}

clearDB();
