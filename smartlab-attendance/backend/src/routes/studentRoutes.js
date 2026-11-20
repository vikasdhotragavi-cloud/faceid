const router = require("express").Router();
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const { auth, requireAdmin } = require("../middleware/auth");

// Register a new student (supports both Biometric & Manual attendance paths)
router.post("/register", async (req, res) => {
  try {
    const { name, usn, department, semester, email, faceDescriptor, biometricConsent } = req.body;

    if (!name || !usn || !department || !semester) {
      return res.status(400).json({ message: "Name, USN, department and semester are required." });
    }

    const cleanUSN = usn.trim().toUpperCase();

    // Check duplicate USN
    const existing = await Student.findOne({ usn: cleanUSN });
    if (existing) {
      return res.status(409).json({ message: `Student with USN '${cleanUSN}' is already registered.` });
    }

    let descriptorToStore = [];
    let hasConsent = Boolean(biometricConsent);

    if (hasConsent) {
      if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128 || !faceDescriptor.every(Number.isFinite)) {
        return res.status(400).json({
          message: "Biometric registration requires a valid 128-value facial vector. Please face the camera and try capturing again."
        });
      }
      descriptorToStore = faceDescriptor;
    }

    const student = await Student.create({
      name: name.trim(),
      usn: cleanUSN,
      department: department.trim(),
      semester: String(semester).trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      faceDescriptor: descriptorToStore,
      biometricConsent: hasConsent,
      role: "student"
    });

    res.status(201).json({
      message: hasConsent
        ? `Student ${student.name} (${student.usn}) enrolled successfully with Face ID.`
        : `Student ${student.name} (${student.usn}) enrolled for manual attendance (biometric opted-out).`,
      student: {
        id: student._id,
        name: student.name,
        usn: student.usn,
        department: student.department,
        semester: student.semester,
        biometricConsent: student.biometricConsent
      }
    });
  } catch (err) {
    console.error("Student registration error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "This USN is already registered." });
    }
    res.status(500).json({ message: "Could not register student. Please check database connection." });
  }
});

// List all students with search and filter
router.get("/", async (req, res) => {
  try {
    const { search, department, semester } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ name: regex }, { usn: regex }, { email: regex }];
    }
    if (department && department !== "ALL") {
      query.department = department;
    }
    if (semester && semester !== "ALL") {
      query.semester = String(semester);
    }

    const students = await Student.find(query)
      .select("name usn department semester email biometricConsent role status createdAt")
      .sort({ name: 1 });

    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch student directory." });
  }
});

// Face index for browser recognition - only consented students with valid templates
router.get("/face-index", async (_req, res) => {
  try {
    const students = await Student.find({
      biometricConsent: true,
      faceDescriptor: { $exists: true, $ne: [] }
    }).select("+faceDescriptor name usn department semester");

    const faceData = students
      .filter(s => Array.isArray(s.faceDescriptor) && s.faceDescriptor.length === 128)
      .map(s => ({
        id: s._id,
        name: s.name,
        usn: s.usn,
        department: s.department,
        semester: s.semester,
        descriptor: s.faceDescriptor
      }));

    res.json(faceData);
  } catch (err) {
    res.status(500).json({ message: "Could not load biometric face index." });
  }
});

// Get single student details and attendance history
router.get("/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    const attendanceHistory = await Attendance.find({ student: student._id })
      .sort({ entryTime: -1 })
      .limit(30);

    res.json({ student, history: attendanceHistory });
  } catch (err) {
    res.status(500).json({ message: "Could not retrieve student details." });
  }
});

// Update student profile
router.put("/:id", async (req, res) => {
  try {
    const { name, department, semester, email, status } = req.body;
    const update = {};
    if (name) update.name = name.trim();
    if (department) update.department = department.trim();
    if (semester) update.semester = String(semester).trim();
    if (email !== undefined) update.email = email.trim().toLowerCase();
    if (status) update.status = status;

    const student = await Student.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!student) return res.status(404).json({ message: "Student not found." });

    res.json({ message: "Student record updated successfully.", student });
  } catch (err) {
    res.status(500).json({ message: "Failed to update student profile." });
  }
});

// Consent withdrawal - purge biometric template
router.post("/:id/revoke-consent", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    student.biometricConsent = false;
    student.faceDescriptor = [];
    await student.save();

    res.json({
      message: `Biometric consent revoked for ${student.name}. Facial templates permanently erased.`,
      student
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to revoke biometric consent." });
  }
});

// Delete student and all associated attendance records
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found." });

    await Attendance.deleteMany({ student: student._id });

    res.json({ message: `Student ${student.name} (${student.usn}) and attendance records removed.` });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete student record." });
  }
});

module.exports = router;
