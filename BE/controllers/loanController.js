const Loan = require("../models/LoanRequest");

// Ambil semua pinjaman
exports.getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find();
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Setujui pinjaman dan ubah status jadi "transferred"
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

// Buat pinjaman baru, data dari on-chain listener
exports.createLoan = async (req, res) => {
  try {
    const { loanId, borrowerWallet, amount, reason, durationDays, bankAccount } = req.body;

    // Validasi input
    if (!loanId || !borrowerWallet || !amount || amount <= 0 || !durationDays) {
      return res.status(400).json({ error: "Data pinjaman tidak lengkap atau tidak valid" });
    }

    const newLoan = new Loan({
      loanId,
      borrowerWallet,
      amount,
      remainingAmount: amount,  // Set sisa pinjaman awal sama dengan amount
      reason,
      durationDays,
      bankAccount,
      status: "pending", // status awal pinjaman
    });

    await newLoan.save();
    res.status(201).json(newLoan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Proses pembayaran cicilan pinjaman
exports.payLoan = async (req, res) => {
  try {
    const { amount } = req.body;

    // Validasi cicilan
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Cicilan harus lebih dari 0" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    // Pastikan pinjaman sudah ditransfer (aktif)
    if (loan.status !== "transferred") {
      return res.status(400).json({ error: "Loan is not active" });
    }

    // Kurangi sisa pinjaman, jangan sampai negatif
    loan.remainingAmount = Math.max(loan.remainingAmount - amount, 0);

    // Jika lunas, ubah status
    if (loan.remainingAmount === 0) {
      loan.status = "repaid";
    }

    await loan.save();

    res.json({
      message: "💸 Cicilan berhasil diproses",
      remainingAmount: loan.remainingAmount,
      status: loan.status,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
