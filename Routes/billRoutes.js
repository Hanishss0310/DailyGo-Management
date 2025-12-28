const express = require("express");
const router = express.Router();
const Bill = require("../Models/Bill");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// --- CONFIG: Multer ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    cb(null, "invoice-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

/* ===================== ALLOWED ORIGINS FOR PDF ===================== */
const allowedOrigins = [
  "https://api-dg3-core-inv5.adminpaymentdailygo.co.in",
  "https://adminpaymentdailygo.co.in",
  "https://dailygo-office-manage.firebaseapp.com",
  "http://localhost:3000"
];

/* ===================== ROUTE 1: CREATE BILL ===================== */
router.post("/", async (req, res) => {
  try {
    const { execId, storeName, salesExecutive } = req.body;

    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const datePrefix = `${yy}${mm}`;
    const invoicePrefix = `${datePrefix}-${execId}-`;

    const lastBill = await Bill.findOne({
      invoiceNo: { $regex: `^${invoicePrefix}` },
    }).sort({ invoiceNo: -1 });

    let nextSequence = "001";
    if (lastBill) {
      const lastSeq = parseInt(lastBill.invoiceNo.split("-").pop());
      nextSequence = (lastSeq + 1).toString().padStart(3, "0");
    }

    const newBill = await Bill.create({
      ...req.body,
      invoiceNo: `${invoicePrefix}${nextSequence}`,
      pdfPath: ""
    });

    res.status(201).json(newBill);

  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ===================== ROUTE 2: UPLOAD PDF ===================== */
router.put("/:id/pdf", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const updatedBill = await Bill.findByIdAndUpdate(
      req.params.id,
      { pdfPath: req.file.path },
      { new: true }
    );

    res.json(updatedBill);
  } catch (error) {
    console.error("Error uploading PDF:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

/* ===================== ROUTE 3: DOWNLOAD PDF (FIXED CORS) ===================== */
router.get("/:id/pdf", async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill || !bill.pdfPath) {
      return res.status(404).json({ error: "PDF not found" });
    }

    const filePath = path.join(__dirname, "..", bill.pdfPath);

    // --- ⭐ CORS FIX for file/PDF download ---
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    }

    // --- send file ---
    res.download(filePath, path.basename(filePath), (err) => {
      if (err) {
        console.error("Error sending PDF:", err);
      }
    });

  } catch (error) {
    console.error("Error fetching PDF:", error);
    res.status(500).json({ error: "Failed to download PDF" });
  }
});

/* ===================== ROUTE 4: GET ALL ===================== */
router.get("/", async (req, res) => {
  try {
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bills" });
  }
});

module.exports = router;
