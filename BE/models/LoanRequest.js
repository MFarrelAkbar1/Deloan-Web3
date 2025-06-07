const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  loanId: { type: String, required: true, unique: true },
  borrowerWallet: String,
  amount: Number,
  remainingAmount: Number, // 💡 tambahkan ini
  reason: String,
  durationDays: Number,
  bankAccount: String,
  username: String,
  status: {
    type: String,
    enum: [
      "pending", 
      "approved", 
      "rejected",     // ✅ TAMBAHKAN INI
      "transferred", 
      "repaid", 
      "defaulted"
    ],
    default: "pending",
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("LoanRequest", loanSchema);