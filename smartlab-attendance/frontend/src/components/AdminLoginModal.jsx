import React, { useState } from "react";
import { Shield, KeyRound, Mail, X, LogIn, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../api";

export default function AdminLoginModal({ isOpen, onClose, user, setUser, onLoginSuccess }) {
  const [email, setEmail] = useState("admin@smartlab.edu");
  const [password, setPassword] = useState("Admin@12345");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!isOpen) return null;

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("smartlab_token", data.token);
      localStorage.setItem("smartlab_user", JSON.stringify(data.user));
      setUser(data.user);
      setSuccess("Logged in successfully as Administrator.");
      if (onLoginSuccess) onLoginSuccess(data.user);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to log in. Check credentials and server.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("smartlab_token");
    localStorage.removeItem("smartlab_user");
    setUser(null);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <div className="modal-icon-badge">
              <Shield size={20} />
            </div>
            <div>
              <h3>Admin Authentication</h3>
              <p>Role-Based Lab Control & Management</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {user ? (
          <div className="logged-in-box">
            <div className="avatar-large">
              <Shield size={32} />
            </div>
            <h4>{user.name}</h4>
            <span className="role-tag admin">Role: {user.role?.toUpperCase()}</span>
            <p className="user-email">{user.email}</p>
            <div className="admin-perm-list">
              <div>✓ View live occupancy & reports</div>
              <div>✓ Export CSV / Excel logs</div>
              <div>✓ Student directory & consent revocation</div>
              <div>✓ Manual attendance override</div>
            </div>
            <button className="btn btn-danger full-width" onClick={handleLogout}>
              Log out of Admin
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div className="alert-box error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert-box success">
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </div>
            )}

            <div className="input-group">
              <label>Administrator Email</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@smartlab.edu"
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-wrap">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="demo-hint-box">
              <small>
                Default Credentials: <b>admin@smartlab.edu</b> / <b>Admin@12345</b>
              </small>
            </div>

            <button type="submit" className="btn btn-primary full-width" disabled={loading}>
              {loading ? "Authenticating..." : <><LogIn size={16} /> Sign in as Admin</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
