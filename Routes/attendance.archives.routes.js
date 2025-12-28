const express = require("express");
const Attendance = require("../Models/Attendance.model");

const router = express.Router();

/* =========================================
   GET AVAILABLE ARCHIVE MONTHS
   GET /api/attendance/archives
========================================= */
router.get("/archives", async (req, res) => {
  try {
    const records = await Attendance.aggregate([
      {
        $project: {
          year: { $substr: ["$date", 0, 4] },
          month: { $substr: ["$date", 5, 2] },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 },
      },
      {
        $limit: 3, // last 3 months
      },
    ]);

    const result = records.map((r) => ({
      year: Number(r._id.year),
      month: Number(r._id.month),
    }));

    res.json(result);
  } catch (err) {
    console.error("Archives fetch error:", err);
    res.status(500).json({ message: "Failed to fetch archives" });
  }
});

module.exports = router;
