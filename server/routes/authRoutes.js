const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getUsers,
  deleteUser,
  updateUser,
  getMessages,
  clearMessages,
} = require("../controllers/authController");

// auth
router.post("/register", register);
router.post("/login", login);

// users
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);
router.put("/users/:id", updateUser);
router.get("/messages", getMessages);
router.delete("/messages", clearMessages);

module.exports = router;
