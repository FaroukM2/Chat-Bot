const User = require("../models/User");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const Message = require("../models/Message");

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

    // Delete all messages associated with this user first
    await Message.destroy({
      where: {
        [Op.or]: [{ senderId: id }, { receiverId: id }]
      }
    });

    await user.destroy();

    res.json({ message: "User deleted successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// get messages between two users
exports.getMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.query;

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: user1, receiverId: user2 },
          { senderId: user2, receiverId: user1 },
        ],
      },
      order: [["createdAt", "ASC"]],
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// clear messages between two users
exports.clearMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.query;

    await Message.destroy({
      where: {
        [Op.or]: [
          { senderId: user1, receiverId: user2 },
          { senderId: user2, receiverId: user1 },
        ],
      },
    });

    res.json({ message: "Chat cleared" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // check if name taken
    const taken = await User.findOne({ where: { username, id: { [Op.ne]: id } } });
    if(taken) return res.status(400).json({ error: "Username already taken" });

    user.username = username;
    await user.save();
    res.json({ message: "Updated", user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};