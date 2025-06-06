const mongoose = require("mongoose");

const bankLoanRequestSchema = new mongoose.Schema({
  // Data dari smart contract event
  loanId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  borrowerWallet: { 
    type: String, 
    required: true,
    index: true
  },
  
  // Loan details (from blockchain)
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  collateral: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  remainingAmount: { 
    type: Number, 
    required: true,
    min: 0,
    default: function() { return this.amount; }
  },
  
  interestRate: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  duration: { 
    type: Number, 
    required: true,
    min: 1
  },
  
  // Additional user data (filled manually atau via form)
  username: { 
    type: String,
    default: function() { return `user_${this.loanId}`; }
  },
  
  bankAccount: String,
  reason: String,
  
  // Bank approval status (PURE OFF-CHAIN)
  status: {
    type: String,
    enum: [
      "pending",     // Menunggu approval bank
      "approved",    // Disetujui bank → akan di-sync ke smart contract
      "rejected",    // Ditolak bank → akan di-sync ke smart contract
      "active",      // Aktif di smart contract (auto-update dari oracle)
      "repaid",      // Sudah dilunasi (auto-update dari oracle)
      "seized"       // Collateral disita (auto-update dari oracle)
    ],
    default: "pending",
    index: true
  },
  
  bankApproved: { 
    type: Boolean, 
    default: false,
    index: true
  },
  
  // === ORACLE SYNC FIELDS ===
  synced: {
    type: Boolean,
    default: false,
    index: true
  },
  
  lastSyncAt: Date,
  lastSyncAttempt: Date,
  syncError: String,
  
  // Timestamps
  requestedAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  
  approvedAt: Date,
  rejectedAt: Date,
  activeAt: Date,
  repaidAt: Date,
  seizedAt: Date,
  
  // Admin data
  adminNotes: String,
  rejectionReason: String,
  processedBy: String,
  
  // Blockchain data
  transactionHash: String,      // Hash saat request loan
  lastTransactionHash: String,  // Hash transaksi terakhir
  blockNumber: Number,          // Block number saat loan dibuat
  
  // Payment history
  paymentHistory: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    transactionHash: String,
    remainingAfter: Number
  }],
  
  // Due date (calculated dari blockchain data)
  dueDate: Date,
  
  // Additional metadata
  collateralToken: {
    type: String,
    default: "ETH"
  },
  
  collateralRatio: {
    type: String,
    default: "0"
  },
  
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  }
  
}, {
  timestamps: true,
  collection: 'bankLoanRequests'
});

// Indexes untuk performance
bankLoanRequestSchema.index({ loanId: 1 });
bankLoanRequestSchema.index({ borrowerWallet: 1, status: 1 });
bankLoanRequestSchema.index({ username: 1, status: 1 });
bankLoanRequestSchema.index({ status: 1, createdAt: -1 });
bankLoanRequestSchema.index({ bankApproved: 1, status: 1 });
bankLoanRequestSchema.index({ synced: 1, status: 1 }); // For oracle
bankLoanRequestSchema.index({ dueDate: 1, status: 1 }); // For overdue check

// Virtual fields
bankLoanRequestSchema.virtual('paymentProgress').get(function() {
  if (this.amount === 0) return 100;
  return ((this.amount - this.remainingAmount) / this.amount * 100).toFixed(2);
});

bankLoanRequestSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status !== 'active') return false;
  return new Date() > this.dueDate;
});

bankLoanRequestSchema.virtual('syncStatus').get(function() {
  if (this.synced) return 'synced';
  if (this.syncError) return 'error';
  if (this.lastSyncAttempt) return 'pending';
  return 'not_synced';
});

// Instance methods untuk bank admin
bankLoanRequestSchema.methods.approveByBank = function(adminNotes = '', processedBy = '') {
  this.status = 'approved';
  this.bankApproved = true;
  this.approvedAt = new Date();
  this.adminNotes = adminNotes;
  this.processedBy = processedBy;
  this.synced = false; // Mark untuk oracle sync
  return this.save();
};

bankLoanRequestSchema.methods.rejectByBank = function(reason = '', processedBy = '') {
  this.status = 'rejected';
  this.bankApproved = false;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.processedBy = processedBy;
  this.synced = false; // Mark untuk oracle sync
  return this.save();
};

// Static methods
bankLoanRequestSchema.statics.getPendingLoans = function() {
  return this.find({ 
    status: 'pending', 
    bankApproved: false 
  }).sort({ createdAt: -1 });
};

bankLoanRequestSchema.statics.getLoansToSync = function() {
  return this.find({
    $or: [
      { status: 'approved', synced: false },
      { status: 'rejected', synced: false }
    ]
  });
};

bankLoanRequestSchema.statics.getOverdueLoans = function() {
  return this.find({
    status: 'active',
    dueDate: { $lt: new Date() }
  });
};

// Pre-save middleware
bankLoanRequestSchema.pre('save', function(next) {
  // Calculate due date when status becomes active
  if (this.isModified('status') && this.status === 'active' && !this.dueDate) {
    const durationMs = this.duration * 1000; // duration dari smart contract dalam detik
    this.dueDate = new Date(Date.now() + durationMs);
    this.activeAt = new Date();
  }
  
  // Reset sync status when status changes
  if (this.isModified('status') && ['approved', 'rejected'].includes(this.status)) {
    this.synced = false;
    this.syncError = null;
  }
  
  next();
});

module.exports = mongoose.model("BankLoanRequest", bankLoanRequestSchema);