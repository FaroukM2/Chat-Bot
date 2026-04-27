import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const socket = io("http://localhost:5000");

function Chat({ user, onLogout }) {
  const userId = user.id;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const bottomRef = useRef(null);

  // fetch users (exclude current user)
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await axios.get(
        `http://localhost:5000/api/auth/users?userId=${userId}`
      );
      setUsers(res.data);
    };

    if (userId) fetchUsers();
  }, [userId]);

  // register socket user
  useEffect(() => {
    if (userId) {
      socket.emit("register_user", userId);
    }
  }, [userId]);

  // receive messages
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => socket.off("receive_message");
  }, []);

  // auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // send message
  const sendMessage = () => {
    if (!message || !selectedUser) return;

    const data = {
      senderId: userId,
      receiverId: selectedUser.id,
      message,
    };

    socket.emit("send_message", data);
    // لا نضيف الرسالة محلياً لأن السيرفر سيرسلها مرة أخرى عبر receive_message
    setMessage("");
  };

  return (
    <div className="container-fluid vh-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: "var(--bg-dark)"}}>
      <div className="glass-card d-flex w-100 mx-3 mx-lg-5" style={{ height: "85vh", maxWidth: "1300px", overflow: "hidden" }}>

        {/* Sidebar */}
        <div className="border-end d-flex flex-column shadow-sm" style={{ width: "320px", borderColor: "var(--border-color) !important", backgroundColor: "rgba(30, 41, 59, 0.4)" }}>
          <div className="p-4 border-bottom d-flex align-items-center justify-content-between" style={{ borderColor: "var(--border-color) !important" }}>
            <span className="fw-bold fs-4">Chats ✨</span>
            <div className="d-flex align-items-center gap-2">
              <div className="d-flex align-items-center gap-2 px-3 py-1 rounded-pill" style={{ backgroundColor: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                <div className="rounded-circle bg-success" style={{width: "8px", height: "8px"}}></div>
                <span className="fw-bold text-white small">{user.username}</span>
              </div>
              <button
                onClick={onLogout}
                title="Logout"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "8px",
                  color: "#f87171",
                  padding: "4px 10px",
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: "600",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(239,68,68,0.3)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
              >
                Exit
              </button>
            </div>
          </div>

          <div className="p-3 flex-grow-1" style={{ overflowY: "auto" }}>
            <div className="text-muted small fw-bold mb-3 px-2" style={{ letterSpacing: "1px" }}>ONLINE USERS</div>
            {users.map((u) => (
              <div
                key={u.id}
                className={`p-3 d-flex align-items-center user-item ${
                  selectedUser?.id === u.id ? "active" : ""
                }`}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedUser(u)}
              >
                <div className="rounded-circle me-3 flex-shrink-0" style={{ width: "45px", height: "45px", backgroundColor: "var(--border-color)", display: "flex", alignItems:"center", justifyContent:"center", fontWeight:"bold", fontSize: "1.2rem", color: "white" }}>
                   {u.username.charAt(0).toUpperCase()}
                </div>
                <div className="fw-medium fs-6 text-truncate">{u.username}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-grow-1 d-flex flex-column position-relative" style={{ backgroundColor: "rgba(15, 23, 42, 0.3)"}}>

          {/* Header */}
          <div className="border-bottom p-4 d-flex align-items-center bg-transparent" style={{ borderColor: "var(--border-color) !important", minHeight: "85px", backdropFilter: "blur(10px)" }}>
            {selectedUser ? (
              <>
                 <div className="rounded-circle me-3 shadow-sm" style={{ width: "45px", height: "45px", background: "linear-gradient(135deg, var(--primary), #8b5cf6)", display: "flex", alignItems:"center", justifyContent:"center", fontWeight:"bold", fontSize: "1.3rem" }}>
                   {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                   <h5 className="mb-0 fw-bold">{selectedUser.username}</h5>
                   <small className="text-success fw-bold d-flex align-items-center gap-1">
                      <div className="rounded-circle bg-success" style={{width: "6px", height: "6px"}}></div>
                      Active Now
                   </small>
                </div>
              </>
            ) : (
              <div className="mx-auto text-center opacity-50">
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                 <h5 className="mb-0 fw-medium">Select a user to start a conversation</h5>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-grow-1 p-4" style={{ overflowY: "auto" }}>
            {messages.map((msg, i) => {
              const isMe = String(msg.senderId) === String(userId);

              return (
                <div
                  key={i}
                  className={`d-flex mb-3 ${
                    isMe ? "justify-content-end" : "justify-content-start"
                  }`}
                >
                  <div className={`message-bubble ${isMe ? 'message-me' : 'message-them'}`}>
                    {msg.message}
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef}></div>
          </div>

          {/* Input */}
          {selectedUser && (
            <div className="p-4 border-top" style={{ borderColor: "var(--border-color) !important", backgroundColor: "rgba(30, 41, 59, 0.4)", backdropFilter: "blur(10px)" }}>
              <div className="d-flex gap-3 align-items-center p-1 rounded-pill shadow-sm" style={{ backgroundColor: "var(--bg-panel)", border: "1px solid var(--border-color)" }}>
                <input
                  className="form-control border-0 bg-transparent px-4 shadow-none custom-input-field"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  style={{ color: "white", outline: "none", boxShadow: "none" }}
                />

                <style>{`
                  .custom-input-field:focus { box-shadow: none !important; border: transparent !important; background-color: transparent !important }
                `}</style>

                <button 
                  className="btn btn-primary-custom rounded-pill px-4 py-2 me-1 d-flex align-items-center gap-2" 
                  onClick={sendMessage}
                >
                  <span className="fw-bold">Send</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Chat;