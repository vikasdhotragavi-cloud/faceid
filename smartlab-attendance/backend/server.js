require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./src/routes/authRoutes");
const studentRoutes = require("./src/routes/studentRoutes");
const attendanceRoutes = require("./src/routes/attendanceRoutes");
const User = require("./src/models/User");

const app = express();

const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
app.use(cors({
  origin: [clientOrigin, "http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// System Health Check
app.get("/api/health", (_req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.json({
    status: isConnected ? "ok" : "degraded",
    service: "SmartLab Attendance API",
    database: {
      connected: isConnected,
      name: mongoose.connection.name || "smartlab_attendance"
    },
    timestamp: new Date().toISOString()
  });
});

// Seed default administrator if database is fresh
async function seedDefaultAdmin() {
  try {
    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const email = process.env.ADMIN_DEFAULT_EMAIL || "admin@smartlab.edu";
      const password = process.env.ADMIN_DEFAULT_PASSWORD || "Admin@12345";
      await User.create({
        name: "Lab Administrator",
        email: email.toLowerCase().trim(),
        password,
        role: "admin"
      });
      console.log(`[Init] Default Administrator created: ${email} (Password: ${password})`);
    } else {
      console.log("[Init] Administrator account verified.");
    }
  } catch (err) {
    console.warn("[Init] Admin check warning:", err.message);
  }
}

// Register API Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled API Exception:", err);
  res.status(500).json({
    message: err.message || "An unexpected server error occurred."
  });
});

const port = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartlab_attendance";

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("MongoDB connected successfully to:", mongoUri);
    await seedDefaultAdmin();
    app.listen(port, () => console.log(`SmartLab API running at http://localhost:${port}`));
  })
  .catch((err) => {
    console.error("==================================================================");
    console.error("MongoDB connection failed:", err.message);
    console.error("Please ensure MongoDB is running locally on port 27017,");
    console.error("or update MONGODB_URI in backend/.env with your MongoDB Atlas URI.");
    console.error("==================================================================");

    // Fallback: Start HTTP server so health check and helpful errors can be delivered to frontend
    app.listen(port, () => {
      console.log(`SmartLab API running in DEGRADED MODE (DB disconnected) at http://localhost:${port}`);
    });
  });
