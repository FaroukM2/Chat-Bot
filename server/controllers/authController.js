const User = require("../models/User");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

// register
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const existingUser = await User.findOne({ where: { username } });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        username: user.username,
      },
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid username or password" });
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
      },
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get users
exports.getUsers = async (req, res) => {
  try {
    const { userId } = req.query;

    const users = await User.findAll({
      where: {
        id: { [Op.ne]: userId },
      },
      attributes: ["id", "username"],
    });

    res.json(users);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await user.destroy();

    res.json({ message: "User deleted successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};