const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
    teacherId: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    department: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    hireDate: { type: Date, default: Date.now },
  
    salaryDetails: {
      basicSalary: { type: Number, required: true },
      deductions: { type: Number, default: 0 },
      netSalary: { type: Number },
      paymentHistory: [
        {
          amount: Number,
          date: Date,
          method: { type: String, enum: ["Cash", "Bank Transfer"] },
          transactionId: String,
          status: { type: String, enum: ["Success", "Failed"], default: "Success" },
        },
      ],
    },
  
    createdAt: { type: Date, default: Date.now },
  });
  
  module.exports = mongoose.model("Teacher", teacherSchema);
  