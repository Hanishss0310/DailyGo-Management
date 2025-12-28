const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    mobile: { type: String, required: true },
    location: { type: String, required: true },
    photo: { type: String, required: true },

    date: {
      type: String, // YYYY-MM-DD
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["PRESENT", "ABSENT"],
      default: "PRESENT",
    },

    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/* Prevent duplicate attendance per user per day */
AttendanceSchema.index({ email: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
