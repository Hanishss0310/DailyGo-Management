const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

/* ===================== APP INIT ===================== */
const app = express();
app.set("trust proxy", 1); 
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

/* ===================== 1. LOGGING ===================== */
app.use(morgan("dev")); 

/* ===================== 2. CORS (FIXED) ===================== */
const allowedOrigins = [
  "https://api-dg3-core-inv5.adminpaymentdailygo.co.in",
  "https://adminpaymentdailygo.co.in",
  "https://dailygo-office-manage.firebaseapp.com",
  "http://localhost:3000"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      console.log("❌ CORS BLOCKED Origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  exposedHeaders: ["Content-Disposition"],
};

// Apply CORS globally
app.use(cors(corsOptions));

// 🔴 FINAL FIX: Use Regex /.*/ instead of string "*" to prevent path-to-regexp crash
app.options(/.*/, cors(corsOptions)); 

/* ===================== 3. SECURITY ===================== */
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/* ===================== 4. RATE LIMITING ===================== */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests, please try again later.",
  })
);

/* ===================== GLOBAL MIDDLEWARE ===================== */
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

/* ===================== STATIC FILES ===================== */
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* ===================== ROUTES ===================== */
app.use("/api/bill-login", require("./Routes/billLogin.routes"));
app.use("/api/attendance", require("./Routes/attendance.routes"));
app.use("/api/attendance", require("./Routes/attendance.dashboard.routes"));
app.use("/api/admin", require("./Routes/adminAuth.routes"));
app.use("/api/attendance", require("./Routes/attendance.reports.routes"));
app.use("/api/attendance", require("./Routes/attendance.archives.routes"));
app.use("/api/attendance", require("./Routes/attendance.monthly.routes"));
app.use("/api/bills", require("./Routes/billRoutes"));

/* ===================== HEALTH CHECK ===================== */
app.get("/", (req, res) => {
  res.status(200).send("✅ DailyGo Management Server Running");
});

/* ===================== 404 HANDLER ===================== */
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

/* ===================== ERROR HANDLER ===================== */
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
     return res.status(403).json({ message: "CORS Blocked: Origin not allowed" });
  }
  console.error("🔥 Server Error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

/* ===================== START SERVER ===================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});