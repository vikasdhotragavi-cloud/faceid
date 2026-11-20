# SmartLab Attendance — College Face Recognition & Lab Management System

A production-grade, privacy-first technical laboratory attendance portal built for engineering colleges and university technical laboratories.

---

## 🌟 Key Features

1. **Modern Responsive College Dashboard**:
   - Real-time occupancy monitor showing students currently active inside the laboratory.
   - Dynamic 7-day attendance trends and department-wise distribution charts (powered by Recharts).
   - Live elapsed-time counter showing how long each student has been in the lab.

2. **Webcam Face Recognition & Auto Entry/Exit**:
   - Automatic `IN` recording on the first successful face scan upon entering the lab.
   - Automatic `OUT` recording when recognized again on exit.
   - Exact laboratory duration calculation (hours and minutes).
   - Audio feedback (pleasant chimes synthesized via browser Web Audio API).
   - Scan cooldown timer to prevent accidental double-scanning of the same face.

3. **Student Registration with USN & Branch**:
   - Enroll students with Name, USN (e.g., `4AL25IS016` or `4XX23CS001`), Department (CSE, ISE, AIML, ECE, EEE, ME, Civil), and Semester.
   - Live webcam face capture generating a 128-dimensional facial landmark vector.

4. **Biometric Privacy & Informed Consent**:
   - **No photographs are permanently stored.** Only 128-dimensional floating point mathematical vectors are kept.
   - Explicit biometric consent toggle during enrollment.
   - Right-to-erasure / Consent revocation button: permanently deletes face vectors on demand.

5. **Manual Attendance Alternative**:
   - For students who opt out of biometrics, students wearing medical masks, or during camera failure.
   - Instant search by USN with 1-click Check-In and Check-Out.
   - Audit trail tagging records as `MANUAL`.

6. **Daily, Weekly, Monthly Reports & CSV Export**:
   - Filter attendance by period: **Daily (Today)**, **Weekly (Last 7 Days)**, **Monthly (This Month)**, or **Custom Date Range**.
   - Filter by status (`INSIDE` vs `COMPLETED`) and Department.
   - One-click **Export to CSV / Excel** with full student details, timestamps, duration, and lab room.

7. **Role-Based Admin Authentication**:
   - Secure JWT-based admin authentication with bcrypt password hashing.
   - Pre-seeded default admin credentials (`admin@smartlab.edu` / `Admin@12345`).
   - Admin-only controls for deleting records, revoking biometric consent, and manual attendance overrides.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite 6, Face-API.js, Recharts, Lucide React icons, Web Audio API
- **Backend**: Node.js, Express 4, Mongoose 8, JSON Web Tokens (JWT), Bcrypt.js, CORS
- **Database**: MongoDB (Local `127.0.0.1:27017` or MongoDB Atlas Cloud)
- **Face Model Weights**: Tiny Face Detector, 68-Point Face Landmarks, Face Recognition ResNet

---

## 📋 Beginner Setup Guide (Step-by-Step)

### Prerequisites
- [Node.js](https://nodejs.org/) version 20+ installed.
- [MongoDB](https://www.mongodb.com/try/download/community) installed locally, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) connection URI.
- A computer with a webcam (or external USB webcam).
- A modern browser (Chrome, Edge, Firefox, Brave).

---

### Step 1: Database Setup (MongoDB)

You have two easy options for MongoDB:

#### Option A: Local MongoDB (Recommended for offline lab use)
If you have MongoDB Community Server installed on Windows:
```bash
# Start MongoDB service in an Administrator PowerShell:
net start MongoDB

# Or run mongod directly pointing to your data folder:
mongod --dbpath="C:\data\db"
```
The backend automatically connects to `mongodb://127.0.0.1:27017/smartlab_attendance`.

#### Option B: MongoDB Atlas (Free Cloud Database)
1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free M0 cluster and obtain your connection string:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/smartlab_attendance?retryWrites=true&w=majority`
3. Paste this string in `backend/.env` under `MONGODB_URI`.

---

### Step 2: Start the Backend Server

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd smartlab-attendance/backend
   ```
2. Check or edit `.env` (already created with default settings):
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/smartlab_attendance
   JWT_SECRET=smartlab_secure_jwt_secret_key_2026_super_safe
   CLIENT_URL=http://localhost:5173
   ADMIN_DEFAULT_EMAIL=admin@smartlab.edu
   ADMIN_DEFAULT_PASSWORD=Admin@12345
   ```
3. Start the backend:
   ```bash
   npm run dev
   # or
   npm start
   ```
4. You should see:
   ```
   MongoDB connected successfully to: mongodb://127.0.0.1:27017/smartlab_attendance
   [Init] Default Administrator created: admin@smartlab.edu (Password: Admin@12345)
   SmartLab API running at http://localhost:5000
   ```

---

### Step 3: Start the Frontend Application

1. Open a **second terminal** and navigate to the `frontend` folder:
   ```bash
   cd smartlab-attendance/frontend
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open your browser to the URL shown:
   👉 **http://localhost:5173**

---

## 🔑 Default Administrator Credentials

Use these credentials to sign in by clicking the **Admin Login** button in the top right corner:

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@smartlab.edu` | `Admin@12345` |

---

## 🚀 How to Use the System

### 1. Student Registration
- Go to the **Student Registration** tab.
- Enter Full Name, USN, Department, and Semester.
- Keep the informed biometric consent checked.
- Click **Start Webcam**, face the camera in good lighting, and click **Capture Face ID**.
- Click **Complete Registration**. The student is now enrolled with a 128-vector facial template!
- *(Alternative)*: If a student opts out of biometrics, uncheck the consent box and submit. They will be registered for the manual attendance path.

### 2. Marking Face Attendance
- Go to the **Face Attendance** tab.
- Select your lab room (e.g., `Technical Lab 1`).
- Click **Start Camera**.
- When a student looks into the camera and clicks **Verify & Mark Attendance** (or turns on **Continuous Auto-Scan**):
  - **First Scan (Entry)**: Records `IN`, welcomes the student, and plays a high double chime.
  - **Second Scan (Exit)**: Records `OUT`, calculates exact elapsed time (e.g., `1 hr 25 min`), and plays a mellow exit chime.

### 3. Manual Attendance Workflow
- Go to the **Manual Attendance** tab.
- Type any student's USN and click **Search Student**.
- The portal displays whether the student is currently INSIDE or OUTSIDE.
- Click **Record Lab Entry (IN)** or **Record Lab Exit (OUT)** with optional staff remarks.

### 4. Admin Dashboard & Live Monitoring
- Go to the **Lab Dashboard** tab.
- View real-time occupancy, average session duration, 7-day attendance volume, and branch participation.
- The **Live Occupancy Table** lists every student currently in the lab with dynamic elapsed time.

### 5. Attendance Reports & CSV/Excel Export
- Go to the **Attendance Reports** tab.
- Switch between **Daily**, **Weekly**, **Monthly**, or **Custom Date Range**.
- Click **Export to CSV / Excel** to instantly download the structured spreadsheet report.

---

## 🧪 Verification & Testing

To run the automated backend test suite:
```bash
cd smartlab-attendance/backend
node test-backend.js
```
All 6 test suites will verify:
- Bcrypt password hashing & comparison
- JWT token signing & verification
- Role-based authorization middleware
- Duration computation algorithms
- Express router integrity
- CSV formatting & injection-safe escaping

---

## 🔒 Biometric Privacy & Safety Principles

1. **Numeric Vectors Only**: The portal never uploads or stores raw photos to the database. It converts facial landmarks into a 128-dimensional mathematical array.
2. **Informed Consent**: Biometric enrollment requires student opt-in.
3. **Right to Erasure**: Administrators or students can click **Revoke Consent** in the directory to immediately delete the facial vectors.
4. **Manual Alternative**: Students who do not wish to use facial biometrics are provided with equal access via the manual attendance workflow.
