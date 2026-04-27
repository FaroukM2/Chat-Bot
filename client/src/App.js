import { useState } from "react";
import Chat from "./Chat";
import Login from "./pages/Login";

function App() {
  // لا نقرأ من localStorage تلقائياً — المستخدم يسجّل دخوله يدوياً كل مرة
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  return (
    <>
      {!user ? (
        <Login setUser={setUser} />
      ) : (
        <Chat user={user} onLogout={handleLogout} />
      )}
    </>
  );
}

export default App;