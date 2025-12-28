const express = require("express");
const Attendance = require("../Models/Attendance.model");

const router = express.Router();

/* =========================================
   GET MONTHLY ATTENDANCE
   GET /api/attendance/monthly?year=2025&month=12
========================================= */
router.get("/monthly", async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ message: "Year and month required" });
    }

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const records = await Attendance.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .sort({ date: 1 })
      .lean();

    res.json({ records });
  } catch (err) {
    console.error("Monthly attendance error:", err);
    res.status(500).json({ message: "Failed to fetch monthly attendance" });
  }
});

module.exports = router;
