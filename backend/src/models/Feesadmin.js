const mongoose=require("mongoose");

const adminSchema = new mongoose.Schema({
    adminId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["SuperAdmin", "FinanceManager", "Principal"], default: "FinanceManager" },
    createdAt: { type: Date, default: Date.now },
  });
  
  module.exports = mongoose.model("Admin", adminSchema);
