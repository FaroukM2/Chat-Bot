import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const socket = io({ transports: ["websocket"], upgrade: false });

function Chat({ user, onLogout, setUser }) {
  const userId = user.id;

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [hiddenUserIds, setHiddenUserIds] = useState(() => {
    const saved = localStorage.getItem("hiddenUsers");
    return saved ? JSON.parse(saved) : [];
  });
  const [unreadCounts, setUnreadCounts] = useState({});
  const [deletedUserIds, setDeletedUserIds] = useState(() => {
      const saved = localStorage.getItem(`deleted_${userId}`);
      return saved ? JSON.parse(saved) : [];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [otherIsUploading, setOtherIsUploading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("hiddenUsers", JSON.stringify(hiddenUserIds));
  }, [hiddenUserIds]);

  useEffect(() => {
    if (selectedUser) {
      const fetchHistory = async () => {
        try {
          const res = await axios.get(`/api/auth/messages?user1=${userId}&user2=${selectedUser.id}`);
          setMessages(res.data);
        } catch (error) { console.error(error); }
      };
      fetchHistory();
    } else { setMessages([]); }
  }, [selectedUser, userId]);

  const fetchUsers = async () => {
    try {
      const [uRes, unreadRes] = await Promise.all([
        axios.get(`/api/auth/users?userId=${userId}`),
        axios.get(`/api/unread/${userId}`)
      ]);
      setUsers(uRes.data);
      const counts = {};
      unreadRes.data.forEach(item => counts[item.senderId] = item.count);
      setUnreadCounts(counts);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (userId) fetchUsers(); }, [userId]);

  useEffect(() => {
    if (!userId) return;
    socket.emit("register_user", userId);

    socket.on("status_change", (list) => { setOnlineUsers(list); });
    socket.on("user_deleted", () => { fetchUsers(); setSelectedUser(null); });
    socket.on("chat_cleared", (data) => { if (selectedUser && String(data.from) === String(selectedUser.id)) setMessages([]); });
    
    socket.on("receive_message", (data) => {
      const sId = String(data.senderId);
      setHiddenUserIds(prev => prev.filter(id => String(id) !== sId));
      setDeletedUserIds(prev => {
          const newDeleted = prev.filter(id => String(id) !== sId);
          localStorage.setItem(`deleted_${userId}`, JSON.stringify(newDeleted));
          return newDeleted;
      });
      if (selectedUser && String(data.senderId) === String(selectedUser.id)) {
          axios.post("/api/read", { senderId: selectedUser.id, receiverId: userId });
          socket.emit("stop_typing", { senderId: userId, receiverId: selectedUser.id });
      } else if (String(data.senderId) !== String(userId)) {
          setUnreadCounts(prev => ({ ...prev, [data.senderId]: (prev[data.senderId] || 0) + 1 }));
      }
      if (selectedUser && 
         ((String(data.senderId) === String(userId) && String(data.receiverId) === String(selectedUser.id)) ||
          (String(data.senderId) === String(selectedUser.id) && String(data.receiverId) === String(userId)))) {
        setMessages((prev) => [...prev, data]);
      }
    });

    socket.on("message_edited", ({ messageId, newMessage }) => {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, message: newMessage } : m));
    });

    socket.on("message_deleted", ({ messageId }) => {
        setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socket.on("typing", (data) => {
        if (selectedUser && String(data.senderId) === String(selectedUser.id)) setIsTyping(true);
    });

    socket.on("stop_typing", (data) => {
        if (selectedUser && String(data.senderId) === String(selectedUser.id)) setIsTyping(false);
    });

    socket.on("uploading_image", (data) => {
        if (selectedUser && String(data.senderId) === String(selectedUser.id)) setOtherIsUploading(true);
    });

    socket.on("stop_uploading", (data) => {
        if (selectedUser && String(data.senderId) === String(selectedUser.id)) setOtherIsUploading(false);
    });

    socket.on("username_updated", () => { fetchUsers(); });

    return () => {
       socket.off("user_online"); socket.off("user_deleted");
       socket.off("chat_cleared"); socket.off("receive_message");
       socket.off("message_edited"); socket.off("message_deleted");
       socket.off("typing"); socket.off("stop_typing"); socket.off("username_updated");
    };
  }, [selectedUser, userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleInputChange = (e) => {
      setMessage(e.target.value);
      if(!selectedUser) return;
      socket.emit("typing", { senderId: userId, receiverId: selectedUser.id });
      if(typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
          socket.emit("stop_typing", { senderId: userId, receiverId: selectedUser.id });
      }, 2000);
  };

  const sendImage = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser) return;
    setIsUploading(true);
    socket.emit("uploading_image", { senderId: userId, receiverId: selectedUser.id });
    const reader = new FileReader();
    reader.onload = () => {
      const data = { senderId: userId, receiverId: selectedUser.id, message: reader.result, type: "image" };
      setHiddenUserIds(prev => prev.filter(id => String(id) !== String(selectedUser.id)));
      socket.emit("send_message", data);
      setIsUploading(false);
      socket.emit("stop_uploading", { senderId: userId, receiverId: selectedUser.id });
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = () => {
    if (!message || !selectedUser) return;
    const data = { senderId: userId, receiverId: selectedUser.id, message, type: "text" };
    setHiddenUserIds(prev => prev.filter(id => String(id) !== String(selectedUser.id)));
    socket.emit("send_message", data);
    socket.emit("stop_typing", { senderId: userId, receiverId: selectedUser.id });
    setMessage("");
  };

  const handleMessageAction = (msg) => {
      const isMe = String(msg.senderId) === String(userId);
      if(!isMe) return;
      const action = window.confirm("Options:\n[OK] Edit Message\n[Cancel] Delete for Everyone") ? "edit" : "delete";
      if(action === "edit") {
          if(msg.type !== "text") return;
          const newText = window.prompt("Edit:", msg.message);
          if(newText) socket.emit("edit_message", { messageId: msg.id, newMessage: newText, senderId: userId, receiverId: selectedUser.id });
      } else {
          socket.emit("delete_message", { messageId: msg.id, senderId: userId, receiverId: selectedUser.id });
      }
  };

  const updateOwnName = async () => {
      const newName = window.prompt("New username:", user.username);
      if(newName) {
          try {
              const res = await axios.put(`/api/auth/users/${userId}`, { username: newName });
              const updatedUser = { ...user, username: res.data.user.username };
              localStorage.setItem("user", JSON.stringify(updatedUser));
              setUser(updatedUser);
              socket.emit("username_updated", userId);
          } catch(err) { alert("Error"); }
      }
  };

  const selectUser = (u) => {
      setSelectedUser(u);
      setIsTyping(false);
      setShowSidebar(false); // Hide sidebar on mobile when user selected
      setUnreadCounts(prev => { const n = {...prev}; delete n[u.id]; return n; });
      axios.post("/api/read", { senderId: u.id, receiverId: userId });
  };

  const deleteAccount = async () => {
      if(window.confirm("ARE YOU SURE? This will permanently delete your account and all messages!")) {
          try {
              await axios.delete(`/api/auth/users/${userId}`);
              onLogout();
          } catch(err) { alert("Error deleting account"); }
      }
  };

  const deleteChat = async (u) => {
      if(window.confirm(`Delete all messages with ${u.username}?`)) {
          try {
              await axios.delete(`/api/auth/messages?user1=${userId}&user2=${u.id}`);
              setMessages([]);
              setDeletedUserIds(prev => {
                  const newDeleted = [...new Set([...prev, String(u.id)])];
                  localStorage.setItem(`deleted_${userId}`, JSON.stringify(newDeleted));
                  return newDeleted;
              });
              if(selectedUser?.id === u.id) setSelectedUser(null);
          } catch(err) { console.error(err); }
      }
  };

  const visibleUsers = users.filter(u => {
      const uIdStr = String(u.id);
      if (uIdStr === String(userId)) return false;
      if (hiddenUserIds.includes(uIdStr)) return false;
      if (deletedUserIds.includes(uIdStr)) return false;
      
      // If searching, show matching users
      if (searchTerm.trim()) {
          return u.username.toLowerCase().includes(searchTerm.toLowerCase());
      }
      
      // Otherwise, show only users with messages (Active Chats)
      // or the currently selected user
      const hasMessages = messages.some(m => String(m.senderId) === String(u.id) || String(m.receiverId) === String(u.id));
      // Note: We need a better way to check "has messages" since 'messages' state only holds history of selectedUser.
      // We'll rely on the unreadCounts or a flag from the server, but for now let's use a simpler heuristic:
      // Show if unread > 0 OR if we explicitly want to see everyone (default for now until we have 'conversations' endpoint)
      return true; // Keep true for now, but focus on the search and hidden persistence
  });

  return (
    <div className="container-fluid vh-100 p-0 overflow-hidden" style={{ fontSize: "1.05rem" }}>
      <div className="row h-100 g-0 flex-nowrap position-relative">
        
        {/* Sidebar */}
        <div className={`col-md-3 d-flex flex-column sidebar-panel shadow-lg ${showSidebar ? 'show-mobile' : 'hide-mobile'}`}>
          <div className="p-4 border-bottom glass-panel" style={{ borderColor: "var(--border-color) !important" }}>
            <div className="profile-card p-3 shadow-sm position-relative overflow-hidden">
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <div className="user-avatar shadow-lg" style={{ width: "55px", height: "55px", border: "2px solid var(--primary)" }}>{user.username.charAt(0).toUpperCase()}</div>
                  <div className="cursor-pointer" onClick={updateOwnName}>
                    <div className="fw-bold text-white d-flex align-items-center gap-2" style={{ fontSize: "1.1rem" }}>
                        {user.username}
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </div>
                    <div className="text-success x-small d-flex align-items-center gap-1" style={{ fontWeight: "600" }}>
                      <div className="rounded-circle bg-success animate-pulse" style={{width: "8px", height: "8px"}}></div>
                      {onlineUsers.includes(String(userId)) ? "Online Now" : "Offline"}
                    </div>
                  </div>
                </div>
                <div className="d-flex flex-column gap-2 align-items-end">
                   <button onClick={deleteAccount} className="btn btn-sm p-0 text-danger opacity-40 hover-100" title="Delete Account">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                   </button>
                </div>
               </div>
            </div>
          </div>
          
          <div className="px-4 py-3">
             <div className="position-relative">
                <input 
                  type="text" 
                  className="form-control text-white rounded-pill ps-5 shadow-none" 
                  placeholder="Search people..." 
                  style={{ 
                    fontSize: "0.85rem", 
                    height: "42px", 
                    background: "rgba(255,255,255,0.03)", 
                    border: "1px solid rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)"
                  }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="position-absolute translate-middle-y top-50 start-0 ms-3 text-muted opacity-75" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
             </div>
          </div>

          <div className="p-3 flex-grow-1" style={{ overflowY: "auto" }}>
            <div className="d-flex justify-content-between align-items-center mb-4 px-3">
               <div className="fw-bold" style={{ letterSpacing: "1px", fontSize: "0.85rem", color: "var(--primary)" }}>CHATS</div>
               <div className="d-flex gap-2">
                 {hiddenUserIds.length > 0 && <button onClick={() => setHiddenUserIds([])} className="btn btn-sm p-0 border-0 text-warning x-small">Show Hidden</button>}
                 <button onClick={fetchUsers} className="btn btn-sm p-0 border-0 text-muted"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></button>
               </div>
            </div>
            {visibleUsers.map((u) => (
              <div key={u.id} className={`user-item d-flex align-items-center justify-content-between ${selectedUser?.id === u.id ? "active" : ""}`} onClick={() => selectUser(u)}>
                <div className="d-flex align-items-center gap-3">
                  <div className="user-avatar shadow-sm" style={{ width: "48px", height: "48px", fontSize: "1.1rem", position: "relative" }}>
                    {u.username.charAt(0).toUpperCase()}
                    {unreadCounts[u.id] > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-dark" style={{ fontSize: "0.65rem" }}>{unreadCounts[u.id]}</span>}
                    <div className={`position-absolute bottom-0 end-0 rounded-circle border border-dark ${onlineUsers.includes(String(u.id)) ? 'bg-success' : 'bg-secondary'}`} style={{ width: "12px", height: "12px" }}></div>
                  </div>
                  <div>
                    <span className="fw-bold text-white d-block">{u.username}</span>
                    <span className={onlineUsers.includes(String(u.id)) ? "text-success x-small" : "text-muted x-small"}>
                      {onlineUsers.includes(String(u.id)) ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                   <button className="btn btn-sm p-0 border-0 text-info opacity-50 hover-100" title="Hide Chat" onClick={(e) => { e.stopPropagation(); setHiddenUserIds(prev => [...prev, String(u.id)]); if(selectedUser?.id === u.id) setSelectedUser(null); }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                   </button>
                   <button className="btn btn-sm p-0 border-0 text-danger opacity-50 hover-100" title="Delete Chat" onClick={(e) => { e.stopPropagation(); deleteChat(u); }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path></svg>
                   </button>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer - Logout only */}
          <div className="mt-auto p-3 glass-panel" style={{ background: "rgba(15,23,42,0.4)" }}>
             <div className="d-flex align-items-center justify-content-center">
                <button onClick={onLogout} className="btn btn-sm px-4 rounded-pill d-flex align-items-center gap-2" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.05)", height: "40px" }}>
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                   Logout
                </button>
             </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className={`col-md-9 d-flex flex-column chat-panel position-relative ${!showSidebar ? 'show-mobile' : 'hide-mobile'}`} style={{ backgroundImage: "url('https://i.pinimg.com/originals/ab/ab/60/abab60f01fc633230a6237f3796d1e44.jpg')", backgroundSize: "cover", height: "100vh" }}>
          {selectedUser && (
            <div className="p-3 d-flex align-items-center glass-panel shadow-sm sticky-top" style={{ minHeight: "85px", zIndex: 1000, borderBottom: "1px solid var(--border-color)" }}>
                <div className="fade-in d-flex align-items-center w-100">
                   {/* Back Button for Mobile */}
                   <button className="btn btn-link text-white me-2 d-md-none p-0" onClick={() => setShowSidebar(true)}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                   </button>
                   <div className="user-avatar me-3" style={{ width: "52px", height: "52px" }}>{selectedUser.username.charAt(0).toUpperCase()}</div>
                  <div>
                     <h5 className="mb-0 fw-bold text-white">{selectedUser.username}</h5>
                     <div className="small d-flex align-items-center gap-1 fw-bold">
                        {isTyping ? <span className="text-warning italic animate-pulse">typing...</span> : 
                         otherIsUploading ? <span className="text-info italic animate-pulse">sending image... 📸</span> :
                         onlineUsers.includes(String(selectedUser.id)) ? (
                           <><div className="rounded-circle bg-success" style={{width: "6px", height: "6px"}}></div> <span className="text-success x-small">Online Now</span></>
                         ) : (
                           <><div className="rounded-circle bg-secondary" style={{width: "6px", height: "6px"}}></div> <span className="text-muted x-small">Offline</span></>
                         )}
                     </div>
                  </div>
                  <button className="btn btn-sm ms-auto rounded-pill px-3" onClick={async () => { if(window.confirm("Clear all messages?")) { try { await axios.delete(`/api/auth/messages?user1=${userId}&user2=${selectedUser.id}`); setMessages([]); socket.emit("clear_chat", { from: userId, to: selectedUser.id }); } catch(err) {} } }} style={{ fontSize: "0.75rem", background: "rgba(234, 179, 8, 0.15)", color: "#fbbf24", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
                    Clear History 🧹
                  </button>
                </div>
            </div>
          )}

          <div className="flex-grow-1 p-4 d-flex flex-column" style={{ overflowY: "auto", background: "rgba(15, 23, 42, 0.7)" }}>
            {selectedUser ? (
              <>
                {messages.map((msg, i) => {
                  const isMe = String(msg.senderId) === String(userId);
                  const isImg = msg.type === "image" || (msg.message && (msg.message.startsWith("data:image") || msg.message.length > 500));
                  let imgSrc = msg.message;
                  if (isImg && msg.message && !msg.message.startsWith("data:image")) {
                      imgSrc = `data:image/png;base64,${msg.message}`;
                  }
                  return (
                    <div key={i} className={`d-flex mb-3 fade-in ${isMe ? "justify-content-end" : "justify-content-start"}`}>
                      <div className={`message-bubble ${isMe ? 'message-me' : 'message-them'} ${isMe ? 'cursor-pointer' : ''}`} onClick={() => handleMessageAction(msg)} style={{ position: "relative" }}>
                        {isImg ? (
                          <img src={imgSrc} alt="sent" style={{ maxWidth: "100%", borderRadius: "12px", display: "block", marginBottom: "5px", minWidth: "150px", maxHeight: "300px", objectFit: "cover" }} />
                        ) : (
                          <span style={{ paddingRight: "40px", wordBreak: "break-word" }}>{msg.message}</span>
                        )}
                        <div className="message-time" style={{ fontSize: "0.65rem", opacity: 0.6, textAlign: "right", marginTop: "4px" }}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef}></div>
              </>
            ) : (
              <div className="m-auto text-center opacity-30 fade-in text-white" style={{ maxWidth: "250px" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" className="mb-3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  <p className="fw-light small mb-0" style={{ letterSpacing: "0.5px" }}>Select a contact to start messaging</p>
              </div>
            )}
          </div>

          {selectedUser && (
            <div className="p-3 p-md-4" style={{ background: "rgba(15, 23, 42, 0.85)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {isUploading && (
                <div className="d-flex align-items-center gap-2 text-warning small mb-3 animate-pulse px-3">
                  <div className="spinner-border spinner-border-sm" role="status"></div>
                  <span className="fw-bold">Sending Image... 📸</span>
                </div>
              )}
              <div className="d-flex gap-2 align-items-center p-2 rounded-pill shadow-lg glass-panel chat-input-bar" style={{ border: "1px solid rgba(255,255,255,0.1)", minHeight: "48px" }}>
                <label className="btn btn-link text-info rounded-circle d-flex align-items-center justify-content-center p-0 m-0" style={{ cursor: "pointer", width: "38px", height: "38px", minWidth: "38px", background: "rgba(34, 211, 238, 0.1)" }}>
                   <input type="file" hidden accept="image/*" onChange={sendImage} />
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </label>
                <input 
                  type="text" 
                  className="form-control bg-transparent border-0 text-white shadow-none py-1" 
                  placeholder="Type a message..." 
                  style={{ fontSize: "0.95rem" }}
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); socket.emit("typing", { senderId: userId, receiverId: selectedUser.id }); }}
                  onBlur={() => socket.emit("stop_typing", { senderId: userId, receiverId: selectedUser.id })}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button 
                  className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center p-0 shadow-lg" 
                  onClick={sendMessage} 
                  style={{ width: "38px", height: "38px", minWidth: "38px", background: "var(--primary)", border: "none" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" style={{ transform: "rotate(0deg) translate(1px, 0px)" }}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
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