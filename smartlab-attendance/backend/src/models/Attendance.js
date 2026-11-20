const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  entryTime: { type: Date, required: true, default: Date.now },
  exitTime: { type: Date, default: null },
  durationMinutes: { type: Number, default: null },
  status: { type: String, enum: ["INSIDE", "COMPLETED"], default: "INSIDE" },
  mode: { type: String, enum: ["FACE_RECOGNITION", "MANUAL"], default: "FACE_RECOGNITION" },
  lab: { type: String, default: "Technical Lab" },
  remarks: { type: String, default: "" },
  markedBy: { type: String, default: "Face Scan" }
}, { timestamps: true });

attendanceSchema.index({ student: 1, status: 1 });
attendanceSchema.index({ entryTime: -1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
