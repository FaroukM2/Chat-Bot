const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getUsers,
  deleteUser,
} = require("../controllers/authController");

// auth
router.post("/register", register);
router.post("/login", login);

// users
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);

module.exports = router;
