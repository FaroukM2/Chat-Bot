const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Worker } = require("worker_threads");
const cors = require("cors");
require("dotenv").config();

const sequelize = require("./config/database");
const authRoutes = require("./routes/authRoutes");

// store connected users (userId -> socketId)
const users = {};

const app = express();

// database connection
sequelize.sync()
    .then(() => console.log("Database connected"))
    .catch((err) => console.log("DB Error:", err));

// create HTTP server
const server = http.createServer(app);

// socket.io setup
const io = new Server(server, {
    cors: {
        origin: "*",
    },
});

// middlewares
app.use(cors());
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);

// test endpoint
app.get("/", (req, res) => {
    res.send("Server is running");
});

// socket logic
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // [MULTI-THREADING] إنشـاء Thread فرعي خاص لكل مستخدم يتصل
    const worker = new Worker("./worker.js");
    
    // استلام الرسالة بعد معالجتها داخل الـ Thread الفرعي
    worker.on("message", (msg) => {
        if (msg.type === "message_processed") {
             const data = msg.data;
             const { senderId, receiverId, message } = data;
             
             const receiverSocket = users[receiverId];
             
             // send to receiver
             if (receiverSocket) {
                 io.to(receiverSocket).emit("receive_message", data);
             }
             
             // optional: send back to sender (sync UI)
             const senderSocket = users[senderId];
             if (senderSocket) {
                 io.to(senderSocket).emit("receive_message", data);
             }
        }
    });

    // register user
    socket.on("register_user", (userId) => {
        users[userId] = socket.id;
        console.log(`User ${userId} connected`);
    });

    // send message
    socket.on("send_message", (data) => {
        // [MULTI-THREADING] تفويض معالجة الرسالة للـ Worker Thread
        worker.postMessage({ type: "process_message", data });
    });

    // disconnect
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        
        // إغلاق الـ Thread الخاص بالمستخدم عند خروجه لتوفير الموارد
        worker.terminate(); 

        for (let userId in users) {
            if (users[userId] === socket.id) {
                delete users[userId];
                console.log(`User ${userId} removed`);
                break;
            }
        }
    });
});

// run server
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});