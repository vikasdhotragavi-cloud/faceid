import React, { useState, useEffect } from "react";
import {
  FileEdit,
  Search,
  LogIn,
  LogOut,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  Building2,
  RefreshCw,
  BadgeCheck,
  ShieldAlert
} from "lucide-react";
import api from "../api";
import { playChime } from "../utils/audio";

export default function ManualAttendance({ onAttendanceChanged }) {
  const [usnInput, setUsnInput] = useState("");
  const [selectedLab, setSelectedLab] = useState("Technical Lab 1");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [studentInfo, setStudentInfo] = useState(null);
  const [studentStatus, setStudentStatus] = useState(null); // { isInside: boolean, currentSession: object }
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("info");
  const [recentManualRecords, setRecentManualRecords] = useState([]);

  // Fetch recent manual attendance records
  async function loadRecentManual() {
    try {
      const { data } = await api.get("/attendance?limit=10");
      setRecentManualRecords(data.filter((r) => r.mode === "MANUAL"));
    } catch (e) {
      // Ignore initial load failure
    }
  }

  useEffect(() => {
    loadRecentManual();
  }, []);

  // Lookup student status by USN
  async function handleLookup(targetUsn = usnInput) {
    if (!targetUsn || !targetUsn.trim()) {
      setMessage("Please enter a valid USN.");
      setMsgType("error");
      return;
    }

    setLookupLoading(true);
    setMessage("");
    setStudentInfo(null);
    setStudentStatus(null);

    try {
      const cleanUSN = targetUsn.trim().toUpperCase();
      const { data: students } = await api.get(`/students?search=${cleanUSN}`);
      const found = students.find((s) => s.usn.toUpperCase() === cleanUSN);

      if (!found) {
        setMsgType("error");
        setMessage(`No registered student found with USN "${cleanUSN}". Please register the student first.`);
        return;
      }

      setStudentInfo(found);

      // Check active attendance session
      const { data: records } = await api.get(`/attendance?studentId=${found._id}&status=INSIDE`);
      const activeSession = records.find((r) => r.status === "INSIDE" && r.student?._id === found._id);

      if (activeSession) {
        setStudentStatus({ isInside: true, session: activeSession });
      } else {
        setStudentStatus({ isInside: false, session: null });
      }
    } catch (err) {
      setMsgType("error");
      setMessage(err.response?.data?.message || "Failed to look up student.");
    } finally {
      setLookupLoading(false);
    }
  }

  // Submit manual attendance action
  async function handleManualSubmit(actionType) {
    if (!studentInfo) {
      setMessage("Please lookup a student by USN first.");
      setMsgType("error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { data } = await api.post("/attendance/manual", {
        usn: studentInfo.usn,
        action: actionType, // 'IN' or 'OUT'
        lab: selectedLab,
        remarks: remarks || "Manual verification by staff",
        markedBy: "Lab Administrator"
      });

      if (data.action === "IN") {
        playChime("in");
        setMsgType("success");
        setMessage(`✓ Manual ENTRY recorded for ${studentInfo.name} (${studentInfo.usn}) at ${selectedLab}.`);
      } else {
        playChime("out");
        setMsgType("success");
        setMessage(`✓ Manual EXIT recorded for ${studentInfo.name} (${studentInfo.usn}). Duration: ${data.durationMinutes} min.`);
      }

      setRemarks("");
      // Refresh current status and history
      await handleLookup(studentInfo.usn);
      await loadRecentManual();
      if (onAttendanceChanged) onAttendanceChanged();
    } catch (err) {
      playChime("error");
      setMsgType("error");
      setMessage(err.response?.data?.message || "Failed to record manual attendance.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="manual-attendance-container">
      <div className="manual-grid">
        {/* Left Card: Input and Action */}
        <div className="panel manual-card">
          <div className="panel-head">
            <div>
              <h2>Manual Attendance Alternative</h2>
              <p>For students opting out of biometrics, system maintenance, or webcam fallback.</p>
            </div>
            <span className="manual-pill">
              <FileEdit size={14} /> MANUAL OVERRIDE
            </span>
          </div>

          {/* USN Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="manual-search-box"
          >
            <div className="search-input-group">
              <label>Enter Student USN</label>
              <div className="search-bar">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 4AL25IS016 or 4XX23CS001"
                  value={usnInput}
                  onChange={(e) => setUsnInput(e.target.value.toUpperCase())}
                />
                <button type="submit" className="btn btn-primary" disabled={lookupLoading}>
                  {lookupLoading ? <RefreshCw className="spin" size={16} /> : "Search Student"}
                </button>
              </div>
            </div>
          </form>

          {/* Feedback Message */}
          {message && (
            <div className={`status-banner ${msgType}`}>
              {msgType === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message}</span>
            </div>
          )}

          {/* Student Profile Card (Once found) */}
          {studentInfo && (
            <div className="student-lookup-card">
              <div className="lookup-header">
                <div className="avatar-chip">
                  <User size={24} />
                </div>
                <div className="lookup-details">
                  <h3>{studentInfo.name}</h3>
                  <div className="tags-row">
                    <span className="tag usn">{studentInfo.usn}</span>
                    <span className="tag dept">{studentInfo.department}</span>
                    <span className="tag sem">Sem {studentInfo.semester}</span>
                    {studentInfo.biometricConsent ? (
                      <span className="tag consent-yes">
                        <BadgeCheck size={12} /> Face ID Enrolled
                      </span>
                    ) : (
                      <span className="tag consent-no">
                        <ShieldAlert size={12} /> Biometric Opted-Out
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="current-state-pill">
                  {studentStatus?.isInside ? (
                    <span className="state-badge inside">
                      <span className="dot pulse inside" /> CURRENTLY INSIDE
                    </span>
                  ) : (
                    <span className="state-badge outside">
                      <span className="dot outside" /> CURRENTLY OUTSIDE
                    </span>
                  )}
                </div>
              </div>

              {studentStatus?.isInside && studentStatus.session && (
                <div className="session-info-callout">
                  <Clock size={16} />
                  <span>
                    Entered at: <b>{new Date(studentStatus.session.entryTime).toLocaleTimeString()}</b> (
                    {studentStatus.session.lab || "Technical Lab"})
                  </span>
                </div>
              )}

              {/* Action Controls */}
              <div className="manual-action-form">
                <div className="form-row">
                  <label>
                    <Building2 size={15} /> Select Laboratory
                    <select value={selectedLab} onChange={(e) => setSelectedLab(e.target.value)}>
                      <option value="Technical Lab 1">Technical Lab 1 (Computer Science)</option>
                      <option value="Technical Lab 2">Technical Lab 2 (Data Science)</option>
                      <option value="IoT & Hardware Lab">IoT & Hardware Lab</option>
                      <option value="Electronics Lab">Electronics Lab</option>
                    </select>
                  </label>

                  <label>
                    <FileEdit size={15} /> Reason / Remarks (Optional)
                    <input
                      type="text"
                      placeholder="e.g. Biometric opt-out, student ID card verified"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </label>
                </div>

                <div className="manual-button-group">
                  <button
                    type="button"
                    className="btn btn-success btn-lg"
                    disabled={loading || (studentStatus && studentStatus.isInside)}
                    onClick={() => handleManualSubmit("IN")}
                  >
                    <LogIn size={18} />
                    <span>Record Lab Entry (IN)</span>
                  </button>

                  <button
                    type="button"
                    className="btn btn-warning btn-lg"
                    disabled={loading || (studentStatus && !studentStatus.isInside)}
                    onClick={() => handleManualSubmit("OUT")}
                  >
                    <LogOut size={18} />
                    <span>Record Lab Exit (OUT)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Card: Manual Log and Guidelines */}
        <div className="manual-sidebar">
          <div className="panel recent-manual-panel">
            <div className="panel-head">
              <div>
                <h3>Recent Manual Entries</h3>
                <p>Audit trail of non-biometric records</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadRecentManual}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {recentManualRecords.length === 0 ? (
              <div className="empty-box">No manual entries recorded yet.</div>
            ) : (
              <div className="manual-history-list">
                {recentManualRecords.map((rec) => (
                  <div key={rec._id} className="manual-history-item">
                    <div className="manual-item-head">
                      <b>{rec.student?.name || "Student"}</b>
                      <span className={`status-tag ${rec.status.toLowerCase()}`}>{rec.status}</span>
                    </div>
                    <div className="manual-item-meta">
                      <span>USN: {rec.student?.usn || "N/A"}</span>
                      <span>{new Date(rec.entryTime).toLocaleTimeString()}</span>
                    </div>
                    {rec.remarks && <div className="manual-item-remarks">"{rec.remarks}"</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="info-card guidance">
            <h4>Manual Attendance Compliance</h4>
            <ul>
              <li>Students who opt out of facial biometric templates have the full legal right to attend the lab using this manual workflow.</li>
              <li>Attendance can also be recorded here when camera lighting is inadequate or camera hardware is unavailable.</li>
              <li>Every manual record is tagged as `MANUAL` with admin audit tracking.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
