export function exportRecordsToCSV(records, filename = "SmartLab_Attendance_Report.csv") {
  if (!records || !records.length) {
    alert("No records to export.");
    return;
  }

  const headers = [
    "Student Name",
    "USN",
    "Department",
    "Semester",
    "Status",
    "Mode",
    "Lab",
    "Entry Date",
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

  const rows = records.map((r) => {
    const entryDate = r.entryTime ? new Date(r.entryTime) : null;
    const exitDate = r.exitTime ? new Date(r.exitTime) : null;

    return [
      escapeCSV(r.student?.name || "N/A"),
      escapeCSV(r.student?.usn || "N/A"),
      escapeCSV(r.student?.department || "N/A"),
      escapeCSV(r.student?.semester || "N/A"),
      escapeCSV(r.status || "N/A"),
      escapeCSV(r.mode || "FACE_RECOGNITION"),
      escapeCSV(r.lab || "Technical Lab"),
      escapeCSV(entryDate ? entryDate.toLocaleDateString() : ""),
      escapeCSV(entryDate ? entryDate.toLocaleTimeString() : ""),
      escapeCSV(exitDate ? exitDate.toLocaleTimeString() : (r.status === "INSIDE" ? "Still Inside" : "")),
      escapeCSV(r.durationMinutes !== null && r.durationMinutes !== undefined ? r.durationMinutes : (r.status === "INSIDE" ? "Active" : "-")),
      escapeCSV(r.markedBy || "Face Scan"),
      escapeCSV(r.remarks || "")
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
