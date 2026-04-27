import { useState } from "react";
import axios from "axios";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/register",
        {
          username,
          password,
        }
      );

      alert("User created");

      // نحفظ اليوزر
      localStorage.setItem("user", JSON.stringify(res.data.user));

      window.location.href = "/";
    } catch (err) {
      alert(err.response?.data?.error || "Error");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow col-4 mx-auto">
        <h3 className="text-center">Register</h3>

        <input
          className="form-control mb-2"
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          className="form-control mb-3"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="btn btn-primary" onClick={handleRegister}>
          Register
        </button>
      </div>
    </div>
  );
}

export default Register;