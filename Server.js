const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

/* ===================== APP INIT ===================== */
const app = express();
const PORT = 4000;

/* ===================== DATABASE ===================== */
mongoose
  .connect("mongodb://127.0.0.1:27017/dailygomanagementdb", {
    autoIndex: true,
  })
  .then(() => {
    console.log("✅ MongoDB connected → dailygomanagementdb");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  });

/* ===================== SECURITY ===================== */
/* 🔑 IMPORTANT: allow images across origins */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/* ===================== GLOBAL MIDDLEWARE ===================== */
app.use(cors({ origin: true }));
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(morgan("dev"));

/* ===================== STATIC FILES ===================== */
/* ✅ REQUIRED for attendance photos */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* ===================== ROUTES ===================== */

// 🔐 Bill login (OTP)
app.use("/api/bill-login", require("./Routes/billLogin.routes"));

// 🧾 Attendance (OTP + mark attendance)
app.use("/api/attendance", require("./Routes/attendance.routes"));

// 📊 Dashboard attendance
app.use(
  "/api/attendance",
  require("./Routes/attendance.dashboard.routes")
);

// 👨‍💼 Admin OTP login
app.use("/api/admin", require("./Routes/adminAuth.routes"));

app.use(
  "/api/attendance",
  require("./Routes/attendance.reports.routes")
);


app.use(
  "/api/attendance",
  require("./Routes/attendance.archives.routes")
);


app.use(
  "/api/attendance",
  require("./Routes/attendance.monthly.routes")
);

app.use("/api/bills", require("./Routes/billRoutes"));

/* ===================== HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.status(200).send("✅ DailyGo Management Server Running");
});

/* ===================== 404 HANDLER ===================== */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ===================== GLOBAL ERROR HANDLER ===================== */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

/* ===================== START SERVER ===================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
