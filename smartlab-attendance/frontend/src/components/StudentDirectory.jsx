import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Mail,
  UserX,
  AlertCircle,
  CheckCircle2,
  ShieldOff
} from "lucide-react";
import api from "../api";

export default function StudentDirectory({ user, onRequireLogin }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [semester, setSemester] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadStudents() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (department !== "ALL") params.append("department", department);
      if (semester !== "ALL") params.append("semester", semester);

      const { data } = await api.get(`/students?${params.toString()}`);
      setStudents(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not fetch student directory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, [department, semester]);

  async function handleRevokeConsent(student) {
    if (!user) {
      if (onRequireLogin) onRequireLogin();
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to revoke biometric consent for ${student.name} (${student.usn})?\nAll 128 stored facial feature vectors will be immediately erased from the database.`
    );
    if (!confirmed) return;

    try {
      const { data } = await api.post(`/students/${student._id}/revoke-consent`);
      setSuccess(data.message);
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to revoke consent.");
    }
  }

  async function handleDeleteStudent(student) {
    if (!user) {
      if (onRequireLogin) onRequireLogin();
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${student.name} (${student.usn})?\nThis action will also delete all associated attendance history.`
    );
    if (!confirmed) return;

    try {
      const { data } = await api.delete(`/students/${student._id}`);
      setSuccess(data.message);
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete student.");
    }
  }

  return (
    <div className="directory-container">
      <div className="panel directory-panel">
        <div className="panel-head">
          <div>
            <h2>Enrolled Students Directory ({students.length})</h2>
            <p>Manage student profiles, biometric permissions, and right-to-erasure compliance.</p>
          </div>
          <button className="btn btn-secondary" onClick={loadStudents}>
            <RefreshCw size={15} /> Refresh Directory
          </button>
        </div>

        {error && (
          <div className="alert-box error">
            <AlertCircle size={16} /> <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert-box success">
            <CheckCircle2 size={16} /> <span>{success}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="filter-controls-bar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadStudents();
            }}
            className="filter-search-wrap"
          >
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by student name or USN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>

          <div className="dropdown-filter-group">
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="ALL">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ISE">ISE</option>
              <option value="AIML">AIML</option>
              <option value="ECE">ECE</option>
              <option value="EEE">EEE</option>
              <option value="ME">ME</option>
              <option value="Civil">Civil</option>
            </select>

            <select value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Sem {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>USN</th>
                <th>Department</th>
                <th>Semester</th>
                <th>Email</th>
                <th>Biometric Status</th>
                <th>Enrolled On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id}>
                  <td>
                    <b>{student.name}</b>
                  </td>
                  <td>
                    <span className="usn-code">{student.usn}</span>
                  </td>
                  <td>
                    <span className="dept-badge">{student.department}</span>
                  </td>
                  <td>Sem {student.semester}</td>
                  <td>
                    {student.email ? (
                      <span className="email-text">
                        <Mail size={12} /> {student.email}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    {student.biometricConsent ? (
                      <span className="consent-badge consented">
                        <ShieldCheck size={13} /> Face ID Active
                      </span>
                    ) : (
                      <span className="consent-badge revoked">
                        <ShieldAlert size={13} /> Biometric Opt-Out
                      </span>
                    )}
                  </td>
                  <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons-group">
                      {student.biometricConsent && (
                        <button
                          className="btn-icon warning"
                          title="Revoke Biometric Consent & Purge Templates"
                          onClick={() => handleRevokeConsent(student)}
                        >
                          <ShieldOff size={15} />
                        </button>
                      )}
                      <button
                        className="btn-icon danger"
                        title="Delete Student Record"
                        onClick={() => handleDeleteStudent(student)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {students.length === 0 && !loading && (
            <div className="empty-table-state">
              <Users size={40} className="text-muted" />
              <h4>No matching students found</h4>
              <p>Try clearing filters or register a new student using the Registration tab.</p>
            </div>
          )}

          {loading && (
            <div className="loading-state-small">
              <RefreshCw className="spin" size={20} />
              <span>Fetching student records...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
