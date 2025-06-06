const express = require("express");
const router = express.Router();
const {
 getPendingLoans,
 approveLoanByBank,
 rejectLoanByBank,
 getBankDashboardStats,
 getLoansByUsername,
 getLoansByWallet, // IMPORT FUNGSI BARU
 updateUserData,
 getLoansToSync,
 markLoanSynced,
 updateLoanFromBlockchain
} = require("../controllers/bankLoanController");

// ===== BANK ADMIN ROUTES =====

// GET /bank-loan/pending - Ambil semua pengajuan yang menunggu approval
router.get("/pending", getPendingLoans);

// POST /bank-loan/approve/:loanId - Bank menyetujui pinjaman
router.post("/approve/:loanId", approveLoanByBank);

// POST /bank-loan/reject/:loanId - Bank menolak pinjaman 
router.post("/reject/:loanId", rejectLoanByBank);

// GET /bank-loan/dashboard - Stats untuk dashboard bank admin
router.get("/dashboard", getBankDashboardStats);

// ===== USER ROUTES =====

// GET /bank-loan/user/:username - Ambil semua pinjaman berdasarkan username
router.get("/user/:username", getLoansByUsername);

// (BARU) GET /bank-loan/wallet/:walletAddress - Ambil semua pinjaman berdasarkan alamat wallet
router.get("/wallet/:walletAddress", getLoansByWallet);

// PATCH /bank-loan/user-data/:loanId - Update user data
router.patch("/user-data/:loanId", updateUserData);

// ===== ORACLE INTEGRATION ROUTES =====

// GET /bank-loan/oracle/to-sync - Get loans yang perlu di-sync ke blockchain
router.get("/oracle/to-sync", getLoansToSync);

// POST /bank-loan/oracle/mark-synced/:loanId - Mark loan as synced (called by oracle)
router.post("/oracle/mark-synced/:loanId", markLoanSynced);

// PATCH /bank-loan/oracle/update-from-blockchain/:loanId - Update loan dari blockchain events
router.patch("/oracle/update-from-blockchain/:loanId", updateLoanFromBlockchain);

module.exports = router;
