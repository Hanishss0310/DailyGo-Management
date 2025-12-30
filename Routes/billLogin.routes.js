const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const router = express.Router();

/* =================================================
   IN-MEMORY OPERATORS (SOURCE OF TRUTH)
================================================= */
const operators = [
  {
    id: "1",
    name: "Shashi Kumar K",
    email: "kshashigowda91@gmail.com",
    password: "Shashi@DG2025",
    mobile: "9035224169",
    isVerified: false,
    otp: null,
    otpExpiry: null,
  },
  {
    id: "2",
    name: "M Pavan Kumar",
    email: "mpavank2@gmail.com",
    password: "Pavan@DG2025",
    mobile: "9019589074",
    isVerified: false,
    otp: null,
    otpExpiry: null,
  },
  {
    id: "3",
    name: "Shridhara M",
    email: "kittyshri47@gmail.com",
    password: "Shridhar@DG2025",
    mobile: "9620740080",
    isVerified: false,
    otp: null,
    otpExpiry: null,
  },
  {
  id: "4",
  name: "Kiran GS",
  email: "kirangowdakiru0198@gmail.com",
  password: "Kiran@DG2025",
  mobile: "9036210198",
  isVerified: false,
  otp: null,
  otpExpiry: null,
  },

  {
    id: "4",
    name: "Shivaraj N",
    email: "shivarajpulagam@okicici",
    password: "Shivaraj@DG2025",
    mobile: "9880051298",
    isVerified: false,
    otp: null,
    otpExpiry: null,
  },
  {
    id: "5",
    name: "Hanish S.S",
    email: "hanishgowda7795@gmail.com",
    password: "Hanish@DG2025",
    mobile: "9449201025",
    isVerified: false,
    otp: null,
    otpExpiry: null,
  },
];

/* =================================================
   HASH PASSWORDS ON SERVER START (ONCE)
================================================= */
(async () => {
  for (const user of operators) {
    if (!user.password.startsWith("$2")) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  }
  console.log("✅ In-memory operators initialized");
})();

/* ================= MAIL CONFIG ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "donotreply.dailygolive@gmail.com",
    pass: "lxwo ozxs cwfw izjb",
  },
});

/* ================= OTP GENERATOR ================= */
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* =================================================
   SEND OTP
   POST /api/bill-login/send-otp
================================================= */
router.post("/send-otp", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const operator = operators.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );

  if (!operator) {
    return res.status(401).json({ message: "Unauthorized operator" });
  }

  const isMatch = await bcrypt.compare(password, operator.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const otp = generateOTP();

  operator.otp = otp;
  operator.otpExpiry = Date.now() + 2 * 60 * 1000;
  operator.isVerified = false;

  await transporter.sendMail({
    from: `"DailyGo Billing" <donotreply.dailygolive@gmail.com>`,
    to: operator.email,
    subject: "Your Bill Login OTP",
    html: `
      <h2>DailyGo Billing System</h2>
      <p>Hello ${operator.name},</p>
      <h1>${otp}</h1>
      <p>Valid for 2 minutes</p>
    `,
  });

  return res.json({ message: "OTP sent successfully" });
});

/* =================================================
   VERIFY OTP
   POST /api/bill-login/verify-otp
================================================= */
router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  const normalizedEmail = email.toLowerCase().trim();

  const operator = operators.find(
    (u) => u.email.toLowerCase() === normalizedEmail
  );

  if (!operator) {
    return res.status(404).json({ message: "User not found" });
  }

  if (
    operator.otp !== otp ||
    !operator.otpExpiry ||
    operator.otpExpiry < Date.now()
  ) {
    return res.status(401).json({ message: "Invalid or expired OTP" });
  }

  operator.isVerified = true;
  operator.otp = null;
  operator.otpExpiry = null;

  const token = jwt.sign(
    { id: operator.id, role: "operator" },
    process.env.JWT_SECRET || "DEV_SECRET",
    { expiresIn: "1d" }
  );

  return res.json({
    message: "Login successful",
    token,
    operator: {
      id: operator.id,
      name: operator.name,
      email: operator.email,
    },
  });
});

module.exports = router;
