import { useState } from "react";
import Chat from "./Chat";
import Login from "./pages/Login";

function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <>
      {!user ? (
        <Login setUser={setUser} />
      ) : (
        <Chat user={user} onLogout={handleLogout} setUser={setUser} />
      )}
    </>
  );
}

export default App;