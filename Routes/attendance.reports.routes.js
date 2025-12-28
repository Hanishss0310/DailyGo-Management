const express = require("express");
const PDFDocument = require("pdfkit");
const Attendance = require("../Models/Attendance.model");

const router = express.Router();

/* ============================================
   EXPORT MONTHLY ATTENDANCE REGISTER (PDF)
   GET /api/attendance/export-pdf
============================================ */
router.get("/export-pdf", async (req, res) => {
  const { year, month, email } = req.query;

  if (!year || !month) {
    return res.status(400).json({ message: "Year & month required" });
  }

  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const query = { date: { $gte: startDate, $lte: endDate } };
  if (email) query.email = email;

  const records = await Attendance.find(query).lean();

  /* GROUP BY EMPLOYEE */
  const employees = {};
  records.forEach((r) => {
    if (!employees[r.email]) {
      employees[r.email] = { name: r.name, attendance: {} };
    }
    employees[r.email].attendance[r.date] = r.status;
  });

  /* PDF SETUP */
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 25,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=attendance-${month}-${year}.pdf`
  );

  doc.pipe(res);

  /* ===== HEADER ===== */
  doc
    .font("Times-Bold")
    .fontSize(14)
    .text("DAILY ATTENDANCE REGISTER", { align: "center" });

  doc
    .moveDown(0.3)
    .font("Times-Roman")
    .fontSize(10)
    .text(
      `For the month of ${new Date(year, month - 1).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      })}`,
      { align: "center" }
    );

  doc.moveDown(1);

  /* ===== TABLE CONFIG ===== */
  const daysInMonth = new Date(year, month, 0).getDate();
  const startX = doc.page.margins.left;
  let y = doc.y;

  const cellH = 18;
  const snoW = 30;
  const nameW = 140;
  const dayW = 18;

  const today = new Date().toISOString().split("T")[0];

  /* ===== DRAW HEADER ROW ===== */
  doc.font("Times-Bold").fontSize(8);

  drawCell(doc, startX, y, snoW, cellH, "S.No");
  drawCell(doc, startX + snoW, y, nameW, cellH, "Name");

  for (let d = 1; d <= daysInMonth; d++) {
    drawCell(
      doc,
      startX + snoW + nameW + (d - 1) * dayW,
      y,
      dayW,
      cellH,
      d.toString()
    );
  }

  y += cellH;

  /* ===== DATA ROWS ===== */
  doc.font("Times-Roman").fontSize(8);
  let index = 1;

  for (const emp of Object.values(employees)) {
    drawCell(doc, startX, y, snoW, cellH, index.toString());
    drawCell(doc, startX + snoW, y, nameW, cellH, emp.name);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const status = emp.attendance[dateStr];

      let mark = "";
      if (dateStr <= today) {
        if (status === "PRESENT") mark = "P";
        else if (status === "ABSENT") mark = "A";
      }

      drawCell(
        doc,
        startX + snoW + nameW + (d - 1) * dayW,
        y,
        dayW,
        cellH,
        mark
      );
    }

    y += cellH;
    index++;

    /* PAGE BREAK */
    if (y > doc.page.height - 50) {
      doc.addPage({ layout: "landscape" });
      y = doc.page.margins.top;
    }
  }

  doc.end();
});

/* ============================================
   HELPER: DRAW CELL WITH BORDER + CENTER TEXT
============================================ */
function drawCell(doc, x, y, w, h, text) {
  doc.rect(x, y, w, h).stroke();
  doc.text(text, x, y + 5, {
    width: w,
    align: "center",
  });
}

module.exports = router;
