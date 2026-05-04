import { useState } from "react";
import axios from "axios";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await axios.post(url, { username, password });
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vh-100 d-flex align-items-center justify-content-center px-3" 
         style={{ background: "radial-gradient(circle at top right, #1e1b4b, #0f172a)" }}>
      
      <div className="auth-card">
        <div className="text-center mb-5">
          <div className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3" 
               style={{ width: "64px", height: "64px", background: "linear-gradient(135deg, #6366f1, #a855f7)", boxShadow: "0 8px 24px rgba(99, 102, 241, 0.4)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <h2 className="fw-bold mb-1">{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p className="text-muted small">The ultimate multi-threaded chat experience</p>
        </div>

        {error && <div className="alert alert-danger py-2 small border-0 mb-4" style={{ backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="form-label small fw-bold text-muted mb-2">USERNAME</label>
            <input
              type="text"
              className="form-control input-custom"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-5">
            <label className="form-label small fw-bold text-muted mb-2">PASSWORD</label>
            <input
              type="password"
              className="form-control input-custom"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary-custom w-100 mb-4 py-3 d-flex align-items-center justify-content-center gap-2" disabled={loading}>
            {loading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <>
                <span className="fw-bold">{isLogin ? "Sign In" : "Get Started"}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <p className="text-muted small">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="btn btn-link p-0 text-decoration-none fw-bold"
              style={{ color: "var(--primary)", fontSize: "0.875rem" }}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;
