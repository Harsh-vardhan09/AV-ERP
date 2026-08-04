const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
studentid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
 
      feeId: { type: mongoose.Schema.Types.ObjectId, ref: "Fee" },
      totalfees:{type:String},
      amountDue: { type: Number, required: true },
      amountPaid: { type: Number, default: 0 },
      dueDate: { type: Date, required: true },
      discuntamount: { type:Number , default: 0 },
      status: { type: String, enum: ["Paid", "Pending", "Overdue"], default: "Pending" },
      createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Studentfee", studentSchema);