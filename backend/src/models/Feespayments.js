const mongoose=require("mongoose");

const transactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, refPath: "userType", required: true },
    amount: { type: Number, required: true },
    transactionDate: { type: Date, default: Date.now },
    method: { type: String, enum: ["Cash", "Card", "Bank Transfer", "UPI"], required: true },
    transactionId: { type: String, unique: true },
    status: { type: String, enum: ["Success", "Failed", "Pending"], default: "Success" },
  });
  
  module.exports = mongoose.model("Transaction", transactionSchema);