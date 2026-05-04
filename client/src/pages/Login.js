import { useState } from "react";
import axios from "axios";

function Login({ setUser }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetFields = () => {
    setUsername("");
    setPassword("");
    setError("");
    setSuccess("");
  };

  const switchMode = (m) => {
    setMode(m);
    resetFields();
  };

  const handleLogin = async () => {
    if (!username || !password) return setError("Please fill in all fields.");
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth/login", {
        username,
        password,
      });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setUser(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password) return setError("Please fill in all fields.");
    if (password.length < 4) return setError("Password must be at least 4 characters.");
    setLoading(true);
    setError("");
    try {
      await axios.post("/api/auth/register", {
        username,
        password,
      });
      setSuccess(`Account "${username}" created! You can now log in.`);
      setMode("login");
      setUsername(username);
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="d-flex vh-100 justify-content-center align-items-center"
      style={{ backgroundColor: "var(--bg-dark)", position: "relative", overflow: "hidden" }}
    >
      {/* Background glow blobs */}
      <div style={{
        position: "absolute", width: "400px", height: "400px",
        background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        top: "-100px", left: "-100px", borderRadius: "50%", pointerEvents: "none"
      }} />
      <div style={{
        position: "absolute", width: "300px", height: "300px",
        background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
        bottom: "-80px", right: "-80px", borderRadius: "50%", pointerEvents: "none"
      }} />

      <div className="glass-card login-card p-4 p-md-5" style={{ position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
            style={{ width: "60px", height: "60px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h4 className="fw-bold mb-0" style={{ color: "var(--text-main)" }}>ThreadChat</h4>
          <p className="small" style={{ color: "var(--text-muted)" }}>Multi-threaded real-time chat</p>
        </div>

        {/* Tabs */}
        <div className="d-flex mb-4 rounded-pill p-1" style={{ backgroundColor: "rgba(15,23,42,0.6)", border: "1px solid var(--border-color)" }}>
          <button
            className="flex-grow-1 border-0 py-2 rounded-pill fw-semibold transition"
            onClick={() => switchMode("login")}
            style={{
              background: mode === "login" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: mode === "login" ? "white" : "var(--text-muted)",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
          >
            Sign In
          </button>
          <button
            className="flex-grow-1 border-0 py-2 rounded-pill fw-semibold"
            onClick={() => switchMode("register")}
            style={{
              background: mode === "register" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
              color: mode === "register" ? "white" : "var(--text-muted)",
              transition: "all 0.3s ease",
              cursor: "pointer"
            }}
          >
            Register
          </button>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-3 px-3 py-2 rounded-3 small fw-medium d-flex align-items-center gap-2"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
            ✅ {success}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-3 px-3 py-2 rounded-3 small fw-medium"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
            ⚠️ {error}
          </div>
        )}

        <div className="mb-3">
          <label className="form-label small fw-bold mb-1" style={{ color: "var(--text-muted)", letterSpacing: "0.8px" }}>
            USERNAME
          </label>
          <input
            className="form-control border-0 text-white shadow-none"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
            style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "12px 15px" }}
          />
        </div>

        <div className="mb-4">
          <label className="form-label small fw-bold mb-1" style={{ color: "var(--text-muted)", letterSpacing: "0.8px" }}>
            PASSWORD
          </label>
          <input
            type="password"
            className="form-control border-0 text-white shadow-none"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
            style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "12px 15px" }}
          />
        </div>

        {/* Submit button */}
        <button
          className="btn btn-primary-custom w-100 py-2 fs-6 d-flex align-items-center justify-content-center gap-2"
          onClick={mode === "login" ? handleLogin : handleRegister}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" />
              {mode === "login" ? "Signing in..." : "Creating account..."}
            </>
          ) : (
            <>
              {mode === "login" ? "Sign In →" : "Create Account →"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default Login;