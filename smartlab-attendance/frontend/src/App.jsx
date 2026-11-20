import React, { useEffect, useState } from "react";
import * as faceapi from "face-api.js";
import {
  Camera,
  ScanFace,
  FileEdit,
  UserPlus,
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Server,
  Database,
  Menu,
  X,
  Clock,
  LogIn,
  LogOut,
  Sparkles,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import api from "./api";
import FaceScanner from "./components/FaceScanner";
import ManualAttendance from "./components/ManualAttendance";
import StudentRegistration from "./components/StudentRegistration";
import AdminDashboard from "./components/AdminDashboard";
import StudentDirectory from "./components/StudentDirectory";
import AttendanceReports from "./components/AttendanceReports";
import AdminLoginModal from "./components/AdminLoginModal";

const MODEL_URL = "/models";

export default function App() {
  const [tab, setTab] = useState("attendance");
  const [modelReady, setModelReady] = useState(false);
  const [modelStatus, setModelStatus] = useState("Loading Face AI Models...");
  const [serverStatus, setServerStatus] = useState({ connected: false, dbConnected: false, checking: true });
  const [user, setUser] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Check saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("smartlab_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("smartlab_user");
      }
    }
  }, []);

  // Live Clock updater
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load Face Recognition Models
  useEffect(() => {
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        setModelReady(true);
        setModelStatus("Face AI Ready");
      } catch (err) {
        console.warn("Face model loading warning:", err);
        setModelStatus("Face AI Models Missing in /models");
      }
    }
    loadModels();
  }, []);

  // Health check for backend and MongoDB
  async function checkHealth() {
    try {
      const { data } = await api.get("/health");
      setServerStatus({
        connected: true,
        dbConnected: Boolean(data.database?.connected),
        checking: false
      });
    } catch (err) {
      setServerStatus({
        connected: false,
        dbConnected: false,
        checking: false
      });
    }
  }

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-shell">
      {/* Mobile Top Navbar */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div className="mobile-brand">
          <div className="brand-logo">
            <ScanFace size={20} />
          </div>
          <span>SmartLab Portal</span>
        </div>
        <button className="mobile-admin-btn" onClick={() => setLoginModalOpen(true)}>
          <Shield size={18} />
        </button>
      </div>

      {/* Main Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand-section">
          <div className="brand-icon-box">
            <ScanFace size={24} />
          </div>
          <div className="brand-titles">
            <h2>SmartLab</h2>
            <span className="brand-subtitle">COLLEGE ATTENDANCE AI</span>
          </div>
        </div>

        <nav className="nav-menu">
          <div className="nav-group-label">ATTENDANCE STATION</div>

          <button
            className={`nav-btn ${tab === "attendance" ? "active" : ""}`}
            onClick={() => {
              setTab("attendance");
              setSidebarOpen(false);
            }}
          >
            <Camera size={18} />
            <span>Face Attendance</span>
            {modelReady && <span className="nav-pill ai">AI</span>}
          </button>

          <button
            className={`nav-btn ${tab === "manual" ? "active" : ""}`}
            onClick={() => {
              setTab("manual");
              setSidebarOpen(false);
            }}
          >
            <FileEdit size={18} />
            <span>Manual Attendance</span>
          </button>

          <button
            className={`nav-btn ${tab === "register" ? "active" : ""}`}
            onClick={() => {
              setTab("register");
              setSidebarOpen(false);
            }}
          >
            <UserPlus size={18} />
            <span>Student Registration</span>
          </button>

          <div className="nav-group-label">ADMIN & ANALYTICS</div>

          <button
            className={`nav-btn ${tab === "dashboard" ? "active" : ""}`}
            onClick={() => {
              setTab("dashboard");
              setSidebarOpen(false);
            }}
          >
            <LayoutDashboard size={18} />
            <span>Lab Dashboard</span>
          </button>

          <button
            className={`nav-btn ${tab === "reports" ? "active" : ""}`}
            onClick={() => {
              setTab("reports");
              setSidebarOpen(false);
            }}
          >
            <FileSpreadsheet size={18} />
            <span>Attendance Reports</span>
          </button>

          <button
            className={`nav-btn ${tab === "students" ? "active" : ""}`}
            onClick={() => {
              setTab("students");
              setSidebarOpen(false);
            }}
          >
            <Users size={18} />
            <span>Student Directory</span>
          </button>
        </nav>

        {/* Sidebar Footer System Health & Consent Info */}
        <div className="sidebar-footer">
          <div className="system-status-widget">
            <div className="status-row">
              <span className={`status-indicator ${modelReady ? "good" : "warning"}`} />
              <small>{modelStatus}</small>
            </div>
            <div className="status-row">
              <span className={`status-indicator ${serverStatus.dbConnected ? "good" : serverStatus.connected ? "warning" : "bad"}`} />
              <small>
                {serverStatus.dbConnected
                  ? "MongoDB Connected"
                  : serverStatus.connected
                  ? "DB Disconnected"
                  : "API Offline"}
              </small>
            </div>
          </div>

          <div className="privacy-sidebar-badge">
            <ShieldCheck size={14} />
            <span>Informed Consent Biometrics</span>
          </div>
        </div>
      </aside>

      {/* Main App Content Area */}
      <main className="main-viewport">
        {/* Top Header Bar */}
        <header className="main-topbar">
          <div className="topbar-title-block">
            <span className="college-header-pill">DEPARTMENT TECHNICAL LABORATORY</span>
            <h1>
              {tab === "attendance" && "Automated Face Attendance"}
              {tab === "manual" && "Manual Lab Attendance Override"}
              {tab === "register" && "Student Biometric Enrollment"}
              {tab === "dashboard" && "Laboratory Control Center"}
              {tab === "reports" && "Attendance Reports & Export"}
              {tab === "students" && "Enrolled Students Directory"}
            </h1>
          </div>

          <div className="topbar-actions">
            {/* Live Clock */}
            <div className="live-clock-card">
              <Clock size={15} />
              <span>{currentTime.toLocaleTimeString()}</span>
            </div>

            {/* Admin Login / Profile Button */}
            {user ? (
              <button className="admin-profile-pill" onClick={() => setLoginModalOpen(true)}>
                <div className="admin-avatar-small">
                  <Shield size={14} />
                </div>
                <div className="admin-text">
                  <b>{user.name}</b>
                  <small>Administrator</small>
                </div>
              </button>
            ) : (
              <button className="btn btn-outline-admin" onClick={() => setLoginModalOpen(true)}>
                <Shield size={15} />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </header>

        {/* Database Offline Warning Banner if DB is not connected */}
        {!serverStatus.checking && !serverStatus.dbConnected && (
          <div className="db-alert-banner">
            <AlertCircle size={18} />
            <div>
              <b>Database Disconnected:</b> MongoDB is not running on <code>127.0.0.1:27017</code> or your configured Atlas connection.
              <span> Please run <code>mongod</code> or configure <code>MONGODB_URI</code> in <code>backend/.env</code>.</span>
            </div>
          </div>
        )}

        {/* Tab View Router */}
        <div className="tab-viewport">
          {tab === "attendance" && (
            <FaceScanner
              modelReady={modelReady}
              onSwitchToManual={() => setTab("manual")}
            />
          )}

          {tab === "manual" && (
            <ManualAttendance
              onAttendanceChanged={() => {}}
            />
          )}

          {tab === "register" && (
            <StudentRegistration
              modelReady={modelReady}
              onStudentRegistered={() => setTab("students")}
            />
          )}

          {tab === "dashboard" && (
            <AdminDashboard
              onNavigate={(targetTab) => setTab(targetTab)}
            />
          )}

          {tab === "reports" && (
            <AttendanceReports
              user={user}
              onRequireLogin={() => setLoginModalOpen(true)}
            />
          )}

          {tab === "students" && (
            <StudentDirectory
              user={user}
              onRequireLogin={() => setLoginModalOpen(true)}
            />
          )}
        </div>

        {/* Page Footer */}
        <footer className="portal-footer">
          <div>
            <b>SmartLab Attendance Portal</b> · College Technical Laboratory System
          </div>
          <small>
            Powered by Face-API.js, React, Node.js & MongoDB · Built with Biometric Privacy by Design
          </small>
        </footer>
      </main>

      {/* Admin Authentication Modal */}
      <AdminLoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        user={user}
        setUser={setUser}
      />
    </div>
  );
}
