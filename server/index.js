const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { Worker } = require("worker_threads");
const cors = require("cors");
require("dotenv").config();
const { DataTypes } = require("sequelize");

const sequelize = require("./config/database");
const authRoutes = require("./routes/authRoutes");
const Message = sequelize.define("Message", {
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  receiverId: { type: DataTypes.INTEGER, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.STRING, defaultValue: "text" }, // 'text' or 'image'
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
});

// global online users tracker
const onlineUsers = new Map(); // userId -> socket.id

const app = express();

// database connection
sequelize.sync({ alter: true })
    .then(() => console.log("Database connected and altered"))
    .catch((err) => console.log("DB Error:", err));

// create HTTP server
const server = http.createServer(app);

// socket.io setup
const io = new Server(server, {
    cors: {
        origin: "*",
    },
    maxHttpBufferSize: 1e7 // 10MB
});

// middlewares
app.use(cors());
app.use(express.json());

// [NEW] API to get unread counts
app.get("/api/unread/:userId", async (req, res) => {
  try {
    const counts = await Message.findAll({
      where: { receiverId: req.params.userId, isRead: false },
      attributes: ["senderId", [sequelize.fn("COUNT", sequelize.col("senderId")), "count"]],
      group: ["senderId"],
    });
    res.json(counts);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// [NEW] API to mark messages as read
app.post("/api/read", async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;
    await Message.update({ isRead: true }, { where: { senderId, receiverId, isRead: false } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// routes
app.use("/api/auth", authRoutes);

// test endpoint
app.get("/api/test", (req, res) => {
    res.send("Server is running");
});

// Temporary Route to Wipe DB
app.get("/api/auth/wipe-production-db-secure-991", async (req, res) => {
  try {
    await Message.destroy({ where: {}, truncate: true });
    await User.destroy({ where: {}, truncate: true });
    res.send("Database wiped successfully! Start fresh.");
  } catch (err) {
    res.status(500).send("Error wiping DB: " + err.message);
  }
});

// Serve static files from React build folder in production
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "../client/build")));

    app.use((req, res) => {
        res.sendFile(path.join(__dirname, "../client/build", "index.html"));
    });
}

// [MULTI-THREADING] إنشاء Thread موحد وقوي لمعالجة رسايل كل المستخدمين (Single Worker Mode)
const worker = new Worker(path.join(__dirname, "worker.js"));

// معالجة أخطاء الـ Worker لمنع سقوط السيرفر
worker.on("error", (err) => {
    console.error("Worker Thread Error:", err);
});

// استلام الرسالة بعد معالجتها داخل الـ Thread
worker.on("message", async (msg) => {
    if (msg.type === "message_processed") {
         const { senderId, receiverId, message, type } = msg.data;
         // Force type detection if missing
         const finalType = type || (message.startsWith("data:image") ? "image" : "text");
         
         try {
             // Save message to database first to get the ID
             const savedMsg = await Message.create({ 
                 senderId, 
                 receiverId, 
                 message, 
                 type: finalType 
             });
             
             const data = savedMsg.toJSON(); // Includes the ID from DB
             
             // Send to the receiver's room
             io.to(String(receiverId)).emit("receive_message", data);
             
             // Send back to the sender's room ONLY if it's different from receiver
             if (String(senderId) !== String(receiverId)) {
                 io.to(String(senderId)).emit("receive_message", data);
             }
         } catch (err) {
             console.error("Save/Emit error:", err);
         }
    }
});

// socket logic
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // register user
    socket.on("register_user", (userId) => {
        socket.join(String(userId));
        onlineUsers.set(String(userId), socket.id);
        socket.userId = String(userId);
        console.log(`User ${userId} registered`);
        
        // Broadcast current online users list to everyone
        io.emit("status_change", Array.from(onlineUsers.keys()));
    });

    socket.on("admin_deleted_user", (deletedId) => {
        io.emit("user_deleted", deletedId);
    });

    socket.on("clear_chat", (data) => {
        io.to(String(data.to)).emit("chat_cleared", { from: data.from });
    });

    // send message
    socket.on("send_message", (data) => {
        // [MULTI-THREADING] تفويض معالجة الرسالة للـ Worker Thread
        worker.postMessage({ type: "process_message", data });
    });

    socket.on("edit_message", async (data) => {
        try {
            const { messageId, newMessage, senderId, receiverId } = data;
            await Message.update({ message: newMessage }, { where: { id: messageId } });
            io.to(String(senderId)).to(String(receiverId)).emit("message_edited", { messageId, newMessage });
        } catch (err) { console.error("Edit error:", err); }
    });

    socket.on("delete_message", async (data) => {
        try {
            const { messageId, senderId, receiverId } = data;
            await Message.destroy({ where: { id: messageId } });
            io.to(String(senderId)).to(String(receiverId)).emit("message_deleted", { messageId });
        } catch (err) { console.error("Delete error:", err); }
    });

    socket.on("typing", (data) => {
        io.to(String(data.receiverId)).emit("typing", { senderId: data.senderId });
    });

    socket.on("stop_typing", (data) => {
        io.to(String(data.receiverId)).emit("stop_typing", { senderId: data.senderId });
    });

    socket.on("uploading_image", (data) => {
        io.to(String(data.receiverId)).emit("uploading_image", { senderId: data.senderId });
    });

    socket.on("stop_uploading", (data) => {
        io.to(String(data.receiverId)).emit("stop_uploading", { senderId: data.senderId });
    });

    // disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            io.emit("status_change", Array.from(onlineUsers.keys()));
        }
    });
});

// run server

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});