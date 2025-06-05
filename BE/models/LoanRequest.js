const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
  loanId: { type: String, required: true, unique: true },
  borrowerWallet: String,
  amount: Number,
  reason: String,
  durationDays: Number,
  bankAccount: String,
  status: {
    type: String,
    enum: ["pending", "approved", "transferred", "repaid", "defaulted"],
    default: "pending",
  },
});

module.exports = mongoose.model("LoanRequest", loanSchema);
