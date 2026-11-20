const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  usn: { type: String, required: true, unique: true, uppercase: true, trim: true },
  department: { type: String, required: true, trim: true },
  semester: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  faceDescriptor: { type: [Number], select: false, default: [] },
  biometricConsent: { type: Boolean, required: true, default: false },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" }
}, { timestamps: true });

studentSchema.index({ department: 1 });

module.exports = mongoose.model("Student", studentSchema);
