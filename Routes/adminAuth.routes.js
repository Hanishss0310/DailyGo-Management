const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

/* ================= ALLOWED ADMIN USERS ================= */
const ALLOWED_ADMINS = [
  {
    name: "Kiran GS",
    email: "Kirangowdakiru0198@gmail.com".toLowerCase(),
  },
  {
    name: "Hanish S.S",
    email: "hanishgowda7795@gmail.com".toLowerCase(),
  },
];

/* ================= MAIL CONFIG ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "donotreply.dailygolive@gmail.com",
    pass: "lxwo ozxs cwfw izjb", // Gmail App Password
  },
});

transporter.verify((err) => {
  if (err) {
    console.error("❌ Mail server error:", err);
  } else {
    console.log("✅ Mail server ready (Admin OTP)");
  }
});

/* ================= OTP STORE (IN MEMORY) ================= */
/*
  {
    email: {
      otp: "1234",
      expiry: timestamp,
      attempts: number
    }
  }
*/
const otpStore = {};

/* ================= HELPERS ================= */
const generateOtp = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

/* ======================================================
   SEND / RESEND OTP
   POST /api/admin/send-otp
====================================================== */
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const admin = ALLOWED_ADMINS.find(
      (a) => a.email === normalizedEmail
    );

    if (!admin) {
      return res.status(403).json({ message: "Unauthorized admin email" });
    }

    const otp = generateOtp();

    otpStore[normalizedEmail] = {
      otp,
      expiry: Date.now() + 5 * 60 * 1000, // 5 minutes
      attempts: 0,
    };

    await transporter.sendMail({
      from: `"DailyGo Admin Login" <donotreply.dailygolive@gmail.com>`,
      to: normalizedEmail,
      subject: "Admin Login OTP",
      html: `
        <div style="font-family: Arial, sans-serif">
          <h2>DailyGo Admin Login</h2>
          <p>Hello <b>${admin.name}</b>,</p>
          <p>Your One-Time Password (OTP) is:</p>
          <h1 style="letter-spacing: 4px">${otp}</h1>
          <p>This OTP is valid for <b>5 minutes</b>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <br/>
          <small>© DailyGo Management</small>
        </div>
      `,
    });

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("Send OTP Error:", err);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
});

/* ======================================================
   VERIFY OTP
   POST /api/admin/verify-otp
====================================================== */
router.post("/verify-otp", (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const record = otpStore[normalizedEmail];

    if (!record) {
      return res.status(400).json({ message: "OTP not requested" });
    }

    if (record.expiry < Date.now()) {
      delete otpStore[normalizedEmail];
      return res.status(401).json({ message: "OTP expired" });
    }

    record.attempts += 1;
    if (record.attempts > 5) {
      delete otpStore[normalizedEmail];
      return res.status(429).json({ message: "Too many attempts" });
    }

    if (record.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // ✅ Success
    delete otpStore[normalizedEmail];

    return res.json({
      message: "OTP verified successfully",
      admin: {
        email: normalizedEmail,
      },
    });
  } catch (err) {
    console.error("Verify OTP Error:", err);
    return res.status(500).json({ message: "OTP verification failed" });
  }
});

module.exports = router;
