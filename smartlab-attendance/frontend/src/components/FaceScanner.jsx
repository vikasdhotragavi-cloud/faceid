import React, { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import {
  Camera,
  ScanFace,
  RefreshCw,
  LogIn,
  LogOut,
  Clock,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  StopCircle,
  Eye,
  SlidersHorizontal
} from "lucide-react";
import api from "../api";
import { playChime } from "../utils/audio";

const DISTANCE_THRESHOLD = 0.48;

export default function FaceScanner({ modelReady, onSwitchToManual }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const isContinuousRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [continuousScan, setContinuousScan] = useState(false);
  const [selectedLab, setSelectedLab] = useState("Technical Lab 1");
  const [lastResult, setLastResult] = useState(null);
  const [scanMessage, setScanMessage] = useState("");
  const [scanStatus, setScanStatus] = useState("idle"); // idle, scanning, success, error
  const [recentScans, setRecentScans] = useState([]);
  const [cooldownUSN, setCooldownUSN] = useState(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    setScanMessage("");
    setScanStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setScanMessage("Camera active. Align face in the green guide box.");
    } catch (err) {
      setScanStatus("error");
      setScanMessage("Camera access was blocked or no webcam device was found. Please allow camera permissions in browser.");
    }
  }

  function stopCamera() {
    isContinuousRef.current = false;
    setContinuousScan(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScanStatus("idle");
  }

  async function captureDescriptor() {
    if (!modelReady) throw new Error("Face recognition models are not loaded yet.");
    if (!videoRef.current || videoRef.current.readyState < 2) {
      throw new Error("Camera is not ready. Please start camera first.");
    }

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      throw new Error("No face detected. Please face the camera directly in good lighting.");
    }

    return Array.from(detection.descriptor);
  }

  async function performRecognition() {
    if (busy) return;
    setBusy(true);
    setScanStatus("scanning");
    setScanMessage("Analyzing face & matching biometric template...");

    try {
      const descriptor = await captureDescriptor();

      // Fetch enrolled face index from backend
      const { data: index } = await api.get("/students/face-index");
      if (!index || index.length === 0) {
        throw new Error("No students are enrolled with Face ID. Register a student first or use Manual Attendance.");
      }

      let bestMatch = null;
      let minDistance = Infinity;

      for (const student of index) {
        if (!student.descriptor || student.descriptor.length !== 128) continue;
        const distance = faceapi.euclideanDistance(descriptor, student.descriptor);
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = student;
        }
      }

      if (!bestMatch || minDistance > DISTANCE_THRESHOLD) {
        playChime("error");
        setScanStatus("error");
        setScanMessage(
          `Face not recognized (Similarity distance: ${minDistance.toFixed(2)}). Ensure good lighting or use Manual Attendance.`
        );
        return;
      }

      // Check client-side cooldown to avoid spamming the same student
      if (cooldownUSN === bestMatch.usn) {
        setScanMessage(`Already processed attendance for ${bestMatch.name}. Please step aside for the next student.`);
        setScanStatus("idle");
        return;
      }

      // Call Backend API to toggle Entry / Exit
      const { data } = await api.post("/attendance/toggle", {
        studentId: bestMatch.id,
        lab: selectedLab
      });

      const resultPayload = {
        action: data.action,
        studentName: bestMatch.name,
        usn: bestMatch.usn,
        department: bestMatch.department,
        time: new Date().toLocaleTimeString(),
        durationMinutes: data.durationMinutes,
        formattedDuration: data.formattedDuration,
        message: data.message
      };

      setLastResult(resultPayload);
      setRecentScans((prev) => [resultPayload, ...prev.slice(0, 5)]);

      if (data.action === "IN") {
        playChime("in");
        setScanStatus("success");
        setScanMessage(`✓ Entry recorded for ${bestMatch.name} (${bestMatch.usn}) at ${selectedLab}!`);
      } else {
        playChime("out");
        setScanStatus("success");
        setScanMessage(
          `✓ Exit recorded for ${bestMatch.name} (${bestMatch.usn}). Duration inside lab: ${data.formattedDuration || data.durationMinutes + " min"}.`
        );
      }

      // Activate cooldown for 6 seconds
      setCooldownUSN(bestMatch.usn);
      setTimeout(() => {
        setCooldownUSN(null);
      }, 6000);
    } catch (err) {
      playChime("error");
      setScanStatus("error");
      setScanMessage(err.response?.data?.message || err.message || "Face recognition error.");
    } finally {
      setBusy(false);
    }
  }

  // Continuous scanning loop
  useEffect(() => {
    let timer = null;
    if (continuousScan && cameraActive && modelReady) {
      timer = setInterval(() => {
        if (!busy && cameraActive) {
          performRecognition();
        }
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [continuousScan, cameraActive, modelReady, busy, cooldownUSN]);

  return (
    <div className="face-scanner-container">
      {/* Top Banner Control */}
      <div className="scanner-control-bar">
        <div className="lab-selector">
          <Building2 size={16} />
          <span>Active Lab:</span>
          <select value={selectedLab} onChange={(e) => setSelectedLab(e.target.value)}>
            <option value="Technical Lab 1">Technical Lab 1 (Computer Science)</option>
            <option value="Technical Lab 2">Technical Lab 2 (Data Science)</option>
            <option value="IoT & Hardware Lab">IoT & Hardware Lab</option>
            <option value="Electronics Lab">Electronics Lab</option>
          </select>
        </div>

        <div className="quick-switch">
          <span>Not recognized?</span>
          <button className="btn-link" onClick={onSwitchToManual}>
            Switch to Manual Attendance →
          </button>
        </div>
      </div>

      <div className="scanner-grid">
        {/* Left Column: Live Webcam View */}
        <div className="webcam-card">
          <div className="webcam-card-header">
            <div className="header-info">
              <h3>Live Webcam Face Recognition</h3>
              <p>Automatic entry on first scan, automatic exit & duration calculation on second scan.</p>
            </div>
            {cameraActive && (
              <span className="live-badge pulse">
                <span className="live-dot" /> LIVE FEED
              </span>
            )}
          </div>

          <div className="camera-viewport">
            <video ref={videoRef} autoPlay muted playsInline />
            <canvas ref={canvasRef} className="face-overlay-canvas" />

            {/* Target Reticle */}
            <div className={`scan-reticle ${scanStatus}`}>
              <span className="corner top-left" />
              <span className="corner top-right" />
              <span className="corner bottom-left" />
              <span className="corner bottom-right" />
              <div className="reticle-guide">Face Target</div>
            </div>

            {!cameraActive && (
              <div className="camera-off-overlay">
                <div className="camera-icon-wrap">
                  <Camera size={42} />
                </div>
                <h4>Webcam is Currently Inactive</h4>
                <p>Click "Start Camera" below to activate face verification.</p>
                <button className="btn btn-primary btn-lg" onClick={startCamera}>
                  <Camera size={18} /> Start Camera
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="camera-footer-controls">
            {!cameraActive ? (
              <button className="btn btn-primary" onClick={startCamera}>
                <Camera size={17} /> Start Camera
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  disabled={busy || !modelReady}
                  onClick={performRecognition}
                >
                  {busy ? <RefreshCw className="spin" size={17} /> : <ScanFace size={17} />}
                  <span>{busy ? "Scanning Face..." : "Verify & Mark Attendance"}</span>
                </button>

                <button
                  className={`btn ${continuousScan ? "btn-warning" : "btn-secondary"}`}
                  onClick={() => setContinuousScan(!continuousScan)}
                >
                  <Eye size={17} />
                  <span>{continuousScan ? "Auto-Scan: ON (Click to Stop)" : "Enable Continuous Auto-Scan"}</span>
                </button>

                <button className="btn btn-outline" onClick={stopCamera}>
                  <StopCircle size={17} /> Stop
                </button>
              </>
            )}
          </div>

          {/* Live Status Alert */}
          {scanMessage && (
            <div className={`status-banner ${scanStatus}`}>
              {scanStatus === "success" && <CheckCircle2 size={18} />}
              {scanStatus === "error" && <AlertTriangle size={18} />}
              {scanStatus === "scanning" && <RefreshCw className="spin" size={18} />}
              {scanStatus === "idle" && <ShieldCheck size={18} />}
              <span>{scanMessage}</span>
            </div>
          )}
        </div>

        {/* Right Column: Attendance Verification Status & Session History */}
        <div className="scanner-sidebar">
          {/* Active Result Card */}
          {lastResult ? (
            <div className={`result-card ${lastResult.action === "IN" ? "entry-card" : "exit-card"}`}>
              <div className="result-header">
                <div className="action-pill">
                  {lastResult.action === "IN" ? (
                    <>
                      <LogIn size={16} /> ENTRY RECORDED
                    </>
                  ) : (
                    <>
                      <LogOut size={16} /> EXIT RECORDED
                    </>
                  )}
                </div>
                <span className="timestamp">{lastResult.time}</span>
              </div>

              <div className="student-profile-peek">
                <div className="peek-avatar">
                  {lastResult.studentName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="student-name">{lastResult.studentName}</h4>
                  <div className="student-sub">
                    <span className="usn-tag">{lastResult.usn}</span>
                    <span className="dept-tag">{lastResult.department}</span>
                  </div>
                </div>
              </div>

              {lastResult.action === "OUT" && (
                <div className="duration-metric-box">
                  <div className="duration-icon">
                    <Clock size={20} />
                  </div>
                  <div>
                    <span className="duration-label">Total Time Inside Lab</span>
                    <h3 className="duration-value">
                      {lastResult.formattedDuration || `${lastResult.durationMinutes} Minutes`}
                    </h3>
                  </div>
                </div>
              )}

              <p className="result-message">{lastResult.message}</p>
            </div>
          ) : (
            <div className="placeholder-result-card">
              <ScanFace size={48} className="idle-scan-icon" />
              <h4>Awaiting Student Verification</h4>
              <p>Position face in camera view and tap "Verify" to record attendance.</p>
            </div>
          )}

          {/* Recent Live Scans Feed */}
          <div className="recent-scans-panel">
            <div className="recent-scans-header">
              <Clock size={16} />
              <h4>Recent Lab Activity</h4>
            </div>

            {recentScans.length === 0 ? (
              <div className="empty-recent-feed">No scans recorded in this session yet.</div>
            ) : (
              <div className="recent-scans-list">
                {recentScans.map((scan, idx) => (
                  <div key={idx} className={`recent-scan-item ${scan.action === "IN" ? "in" : "out"}`}>
                    <div className="scan-item-badge">
                      {scan.action === "IN" ? <LogIn size={14} /> : <LogOut size={14} />}
                    </div>
                    <div className="scan-item-details">
                      <b>{scan.studentName}</b>
                      <span>
                        {scan.usn} • {scan.time}
                      </span>
                    </div>
                    {scan.action === "OUT" && scan.durationMinutes !== undefined && (
                      <span className="scan-duration-badge">{scan.durationMinutes}m</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security & Privacy Notice Card */}
          <div className="privacy-card">
            <ShieldCheck size={20} className="privacy-icon" />
            <div>
              <b>Biometric Protection & Consent</b>
              <p>
                Face vectors (128 numeric values) are used strictly for technical lab attendance.
                No webcam photos are permanently saved on disk.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
