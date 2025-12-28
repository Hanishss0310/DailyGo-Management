const express = require("express");
const router = express.Router();
const Bill = require("../Models/Bill");
const multer = require("multer");
const path = require("path");

// --- CONFIG: Multer ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    cb(null, "invoice-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage });

// --- ROUTE 1: CREATE BILL (Data Only) ---
// Generates the ID and saves the text data
router.post("/", async (req, res) => {
  try {
    const { execId, storeName, salesExecutive } = req.body;

    // 1. Generate Invoice Number
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
      const lastSequenceStr = lastBill.invoiceNo.split("-").pop();
      const lastSequenceNum = parseInt(lastSequenceStr, 10);
      nextSequence = (lastSequenceNum + 1).toString().padStart(3, "0");
    }
    const newInvoiceNo = `${invoicePrefix}${nextSequence}`;

    // 2. Save Data (Without PDF path initially)
    const newBill = new Bill({
      ...req.body,
      invoiceNo: newInvoiceNo,
      pdfPath: "" // Will be updated in step 2
    });

    const savedBill = await newBill.save();
    res.status(201).json(savedBill); // Return the ID to frontend

  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// --- ROUTE 2: UPLOAD PDF (Update Bill) ---
// Finds the bill by ID and adds the PDF file path
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

// --- ROUTE 3: GET ALL ---
router.get("/", async (req, res) => {
    try {
      const bills = await Bill.find().sort({ createdAt: -1 });
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bills" });
    }
});

module.exports = router;