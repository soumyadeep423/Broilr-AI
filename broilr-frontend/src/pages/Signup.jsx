// src/pages/Signup.jsx
import "../App.css"; 
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    setMessage("");
    if (!username || !password) {
            setMessage("❌ All fields are required.");
            return;
    }
    const res = await api.post("/signup", { username, password });
    if (res.data.success) {
      setMessage("✅ Signup successful! Redirecting...");
      setTimeout(() => navigate("/"), 2000);
    } else {
      setMessage(`❌ ${res.data.error}`);
    }
  };

  return (
    <div className="container" style={formContainer}>
      <h2>📝 Signup</h2>
      <input placeholder="Username" onChange={e => setUsername(e.target.value)} style={inputStyle} />
      <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={inputStyle} />
      {message && <p style={messageStyle}>{message}</p>}
      <button onClick={handleSignup} style={buttonStyle}>Sign Up</button>
    </div>
  );
}
const messageStyle = { color: "#FFD700", textAlign: "center" };
const buttonStyle = { width: "100%", padding: "10px", fontSize: "16px", backgroundColor: "#007BFF", color: "#fff", border: "none", cursor: "pointer", borderRadius: "5px" };
const inputStyle = { width: "93%", padding: "10px", fontSize: "16px", borderRadius: "5px", border: "1px solid #555", backgroundColor: "#2E2E2E", color: "#E0E0E0", marginBottom: "10px" };
const formContainer = { padding: "40px", borderRadius: "8px", boxShadow: "0px 4px 10px rgba(255, 255, 255, 0.2)", textAlign: "center", backgroundColor: "#1E1E1E", color: "#E0E0E0", width: "300px" };

export default Signup;
