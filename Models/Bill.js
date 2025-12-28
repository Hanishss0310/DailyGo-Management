const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true },
    execId: { type: String, required: true },
    salesExecutive: { type: String, required: true },
    storeName: { type: String, required: true },
    // ... (other fields remain same)
    items: [], // (keep your items array definition)
    subTotal: Number,
    grandTotal: Number,
    // NEW FIELD
    pdfPath: { type: String } 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bill", billSchema);