const express = require("express");
const Attendance = require("../Models/Attendance.model");

const router = express.Router();

/* =========================================
   GET TODAY'S DASHBOARD ATTENDANCE
   GET /api/attendance/dashboard-today
========================================= */
router.get("/dashboard-today", async (req, res) => {
  try {
    // ✅ Generate today's date EXACTLY like it was stored
    const today = new Date()
      .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    // en-CA → YYYY-MM-DD

    console.log("📅 Dashboard fetch for date:", today);

    const records = await Attendance.find({
      date: today,
      status: "PRESENT",
    })
      .sort({ verifiedAt: -1 })
      .lean();

    const TOTAL_STAFF = 30;
    const presentCount = records.length;
    const absentCount = Math.max(TOTAL_STAFF - presentCount, 0);

    res.json({
      totalStaff: TOTAL_STAFF,
      present: presentCount,
      absent: absentCount,
      attendance: records.map((r) => ({
        name: r.name,
        email: r.email,
        time: new Date(r.verifiedAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        photo: r.photo,
        bg: "6366f1",
      })),
    });
  } catch (err) {
    console.error("❌ Dashboard fetch error:", err);
    res.status(500).json({ message: "Failed to load dashboard data" });
  }
});

module.exports = router;
