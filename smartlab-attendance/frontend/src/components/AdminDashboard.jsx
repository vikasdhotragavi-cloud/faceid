import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Clock,
  Activity,
  Calendar,
  Building,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldAlert,
  LogIn,
  LogOut
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import api from "../api";
import { exportRecordsToCSV } from "../utils/exportCsv";

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function fetchDashboardData() {
    setError("");
    try {
      const [statsRes, activeRes] = await Promise.all([
        api.get("/attendance/stats"),
        api.get("/attendance?status=INSIDE&limit=50")
      ]);
      setStats(statsRes.data);
      setActiveSessions(activeRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // Poll every 15s for live lab occupancy
    return () => clearInterval(interval);
  }, []);

  async function handleExportToday() {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await api.get(`/attendance?startDate=${today}`);
      exportRecordsToCSV(data, `SmartLab_Attendance_Today_${today}.csv`);
    } catch (e) {
      alert("Failed to export today's attendance.");
    }
  }

  function formatElapsedTime(entryTime) {
    if (!entryTime) return "—";
    const diffMs = Date.now() - new Date(entryTime).getTime();
    const mins = Math.max(0, Math.floor(diffMs / 60000));
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return hours > 0 ? `${hours}h ${remMins}m` : `${remMins}m`;
  }

  if (loading) {
    return (
      <div className="loading-state">
        <RefreshCw className="spin" size={32} />
        <p>Loading SmartLab Analytics & Live Occupancy...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      {/* Top Controls */}
      <div className="dashboard-topbar">
        <div>
          <h2>Laboratory Operational Overview</h2>
          <p>Real-time technical lab monitoring, capacity analytics & attendance trends.</p>
        </div>
        <div className="dash-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setRefreshing(true);
              fetchDashboardData();
            }}
          >
            <RefreshCw className={refreshing ? "spin" : ""} size={16} />
            <span>Refresh Metrics</span>
          </button>
          <button className="btn btn-primary" onClick={handleExportToday}>
            <FileSpreadsheet size={16} />
            <span>Export Today (CSV)</span>
          </button>
        </div>
      </div>

      {error && <div className="alert-box error">{error}</div>}

      {/* KPI Stats Cards */}
      <div className="stats-kpi-grid">
        {/* Card 1: Currently Inside */}
        <div className="kpi-card highlight-card">
          <div className="kpi-icon-wrap active-wrap">
            <UserCheck size={26} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">Currently Inside Lab</span>
            <div className="kpi-number-row">
              <h2 className="kpi-number text-success">{stats?.activeInside || 0}</h2>
              <span className="live-tag pulse">● LIVE</span>
            </div>
            <span className="kpi-sub">Students actively working in lab</span>
          </div>
        </div>

        {/* Card 2: Today's Sessions */}
        <div className="kpi-card">
          <div className="kpi-icon-wrap today-wrap">
            <Activity size={26} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">Today's Total Visits</span>
            <h2 className="kpi-number">{stats?.todayTotal || 0}</h2>
            <span className="kpi-sub">
              {stats?.todayUniqueStudents || 0} unique students attended
            </span>
          </div>
        </div>

        {/* Card 3: Average Lab Duration */}
        <div className="kpi-card">
          <div className="kpi-icon-wrap duration-wrap">
            <Clock size={26} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">Avg Lab Session</span>
            <h2 className="kpi-number">
              {stats?.avgDurationMinutes || 0} <span className="kpi-unit">mins</span>
            </h2>
            <span className="kpi-sub">For completed lab sessions today</span>
          </div>
        </div>

        {/* Card 4: Total Registered Students */}
        <div className="kpi-card">
          <div className="kpi-icon-wrap total-wrap">
            <Users size={26} />
          </div>
          <div className="kpi-data">
            <span className="kpi-title">Total Enrolled</span>
            <h2 className="kpi-number">{stats?.totalStudents || 0}</h2>
            <span className="kpi-sub">Registered across all departments</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="dashboard-charts-grid">
        {/* Chart 1: 7-Day Attendance Trend */}
        <div className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h3>7-Day Lab Attendance Volume</h3>
              <p>Daily student visits trend over the past week</p>
            </div>
            <Calendar size={18} className="text-muted" />
          </div>
          <div className="chart-wrapper">
            {stats?.dailyTrend && stats.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={stats.dailyTrend}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4361ee" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#4361ee" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Visits"
                    stroke="#4361ee"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#trendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">No weekly attendance data available.</div>
            )}
          </div>
        </div>

        {/* Chart 2: Department-wise Distribution */}
        <div className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h3>Department Attendance (Today)</h3>
              <p>Branch-wise lab participation breakdown</p>
            </div>
            <Building size={18} className="text-muted" />
          </div>
          <div className="chart-wrapper">
            {stats?.departmentBreakdown && stats.departmentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.departmentBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Students" fill="#3a0ca3" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">No department scans recorded today yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Live Occupancy Table */}
      <div className="panel live-occupancy-panel">
        <div className="panel-head">
          <div>
            <h3>Students Currently Inside Laboratory ({activeSessions.length})</h3>
            <p>Live session monitor with dynamic elapsed time tracking</p>
          </div>
          <span className="live-status-pill">
            <span className="live-dot" /> Real-Time Monitor
          </span>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>USN</th>
                <th>Department</th>
                <th>Lab Room</th>
                <th>Entry Time</th>
                <th>Time Spent Inside</th>
                <th>Mode</th>
              </tr>
            </thead>
            <tbody>
              {activeSessions.map((session) => (
                <tr key={session._id}>
                  <td>
                    <b>{session.student?.name || "Student"}</b>
                  </td>
                  <td>
                    <span className="usn-code">{session.student?.usn || "N/A"}</span>
                  </td>
                  <td>
                    <span className="dept-badge">{session.student?.department || "CSE"}</span>
                  </td>
                  <td>{session.lab || "Technical Lab"}</td>
                  <td>{new Date(session.entryTime).toLocaleTimeString()}</td>
                  <td>
                    <span className="elapsed-badge">
                      <Clock size={13} /> {formatElapsedTime(session.entryTime)}
                    </span>
                  </td>
                  <td>
                    <span className={`mode-tag ${session.mode?.toLowerCase()}`}>
                      {session.mode === "MANUAL" ? "Manual" : "Face Scan"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {activeSessions.length === 0 && (
            <div className="empty-table-state">
              <UserCheck size={36} className="text-muted" />
              <h4>The laboratory is currently empty</h4>
              <p>No students have an active check-in session at this moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
