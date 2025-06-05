const Loan = require("../models/LoanRequest");

exports.getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find();
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveLoan = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    loan.status = "transferred";
    await loan.save();

    res.json({ message: "Loan approved and marked as transferred", loan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Untuk menyimpan data dari on-chain listener
exports.createLoan = async (req, res) => {
  try {
    const { loanId, borrowerWallet, amount, reason, durationDays, bankAccount } = req.body;

    const newLoan = new Loan({
      loanId,
      borrowerWallet,
      amount,
      reason,
      durationDays,
      bankAccount,
    });

    await newLoan.save();
    res.status(201).json(newLoan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
