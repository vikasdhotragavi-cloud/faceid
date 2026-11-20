import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Clock,
  Trash2,
  AlertCircle,
  FileText,
  Building,
  CheckCircle2,
  LogIn,
  LogOut
} from "lucide-react";
import api from "../api";
import { exportRecordsToCSV } from "../utils/exportCsv";

export default function AttendanceReports({ user, onRequireLogin }) {
  const [period, setPeriod] = useState("daily"); // daily, weekly, monthly, custom
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Determine start & end date based on selected period
  function getDateRange() {
    const now = new Date();
    let startDate = "";
    let endDate = now.toISOString().split("T")[0];

    if (period === "daily") {
      startDate = now.toISOString().split("T")[0];
    } else if (period === "weekly") {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      startDate = past.toISOString().split("T")[0];
    } else if (period === "monthly") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate = firstDay.toISOString().split("T")[0];
    } else if (period === "custom") {
      startDate = customStart;
      endDate = customEnd;
    }
    return { startDate, endDate };
  }

  async function loadRecords() {
    setLoading(true);
    setError("");
    try {
      const { startDate, endDate } = getDateRange();
      const params = new URLSearchParams();

      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (deptFilter !== "ALL") params.append("department", deptFilter);
      if (search.trim()) params.append("search", search.trim());

      const { data } = await api.get(`/attendance?${params.toString()}`);
      setRecords(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load attendance history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRecords();
  }, [period, statusFilter, deptFilter]);

  function handleExportCSV() {
    const { startDate, endDate } = getDateRange();
    const filename = `SmartLab_Attendance_${period.toUpperCase()}_${startDate || "all"}_to_${endDate || "latest"}.csv`;
    exportRecordsToCSV(records, filename);
  }

  async function handleDeleteRecord(id) {
    if (!user) {
      if (onRequireLogin) onRequireLogin();
      return;
    }
    if (!window.confirm("Are you sure you want to delete this attendance record?")) return;

    try {
      await api.delete(`/attendance/${id}`);
      loadRecords();
    } catch (err) {
      alert("Failed to delete record.");
    }
  }

  // Calculate summary stats for the current view
  const totalSessions = records.length;
  const completedSessions = records.filter((r) => r.status === "COMPLETED");
  const avgDuration =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((acc, cur) => acc + (cur.durationMinutes || 0), 0) /
            completedSessions.length
        )
      : 0;

  return (
    <div className="reports-container">
      {/* Top Banner and Export */}
      <div className="reports-topbar">
        <div>
          <h2>Attendance Reports & Export Logs</h2>
          <p>Filter by daily, weekly, or monthly intervals, track lab duration, and generate CSV/Excel files.</p>
        </div>
        <div className="reports-actions">
          <button className="btn btn-secondary" onClick={loadRecords}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleExportCSV} disabled={records.length === 0}>
            <FileSpreadsheet size={16} /> Export to CSV / Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-box error">
          <AlertCircle size={16} /> <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Pills */}
      <div className="reports-summary-cards">
        <div className="report-summary-pill">
          <FileText size={18} />
          <div>
            <b>{totalSessions}</b>
            <span>Total Sessions in Period</span>
          </div>
        </div>

        <div className="report-summary-pill">
          <CheckCircle2 size={18} className="text-success" />
          <div>
            <b>{completedSessions.length}</b>
            <span>Completed Sessions (Exited)</span>
          </div>
        </div>

        <div className="report-summary-pill">
          <Clock size={18} className="text-primary" />
          <div>
            <b>{avgDuration} mins</b>
            <span>Average Duration in Lab</span>
          </div>
        </div>
      </div>

      {/* Period Selection Tabs */}
      <div className="panel reports-panel">
        <div className="period-tabs-bar">
          <div className="tab-group">
            <button
              className={`period-btn ${period === "daily" ? "active" : ""}`}
              onClick={() => setPeriod("daily")}
            >
              Daily Report (Today)
            </button>
            <button
              className={`period-btn ${period === "weekly" ? "active" : ""}`}
              onClick={() => setPeriod("weekly")}
            >
              Weekly Report (Last 7 Days)
            </button>
            <button
              className={`period-btn ${period === "monthly" ? "active" : ""}`}
              onClick={() => setPeriod("monthly")}
            >
              Monthly Report (This Month)
            </button>
            <button
              className={`period-btn ${period === "custom" ? "active" : ""}`}
              onClick={() => setPeriod("custom")}
            >
              Custom Date Range
            </button>
          </div>
        </div>

        {/* Custom Date Filters */}
        {period === "custom" && (
          <div className="custom-date-row">
            <label>
              From Date:
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </label>
            <label>
              To Date:
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </label>
            <button className="btn btn-secondary btn-sm" onClick={loadRecords}>
              Apply Date Filter
            </button>
          </div>
        )}

        {/* Secondary Filters Bar */}
        <div className="filter-controls-bar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadRecords();
            }}
            className="filter-search-wrap"
          >
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search student name or USN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <div className="dropdown-filter-group">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="INSIDE">Currently Inside Lab</option>
              <option value="COMPLETED">Completed Sessions</option>
            </select>

            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
              <option value="ALL">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ISE">ISE</option>
              <option value="AIML">AIML</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="ME">ME</option>
              <option value="Civil">Civil</option>
            </select>
          </div>
        </div>

        {/* Reports Table */}
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>USN</th>
                <th>Dept</th>
                <th>Lab</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Duration Spent</th>
                <th>Status</th>
                <th>Mode</th>
                {user && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const entry = new Date(r.entryTime);
                const exit = r.exitTime ? new Date(r.exitTime) : null;
                const hours = r.durationMinutes ? Math.floor(r.durationMinutes / 60) : 0;
                const mins = r.durationMinutes ? r.durationMinutes % 60 : 0;
                const durationDisplay =
                  r.durationMinutes !== null && r.durationMinutes !== undefined
                    ? hours > 0
                      ? `${hours}h ${mins}m`
                      : `${mins}m`
                    : r.status === "INSIDE"
                    ? "In Progress"
                    : "—";

                return (
                  <tr key={r._id}>
                    <td>
                      <b>{r.student?.name || "Student"}</b>
                    </td>
                    <td>
                      <span className="usn-code">{r.student?.usn || "N/A"}</span>
                    </td>
                    <td>
                      <span className="dept-badge">{r.student?.department || "CSE"}</span>
                    </td>
                    <td>{r.lab || "Technical Lab"}</td>
                    <td>
                      {entry.toLocaleDateString()} {entry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      {exit ? (
                        `${exit.toLocaleDateString()} ${exit.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      ) : (
                        <span className="text-muted">Still Inside</span>
                      )}
                    </td>
                    <td>
                      <span className={`duration-pill ${r.status === "INSIDE" ? "active" : ""}`}>
                        <Clock size={12} /> {durationDisplay}
                      </span>
                    </td>
                    <td>
                      <span className={`status-tag ${r.status.toLowerCase()}`}>
                        {r.status === "INSIDE" ? "INSIDE" : "COMPLETED"}
                      </span>
                    </td>
                    <td>
                      <span className={`mode-tag ${r.mode?.toLowerCase()}`}>
                        {r.mode === "MANUAL" ? "Manual" : "Face Scan"}
                      </span>
                    </td>
                    {user && (
                      <td>
                        <button
                          className="btn-icon danger"
                          title="Delete Record"
                          onClick={() => handleDeleteRecord(r._id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {records.length === 0 && !loading && (
            <div className="empty-table-state">
              <FileSpreadsheet size={40} className="text-muted" />
              <h4>No attendance logs found</h4>
              <p>No records match the current period or search criteria.</p>
            </div>
          )}

          {loading && (
            <div className="loading-state-small">
              <RefreshCw className="spin" size={20} />
              <span>Generating report logs...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
