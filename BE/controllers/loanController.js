const Loan = require("../models/LoanRequest");
const contract = require("../utils/blockchain");

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

    const tx = await contract.registerLoan(
      ethers.id(loan.loanId),
      loan.borrowerWallet,
      "0x0000000000000000000000000000000000000000", // dummy collateral (bisa NFT nanti)
      1, // tokenId (dummy)
      Math.floor(Date.now() / 1000) + loan.durationDays * 86400 // deadline
    );
    await tx.wait(); 
    console.log(`Transaction successful: ${tx.hash}`);

    res.json({ message: "Loan approved and marked as transferred", loan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectLoan = async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findById(id);

    if (!loan) {
      return res.status(404).json({ error: "Loan not found" });
    }

    if (loan.status !== "pending") {
      return res.status(400).json({ error: "Only pending loans can be rejected" });
    }

    loan.status = "rejected";
    await loan.save();

    res.json({ message: "Loan rejected successfully", status: loan.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Buat pinjaman baru, data dari on-chain listener
exports.createLoan = async (req, res) => {
  try {
    const { loanId, borrowerWallet, amount, reason, durationDays, bankAccount,username } = req.body;

    // Validasi input
    if (!loanId || !borrowerWallet || !username || amount <= 0 || !durationDays || !amount ) {
      return res.status(400).json({ error: "Data pinjaman tidak lengkap atau tidak valid" });
    }

    const newLoan = new Loan({
      loanId,
      username,
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
    const { username } = req.params; // ambil username dari URL
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Cicilan harus lebih dari 0" });
    }

    // Cari pinjaman aktif berdasarkan username
    const loan = await Loan.findOne({ username, status: "transferred" });

    if (!loan) {
      return res.status(404).json({ error: "Loan not found or not active" });
    }

    // Kurangi cicilan
    loan.remainingAmount = Math.max(loan.remainingAmount - amount, 0);
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

exports.deleteLoanByUsername = async (req, res) => {
  try {
    const { username } = req.params;

    const deletedLoan = await Loan.findOneAndDelete({ username });

    if (!deletedLoan) {
      return res.status(404).json({ error: "Loan not found for that username" });
    }

    res.json({ message: `Loan for ${username} deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

