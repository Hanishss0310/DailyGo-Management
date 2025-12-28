const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
const AttendanceModel = require("../Models/Attendance.model");

const router = express.Router();

/* ================= ALLOWED USERS ================= */
const ALLOWED_USERS = [
  { name: "ANURAG", email: "chowdhuryanurag96@gmail.com", mobile: "9019426166" },
  { name: "AJAY", email: "ajoyK3594@gmail.com", mobile: "8134012458" },
  { name: "BIJOY", email: "karmakarbijoy580@gmail.com", mobile: "7349120741" },
  { name: "JITU", email: "jitutanti634@gmail.com", mobile: "7397068491" },
  { name: "HANISH", email: "hanishgowda7795@gmail.com", mobile: "9449201025" },
  { name: "YASHASWINI", email: "yashaswini01025@gmail.com", mobile: "9449201025" },
];

/* ================= MAIL CONFIG ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "donotreply.dailygolive@gmail.com",
    pass: "lxwo ozxs cwfw izjb",
  },
});

transporter.verify((err) => {
  if (err) console.error("❌ Mail server error:", err);
  else console.log("✅ Mail server ready");
});

/* ================= OTP STORE (RESET ON RESTART) ================= */
const otpStore = {};

/* ================= ABSENT MAIL DAILY LOCK ================= */
const absentMailLock = {};

/* ================= FILE UPLOAD ================= */
const uploadDir = path.join(__dirname, "../uploads/attendance");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

/* =================================================
   REQUEST OTP
================================================= */
router.post("/request-otp", upload.single("photo"), async (req, res) => {
  try {
    const { name, email, mobile, location } = req.body;
    if (!name || !email || !mobile || !location || !req.file) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = ALLOWED_USERS.find(
      (u) => u.email === normalizedEmail && u.mobile === mobile
    );

    if (!user) {
      return res.status(403).json({ message: "Unauthorized user" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore[normalizedEmail] = {
      otp,
      expiry: Date.now() + 2 * 60 * 1000,
      payload: {
        name: user.name,
        email: normalizedEmail,
        mobile,
        location,
        photo: req.file.filename,
      },
    };

    await transporter.sendMail({
      from: `"DailyGo Attendance" <donotreply.dailygolive@gmail.com>`,
      to: normalizedEmail,
      subject: "Your Attendance OTP",
      html: `
        <h2>DailyGo Attendance</h2>
        <p>Hello ${user.name},</p>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>Valid for 2 minutes.</p>
      `,
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "OTP generation failed" });
  }
});

/* =================================================
   VERIFY OTP & SAVE TO MONGODB
================================================= */
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const record = otpStore[normalizedEmail];
    if (!record) return res.status(400).json({ message: "OTP not requested" });

    if (record.otp !== otp || record.expiry < Date.now()) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    const today = new Date().toISOString().split("T")[0];

    /* DB DUPLICATE CHECK */
    const exists = await AttendanceModel.findOne({
      email: normalizedEmail,
      date: today,
    });

    if (exists) {
      return res.status(409).json({ message: "Attendance already marked" });
    }

    await AttendanceModel.create({
      ...record.payload,
      date: today,
      status: "PRESENT",
    });

    delete otpStore[normalizedEmail];

    res.json({ message: "Attendance marked successfully" });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ message: "Database save failed" });
  }
});

/* =================================================
   AUTO ABSENT MAIL + DB INSERT (AFTER 10 AM)
================================================= */
setInterval(async () => {
  const now = new Date();
  if (now.getHours() < 10) return;

  const today = now.toISOString().split("T")[0];
  if (!absentMailLock[today]) absentMailLock[today] = new Set();

  for (const user of ALLOWED_USERS) {
    if (absentMailLock[today].has(user.email)) continue;

    const marked = await AttendanceModel.findOne({
      email: user.email,
      date: today,
    });

    if (!marked) {
      await AttendanceModel.create({
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        location: "N/A",
        photo: "absent",
        date: today,
        status: "ABSENT",
      });

      await transporter.sendMail({
        from: `"DailyGo Attendance" <donotreply.dailygolive@gmail.com>`,
        to: user.email,
        subject: "Absent Notification",
        html: `<p>You are marked ABSENT for ${today}</p>`,
      });

      absentMailLock[today].add(user.email);
      console.log(`📩 Absent mail sent to ${user.email}`);
    }
  }
}, 5 * 60 * 1000);

module.exports = router;
