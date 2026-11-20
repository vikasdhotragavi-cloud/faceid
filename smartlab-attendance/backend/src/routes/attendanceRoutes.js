const router = require("express").Router();
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

// Toggle attendance via Face Recognition
router.post("/toggle", async (req, res) => {
  try {
    const { studentId, lab } = req.body;
    if (!studentId) return res.status(400).json({ message: "Student ID is required." });

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student record not found." });
    }

    if (!student.biometricConsent) {
      return res.status(403).json({
        message: `Biometric attendance is not enabled for ${student.name}. Please use manual attendance.`
      });
    }

    const labName = (lab || "Technical Lab 1").trim();

    // Check for open session
    const openSession = await Attendance.findOne({ student: studentId, status: "INSIDE" }).sort({ entryTime: -1 });

    if (openSession) {
      // Record EXIT
      const exitDate = new Date();
      openSession.exitTime = exitDate;
      openSession.status = "COMPLETED";

      const diffMs = exitDate.getTime() - new Date(openSession.entryTime).getTime();
      const durationMinutes = Math.max(1, Math.round(diffMs / 60000));
      openSession.durationMinutes = durationMinutes;

      await openSession.save();

      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const formattedDuration = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

      return res.json({
        action: "OUT",
        message: `Exit recorded for ${student.name} (${student.usn}).`,
        student: { id: student._id, name: student.name, usn: student.usn, department: student.department },
        entryTime: openSession.entryTime,
        exitTime: openSession.exitTime,
        durationMinutes,
        formattedDuration,
        attendance: openSession
      });
    }

    // Cooldown check: prevent duplicate check-in within 10 seconds
    const lastSession = await Attendance.findOne({ student: studentId }).sort({ createdAt: -1 });
    if (lastSession) {
      const secondsSince = (Date.now() - new Date(lastSession.createdAt).getTime()) / 1000;
      if (secondsSince < 10) {
        return res.status(429).json({
          message: `Attendance was just registered for ${student.name}. Please wait a few seconds before scanning again.`
        });
      }
    }

    // Record ENTRY
    const newSession = await Attendance.create({
      student: studentId,
      entryTime: new Date(),
      status: "INSIDE",
      mode: "FACE_RECOGNITION",
      lab: labName,
      markedBy: "Face Recognition Camera"
    });

    res.status(201).json({
      action: "IN",
      message: `Entry recorded for ${student.name} (${student.usn}). Welcome to ${labName}!`,
      student: { id: student._id, name: student.name, usn: student.usn, department: student.department },
      entryTime: newSession.entryTime,
      attendance: newSession
    });
  } catch (err) {
    console.error("Attendance toggle error:", err);
    res.status(500).json({ message: "Failed to process attendance." });
  }
});

// Manual Attendance Alternative (by USN or ID)
router.post("/manual", async (req, res) => {
  try {
    const { usn, studentId, action, lab, remarks, markedBy } = req.body;

    let student = null;
    if (studentId) {
      student = await Student.findById(studentId);
    } else if (usn) {
      student = await Student.findOne({ usn: usn.trim().toUpperCase() });
    }

    if (!student) {
      return res.status(404).json({ message: "Student with this USN was not found." });
    }

    const labName = (lab || "Technical Lab 1").trim();
    const openSession = await Attendance.findOne({ student: student._id, status: "INSIDE" }).sort({ entryTime: -1 });

    // If explicit action is OUT or action is AUTO and session exists
    if ((action === "OUT" || (!action || action === "AUTO")) && openSession) {
      const exitDate = new Date();
      openSession.exitTime = exitDate;
      openSession.status = "COMPLETED";

      const diffMs = exitDate.getTime() - new Date(openSession.entryTime).getTime();
      const durationMinutes = Math.max(1, Math.round(diffMs / 60000));
      openSession.durationMinutes = durationMinutes;
      if (remarks) openSession.remarks = remarks;

      await openSession.save();

      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      const formattedDuration = hours > 0 ? `${hours} hr ${mins} min` : `${mins} min`;

      return res.json({
        action: "OUT",
        message: `Manual exit recorded for ${student.name} (${student.usn}). Duration: ${formattedDuration}.`,
        student: { id: student._id, name: student.name, usn: student.usn },
        attendance: openSession,
        durationMinutes
      });
    }

    if (action === "OUT" && !openSession) {
      return res.status(400).json({ message: `${student.name} is not currently marked as INSIDE the lab.` });
    }

    if (action === "IN" && openSession) {
      return res.status(400).json({ message: `${student.name} is already marked as INSIDE since ${new Date(openSession.entryTime).toLocaleTimeString()}. Record exit first.` });
    }

    // Record Manual Entry
    const record = await Attendance.create({
      student: student._id,
      entryTime: new Date(),
      status: "INSIDE",
      mode: "MANUAL",
      lab: labName,
      remarks: remarks || "Manual entry",
      markedBy: markedBy || "Lab Admin"
    });

    res.status(201).json({
      action: "IN",
      message: `Manual entry recorded for ${student.name} (${student.usn}) at ${labName}.`,
      student: { id: student._id, name: student.name, usn: student.usn },
      attendance: record
    });
  } catch (err) {
    console.error("Manual attendance error:", err);
    res.status(500).json({ message: "Could not record manual attendance." });
  }
});

// List attendance records with date filtering & search
router.get("/", async (req, res) => {
  try {
    const { startDate, endDate, status, department, search, limit = 500 } = req.query;
    const query = {};

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (startDate || endDate) {
      query.entryTime = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.entryTime.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.entryTime.$lte = end;
      }
    }

    let records = await Attendance.find(query)
      .populate("student", "name usn department semester")
      .sort({ entryTime: -1 })
      .limit(parseInt(limit, 10));

    // Filter by department or student search text if populated
    if (department && department !== "ALL") {
      records = records.filter(r => r.student && r.student.department === department);
    }

    if (search) {
      const q = search.trim().toLowerCase();
      records = records.filter(r =>
        r.student &&
        (r.student.name.toLowerCase().includes(q) || r.student.usn.toLowerCase().includes(q))
      );
    }

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Failed to load attendance records." });
  }
});

// Aggregate Statistics for Dashboard & Reports
router.get("/stats", async (_req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      activeInsideCount,
      todaySessions,
      totalStudents,
      weekSessions,
      recentSessions
    ] = await Promise.all([
      Attendance.countDocuments({ status: "INSIDE" }),
      Attendance.find({ entryTime: { $gte: startOfToday } }).populate("student", "department"),
      Student.countDocuments(),
      Attendance.find({ entryTime: { $gte: startOfWeek } }).populate("student", "department"),
      Attendance.find().populate("student", "name usn department semester").sort({ entryTime: -1 }).limit(8)
    ]);

    // Unique students today
    const uniqueStudentsToday = new Set(todaySessions.map(s => String(s.student?._id || s.student))).size;

    // Completed durations today
    const completedToday = todaySessions.filter(s => s.status === "COMPLETED" && s.durationMinutes);
    const avgDuration = completedToday.length > 0
      ? Math.round(completedToday.reduce((acc, cur) => acc + (cur.durationMinutes || 0), 0) / completedToday.length)
      : 0;

    // Department breakdown
    const deptMap = {};
    for (const s of todaySessions) {
      const dept = s.student?.department || "Other";
      deptMap[dept] = (deptMap[dept] || 0) + 1;
    }
    const departmentBreakdown = Object.entries(deptMap).map(([dept, count]) => ({ department: dept, count }));

    // 7-day daily trend
    const trendMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      trendMap[key] = 0;
    }

    for (const s of weekSessions) {
      const key = new Date(s.entryTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      if (trendMap[key] !== undefined) {
        trendMap[key]++;
      }
    }

    const dailyTrend = Object.entries(trendMap).map(([date, count]) => ({ date, count }));

    res.json({
      activeInside: activeInsideCount,
      todayTotal: todaySessions.length,
      todayUniqueStudents: uniqueStudentsToday,
      totalStudents,
      avgDurationMinutes: avgDuration,
      departmentBreakdown,
      dailyTrend,
      recentSessions
    });
  } catch (err) {
    console.error("Stats calculation error:", err);
    res.status(500).json({ message: "Could not calculate attendance statistics." });
  }
});

// CSV / Excel Export Endpoint
router.get("/export", async (req, res) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = {};

    if (status && status !== "ALL") query.status = status;
    if (startDate || endDate) {
      query.entryTime = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.entryTime.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.entryTime.$lte = e;
      }
    }

    const records = await Attendance.find(query)
      .populate("student", "name usn department semester")
      .sort({ entryTime: -1 });

    const headers = [
      "Record ID",
      "Student Name",
      "USN",
      "Department",
      "Semester",
      "Status",
      "Mode",
      "Lab",
      "Entry Time",
      "Exit Time",
      "Duration (Minutes)",
      "Marked By",
      "Remarks"
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map(r => [
      escapeCSV(r._id),
      escapeCSV(r.student?.name || "Unknown"),
      escapeCSV(r.student?.usn || "N/A"),
      escapeCSV(r.student?.department || "N/A"),
      escapeCSV(r.student?.semester || "N/A"),
      escapeCSV(r.status),
      escapeCSV(r.mode),
      escapeCSV(r.lab),
      escapeCSV(new Date(r.entryTime).toLocaleString()),
      escapeCSV(r.exitTime ? new Date(r.exitTime).toLocaleString() : "Still Inside"),
      escapeCSV(r.durationMinutes !== null ? r.durationMinutes : (r.status === "INSIDE" ? "Active" : 0)),
      escapeCSV(r.markedBy || "Face Scan"),
      escapeCSV(r.remarks || "")
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\r\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=SmartLab_Attendance_${Date.now()}.csv`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ message: "Failed to export attendance records." });
  }
});

// Update an attendance record
router.put("/:id", async (req, res) => {
  try {
    const { status, exitTime, durationMinutes, remarks, lab } = req.body;
    const update = {};
    if (status) update.status = status;
    if (exitTime) update.exitTime = new Date(exitTime);
    if (durationMinutes !== undefined) update.durationMinutes = Number(durationMinutes);
    if (remarks !== undefined) update.remarks = remarks;
    if (lab) update.lab = lab;

    const record = await Attendance.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!record) return res.status(404).json({ message: "Attendance record not found." });

    res.json({ message: "Attendance record updated successfully.", record });
  } catch (err) {
    res.status(500).json({ message: "Failed to update record." });
  }
});

// Delete an attendance record
router.delete("/:id", async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: "Record not found." });
    res.json({ message: "Attendance record deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete record." });
  }
});

module.exports = router;
