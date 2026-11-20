import React, { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import {
  Camera,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  Info,
  Sparkles,
  StopCircle
} from "lucide-react";
import api from "../api";
import { playChime } from "../utils/audio";

export default function StudentRegistration({ modelReady, onStudentRegistered }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    usn: "",
    department: "CSE",
    semester: "3",
    email: ""
  });

  const [consent, setConsent] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState("info"); // success, error, info

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function startCamera() {
    setMessage("");
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
      setMessage("Camera ready. Position face inside the guide frame.");
      setMsgType("info");
    } catch (err) {
      setMsgType("error");
      setMessage("Camera access denied or no webcam available. Please allow camera permissions in browser.");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  async function handleCaptureFace() {
    if (!modelReady) {
      setMsgType("error");
      setMessage("Face recognition AI models are still loading. Please wait a moment.");
      return;
    }

    if (!cameraActive || !videoRef.current || videoRef.current.readyState < 2) {
      setMsgType("error");
      setMessage("Please start the camera first.");
      return;
    }

    setCapturing(true);
    setMessage("");

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        throw new Error("No face clearly detected. Please face the webcam directly with good front lighting.");
      }

      const descriptorArray = Array.from(detection.descriptor);
      setCapturedDescriptor(descriptorArray);
      setMsgType("success");
      setMessage("✓ Face descriptor captured successfully (128-vector facial template generated).");
      playChime("in");
    } catch (err) {
      playChime("error");
      setMsgType("error");
      setMessage(err.message || "Failed to capture facial template.");
    } finally {
      setCapturing(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      if (consent && (!capturedDescriptor || capturedDescriptor.length !== 128)) {
        throw new Error("Biometric enrollment is enabled. Please start the camera and click 'Capture Face ID' before submitting.");
      }

      const payload = {
        name: form.name.trim(),
        usn: form.usn.trim().toUpperCase(),
        department: form.department,
        semester: form.semester,
        email: form.email.trim() || undefined,
        biometricConsent: consent,
        faceDescriptor: consent ? capturedDescriptor : []
      };

      const { data } = await api.post("/students/register", payload);

      playChime("in");
      setMsgType("success");
      setMessage(data.message || `Student ${form.name} registered successfully!`);

      // Reset form
      setForm({ name: "", usn: "", department: "CSE", semester: "3", email: "" });
      setCapturedDescriptor(null);
      stopCamera();

      if (onStudentRegistered) onStudentRegistered();
    } catch (err) {
      playChime("error");
      setMsgType("error");
      setMessage(err.response?.data?.message || err.message || "Could not register student.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="registration-container">
      <div className="registration-grid">
        {/* Registration Form */}
        <div className="panel registration-panel">
          <div className="panel-head">
            <div>
              <h2>Enroll New Student</h2>
              <p>Register university details and optional biometric face template.</p>
            </div>
            <span className="badge-pill">
              <UserPlus size={15} /> NEW STUDENT
            </span>
          </div>

          {message && (
            <div className={`status-banner ${msgType}`}>
              {msgType === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="student-form-grid">
            <div className="form-group">
              <label>Full Student Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>University Seat Number (USN) *</label>
              <input
                type="text"
                required
                placeholder="e.g. 4AL25IS016 or 4XX23CS001"
                value={form.usn}
                onChange={(e) => setForm({ ...form, usn: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="form-group">
              <label>Department / Branch *</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              >
                <option value="CSE">Computer Science & Engineering (CSE)</option>
                <option value="ISE">Information Science & Engineering (ISE)</option>
                <option value="AIML">Artificial Intelligence & Machine Learning (AIML)</option>
                <option value="ECE">Electronics & Communication (ECE)</option>
                <option value="EEE">Electrical & Electronics (EEE)</option>
                <option value="ME">Mechanical Engineering (ME)</option>
                <option value="Civil">Civil Engineering</option>
              </select>
            </div>

            <div className="form-group">
              <label>Semester *</label>
              <select
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group full-span">
              <label>Institutional Email (Optional)</label>
              <input
                type="email"
                placeholder="student@college.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Informed Consent Checkbox */}
            <div className="consent-card full-span">
              <div className="consent-checkbox-wrap">
                <input
                  type="checkbox"
                  id="biometric-consent"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (!e.target.checked) setCapturedDescriptor(null);
                  }}
                />
                <label htmlFor="biometric-consent" className="consent-label">
                  <b>I provide informed biometric consent</b> for capturing a 128-dimensional facial feature vector
                  strictly for laboratory attendance logging.
                  <small>
                    (Uncheck if the student prefers manual attendance. No photo images are stored.)
                  </small>
                </label>
              </div>
            </div>

            {/* Template Status if captured */}
            {consent && (
              <div className="full-span capture-status-row">
                {capturedDescriptor ? (
                  <div className="descriptor-chip success">
                    <CheckCircle2 size={16} />
                    <span>Facial Template Ready: 128 Floating-Point Values Vectorized</span>
                  </div>
                ) : (
                  <div className="descriptor-chip pending">
                    <Info size={16} />
                    <span>Facial Template Pending: Start camera and click "Capture Face ID"</span>
                  </div>
                )}
              </div>
            )}

            <div className="form-actions full-span">
              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={busy || (consent && !capturedDescriptor)}
              >
                {busy ? <RefreshCw className="spin" size={18} /> : <UserPlus size={18} />}
                <span>{busy ? "Registering Student..." : "Complete Registration"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Panel: Camera Preview for Enrollment */}
        <div className="enroll-camera-panel">
          <div className="panel camera-subcard">
            <div className="panel-head">
              <div>
                <h3>Biometric Face Capture</h3>
                <p>High-precision 68-point facial landmark registration</p>
              </div>
            </div>

            <div className="enroll-video-wrap">
              <video ref={videoRef} autoPlay muted playsInline />
              <div className="enroll-reticle">
                <span className="corner top-left" />
                <span className="corner top-right" />
                <span className="corner bottom-left" />
                <span className="corner bottom-right" />
              </div>

              {!cameraActive && (
                <div className="enroll-camera-off">
                  <Camera size={36} />
                  <b>Webcam Off</b>
                  <small>Click "Start Camera" to enroll Face ID</small>
                </div>
              )}
            </div>

            <div className="enroll-camera-buttons">
              {!cameraActive ? (
                <button
                  type="button"
                  className="btn btn-secondary full-width"
                  onClick={startCamera}
                  disabled={!consent}
                >
                  <Camera size={16} /> Start Webcam
                </button>
              ) : (
                <div className="button-dual-row">
                  <button
                    type="button"
                    className="btn btn-success"
                    disabled={capturing || !modelReady}
                    onClick={handleCaptureFace}
                  >
                    {capturing ? <RefreshCw className="spin" size={16} /> : <Sparkles size={16} />}
                    <span>{capturing ? "Vectorizing..." : "Capture Face ID"}</span>
                  </button>

                  <button type="button" className="btn btn-outline" onClick={stopCamera}>
                    <StopCircle size={16} /> Stop Camera
                  </button>
                </div>
              )}
            </div>

            <div className="privacy-alert-box">
              <ShieldCheck size={18} />
              <div>
                <b>Biometric Data Privacy</b>
                <p>
                  Antigravity SmartLab complies with data protection standards. Only numeric mathematical
                  embeddings are stored. Students may request deletion or consent revocation at any time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
