const Loan = require("../models/BankLoanRequest");

// ===== ADMIN BANK CONTROLLER (PURE OFF-CHAIN) =====

// 1. Ambil semua pengajuan pinjaman yang pending
exports.getPendingLoans = async (req, res) => {
 try {
   const pendingLoans = await Loan.find({
     status: "pending",
     bankApproved: false
   }).sort({ createdAt: -1 });
  
   res.json({
     success: true,
     count: pendingLoans.length,
     data: pendingLoans,
     message: "Pending loans retrieved successfully"
   });
 } catch (err) {
   res.status(500).json({
     success: false,
     error: err.message
   });
 }
};

// 2. Bank admin approve pinjaman (PURE OFF-CHAIN)
exports.approveLoanByBank = async (req, res) => {
 try {
   const { loanId } = req.params;
   const { adminNotes, processedBy } = req.body;

   const loan = await Loan.findOne({ loanId });
   if (!loan) {
     return res.status(404).json({
       success: false,
       error: "Pinjaman tidak ditemukan"
     });
   }

   if (loan.status !== "pending") {
     return res.status(400).json({
       success: false,
       error: "Hanya pinjaman dengan status pending yang bisa disetujui"
     });
   }

   // Update status - Oracle akan sync ke smart contract
   await loan.approveByBank(adminNotes, processedBy);

   res.json({
     success: true,
     message: "Pinjaman telah disetujui bank. Oracle akan sync ke blockchain.",
     data: {
       loanId: loan.loanId,
       status: loan.status,
       bankApproved: loan.bankApproved,
       approvedAt: loan.approvedAt,
       synced: loan.synced
     }
   });
 } catch (err) {
   res.status(500).json({
     success: false,
     error: err.message
   });
 }
};

// 3. Bank admin reject pinjaman (PURE OFF-CHAIN)
exports.rejectLoanByBank = async (req, res) => {
 try {
   const { loanId } = req.params;
   const { rejectionReason, processedBy } = req.body;

   const loan = await Loan.findOne({ loanId });
   if (!loan) {
     return res.status(404).json({
       success: false,
       error: "Pinjaman tidak ditemukan"
     });
   }

   if (loan.status !== "pending") {
     return res.status(400).json({
       success: false,
       error: "Hanya pinjaman dengan status pending yang bisa ditolak"
     });
   }

   // Update status - Oracle akan sync ke smart contract
   await loan.rejectByBank(rejectionReason, processedBy);

   res.json({
     success: true,
     message: "Pinjaman telah ditolak. Oracle akan sync ke blockchain.",
     data: {
       loanId: loan.loanId,
       status: loan.status,
       bankApproved: loan.bankApproved,
       rejectedAt: loan.rejectedAt,
       rejectionReason: loan.rejectionReason,
       synced: loan.synced
     }
   });
 } catch (err) {
   res.status(500).json({
     success: false,
     error: err.message
   });
 }
};

// 4. Dashboard stats untuk bank admin
exports.getBankDashboardStats = async (req, res) => {
 try {
   const stats = await Promise.all([
     Loan.countDocuments({ status: "pending" }),
     Loan.countDocuments({ status: "approved" }),
     Loan.countDocuments({ status: "active" }),
     Loan.countDocuments({ status: "repaid" }),
     Loan.countDocuments({ status: "defaulted" }),
     Loan.aggregate([
       { $match: { status: "active" } },
       { $group: { _id: null, total: { $sum: "$amount" } } }
     ]),
     Loan.aggregate([
       { $match: { status: "repaid" } },
       { $group: { _id: null, total: { $sum: "$amount" } } }
     ])
   ]);

   const [
     pendingCount,
     approvedCount,
     activeCount,
     repaidCount,
     defaultedCount,
     activeAmount,
     repaidAmount
   ] = stats;

   res.json({
     success: true,
     stats: {
       pending: pendingCount,
       approved: approvedCount,
       active: activeCount,
       repaid: repaidCount,
       defaulted: defaultedCount,
       totalActiveAmount: activeAmount[0]?.total || 0,
       totalRepaidAmount: repaidAmount[0]?.total || 0
     }
   });
 } catch (err) {
   res.status(500).json({
     success: false,
     error: err.message
   });
 }
};

// 5. Ambil pinjaman berdasarkan username
exports.getLoansByUsername = async (req, res) => {
 try {
   const { username } = req.params;
  
   const loans = await Loan.find({ username }).sort({ createdAt: -1 });
  
   res.json({
     success: true,
     count: loans.length,
     data: loans
   });
 } catch (err) {
   res.status(500).json({
     success: false,
     error: err.message
   });
 }
};


// 5.1. (BARU) Ambil pinjaman berdasarkan alamat wallet
exports.getLoansByWallet = async (req, res) => {
  try {
    const { walletAddress } = req.params;
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: "Wallet address is required" });
    }
    // Cari berdasarkan borrowerWallet (case-insensitive) untuk memastikan kecocokan
    const loans = await Loan.find({ borrowerWallet: new RegExp(`^${walletAddress}$`, 'i') }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: loans.length,
      data: loans
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};


// 6. Update user data (username, bank account, reason)
exports.updateUserData = async (req, res) => {
 try {
   const { loanId } = req.params;
   const { username, bankAccount, reason } = req.body;

   const loan = await Loan.findOne({ loanId });
   if (!loan) {
     return res.status(404).json({
       success: false,
       error: "Pinjaman tidak ditemukan"
     });
   }

   // Update user data
   if (username) loan.username = username;
   if (bankAccount) loan.bankAccount = bankAccount;
   if (reason) loan.reason = reason;

   await loan.save();

   res.json({
     success: true,
     message: "Data user berhasil diupdate",
     data: {
       loanId: loan.loanId,
       username: loan.username,
       bankAccount: loan.bankAccount,
       reason: loan.reason
     }
   });
 } catch (err) {
   res.status(500).json({
     success: false,
     error: err.message
   });
 }
};

// ===== ORACLE INTEGRATION ENDPOINTS =====

// 7. Get loans yang perlu di-sync ke blockchain
exports.getLoansToSync = async (req, res) => {
 try {
   const loansToSync = await Loan.getLoansToSync();
  
   res.json({
     success: true,
     count: loansToSync.length,
     data: loansToSync
   });
 } catch (err) {
   res.status(500).json({
     success: false,
     error: err.message
   });
 }
};

// 8. Mark loan as synced (called by oracle)
exports.markLoanSynced = async (req, res) => {
 try {
   const { loanId } = req.params;
   const { transactionHash, error } = req.body;

   const loan = await Loan.findOne({ loanId });
   if (!loan) {
     return res.status(404).json({
       success: false,
       error: "Pinjaman tidak ditemukan"
     });
   }

   if (error) {
     loan.syncError = error;
     loan.lastSyncAttempt = new Date();
   } else {
     loan.synced = true;
     loan.lastSyncAt = new Date();
     loan.syncError = null;
     if (transactionHash) {
       loan.lastTransactionHash = transactionHash;
     }
   }

   await loan.save();

   res.json({
     success: true,
     message: error ? "Sync error recorded" : "Loan marked as synced",
     data: {
       loanId: loan.loanId,
       synced: loan.synced,
       lastSyncAt: loan.lastSyncAt,
       syncError: loan.syncError
     }
   });
 } catch (err) {
   res.status(500).json({
     success: false,
     error: err.message
   });
 }
};

// 9. Update loan status dari blockchain events
exports.updateLoanFromBlockchain = async (req, res) => {
 try {
   const { loanId } = req.params;
   const { status, transactionHash, blockNumber } = req.body;

   const validStatuses = ["active", "repaid", "seized"];
   if (!validStatuses.includes(status)) {
     return res.status(400).json({
       success: false,
       error: "Status tidak valid"
     });
   }

   const loan = await Loan.findOne({ loanId });
   if (!loan) {
     return res.status(404).json({
       success: false,
       error: "Pinjaman tidak ditemukan"
     });
   }

   // Update status from blockchain
   loan.status = status;
   loan.lastTransactionHash = transactionHash;
   loan.blockNumber = blockNumber;

   if (status === "active") {
     loan.activeAt = new Date();
   } else if (status === "repaid") {
     loan.repaidAt = new Date();
     loan.remainingAmount = 0;
   } else if (status === "seized") {
     loan.seizedAt = new Date();
   }

   await loan.save();

   res.json({
     success: true,
     message: `Status pinjaman berhasil diupdate dari blockchain: ${status}`,
     data: loan
   });
 } catch (err) {
   res.status(500).json({
     success: false,
     error: err.message
   });
 }
};
