const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const OperatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    mobile: {
      type: String,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false, // never returned unless explicitly requested
    },

    otp: {
      type: String,
      default: null,
    },

    otpExpiry: {
      type: Date,
      default: null,
      index: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* =================================================
   EMAIL NORMALIZATION (DATA SAFETY)
================================================= */
OperatorSchema.pre("save", function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  next();
});

/* =================================================
   PASSWORD HASHING (SAFE, SINGLE HASH)
================================================= */
OperatorSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();

    // Guard against double hashing
    if (this.password.startsWith("$2a$") || this.password.startsWith("$2b$")) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (error) {
    next(error);
  }
});

/* =================================================
   PASSWORD COMPARISON (USE THIS EVERYWHERE)
================================================= */
OperatorSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

module.exports = mongoose.model("Operator", OperatorSchema);
