const mongoose = require("mongoose");

const feeSchema = new mongoose.Schema({
    feeName: { type: String, required: true },
    feeType: { type: String, enum: ["Tuition", "Transport", "Hostel", "Exam", "Library"], required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    lateFeePenalty: { type: Number, default: 0 },
    applicableClasses: { type: String },
    createdAt: { type: Date, default: Date.now },
  });

  module.exports = mongoose.model("Fee", feeSchema);
  