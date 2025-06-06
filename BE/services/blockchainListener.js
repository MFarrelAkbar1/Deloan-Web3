const { ethers } = require('ethers');
const Loan = require('../models/BankLoanRequest');

// Smart contract ABI (hanya events yang diperlukan)
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "loanId", "type": "uint256"},
      {"indexed": true, "name": "borrower", "type": "address"},
      {"indexed": false, "name": "amount", "type": "uint256"},
      {"indexed": false, "name": "collateral", "type": "uint256"},
      {"indexed": false, "name": "interestRate", "type": "uint256"},
      {"indexed": false, "name": "duration", "type": "uint256"},
      {"indexed": false, "name": "timestamp", "type": "uint256"}
    ],
    "name": "LoanApplied",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "loanId", "type": "uint256"},
      {"indexed": false, "name": "status", "type": "string"}
    ],
    "name": "LoanStatusUpdated", 
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "name": "loanId", "type": "uint256"},
      {"indexed": false, "name": "approved", "type": "bool"},
      {"indexed": false, "name": "collateralReturned", "type": "bool"}
    ],
    "name": "LoanFinalized",
    "type": "event"
  }
];

class BlockchainEventListener {
  constructor() {
    // Setup provider
    this.provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'http://localhost:8545'
    );
    
    // Setup contract
    this.contractAddress = process.env.DELOAN_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    this.contract = new ethers.Contract(
      this.contractAddress,
      CONTRACT_ABI,
      this.provider
    );
    
    console.log(`🎧 Blockchain Listener initialized for contract: ${this.contractAddress}`);
  }

  // Start listening untuk semua events
  async startListening() {
    try {
      console.log('🚀 Starting blockchain event listener...');
      
      // Listen untuk LoanApplied event
      this.contract.on('LoanApplied', this.handleLoanApplied.bind(this));
      
      // Listen untuk LoanStatusUpdated event
      this.contract.on('LoanStatusUpdated', this.handleLoanStatusUpdated.bind(this));
      
      // Listen untuk LoanFinalized event
      this.contract.on('LoanFinalized', this.handleLoanFinalized.bind(this));
      
      console.log('✅ Event listeners started successfully');
      
    } catch (error) {
      console.error('❌ Error starting event listener:', error);
    }
  }

  // Handle LoanApplied event - Save ke MongoDB
  async handleLoanApplied(loanId, borrower, amount, collateral, interestRate, duration, timestamp, event) {
    try {
      console.log(`📝 New loan application detected:`);
      console.log(`   Loan ID: ${loanId.toString()}`);
      console.log(`   Borrower: ${borrower}`);
      console.log(`   Amount: ${ethers.formatEther(amount)} ETH`);
      
      // Extract transaction details
      const txHash = event.log.transactionHash;
      const blockNumber = event.log.blockNumber;
      
      // Calculate collateral ratio
      const collateralRatio = (Number(ethers.formatEther(collateral)) / Number(ethers.formatEther(amount))) * 100;
      
      // Cek apakah loan sudah ada di database
      const existingLoan = await Loan.findOne({ 
        loanId: loanId.toString() 
      });
      
      if (existingLoan) {
        console.log(`⚠️  Loan ${loanId} already exists in database`);
        return;
      }

      // Save ke MongoDB
      const newLoan = new Loan({
        loanId: loanId.toString(),
        borrowerWallet: borrower,
        amount: Number(ethers.formatEther(amount)),
        collateral: Number(ethers.formatEther(collateral)),
        remainingAmount: Number(ethers.formatEther(amount)),
        interestRate: Number(interestRate.toString()),
        duration: Number(duration.toString()), // duration dalam detik
        status: 'pending',
        bankApproved: false,
        transactionHash: txHash,
        blockNumber: blockNumber,
        requestedAt: new Date(Number(timestamp.toString()) * 1000),
        collateralRatio: collateralRatio.toFixed(2),
        
        // Data yang akan diisi manual oleh admin atau user
        username: `user_${loanId}`, // Default username
        bankAccount: null,
        reason: null
      });

      await newLoan.save();
      
      console.log(`✅ Loan ${loanId} saved to database successfully`);
      
    } catch (error) {
      console.error(`❌ Error handling LoanApplied event:`, error);
    }
  }

  // Handle LoanStatusUpdated event
  async handleLoanStatusUpdated(loanId, status, event) {
    try {
      console.log(`🔄 Loan status updated:`);
      console.log(`   Loan ID: ${loanId.toString()}`);
      console.log(`   New Status: ${status}`);
      
      // Update status di database
      const loan = await Loan.findOne({ loanId: loanId.toString() });
      
      if (!loan) {
        console.log(`⚠️  Loan ${loanId} not found in database`);
        return;
      }

      // Update status based on oracle update
      loan.status = status;
      loan.lastTransactionHash = event.log.transactionHash;
      
      if (status === 'approved') {
        loan.bankApproved = true;
        loan.approvedAt = new Date();
        loan.activeAt = new Date();
      } else if (status === 'rejected') {
        loan.bankApproved = false;
        loan.rejectedAt = new Date();
      }

      await loan.save();
      
      console.log(`✅ Loan ${loanId} status updated to: ${status}`);
      
    } catch (error) {
      console.error(`❌ Error handling LoanStatusUpdated event:`, error);
    }
  }

  // Handle LoanFinalized event
  async handleLoanFinalized(loanId, approved, collateralReturned, event) {
    try {
      console.log(`🏁 Loan finalized:`);
      console.log(`   Loan ID: ${loanId.toString()}`);
      console.log(`   Approved: ${approved}`);
      console.log(`   Collateral Returned: ${collateralReturned}`);
      
      const loan = await Loan.findOne({ loanId: loanId.toString() });
      
      if (!loan) {
        console.log(`⚠️  Loan ${loanId} not found in database`);
        return;
      }

      // Update final status
      if (approved && collateralReturned) {
        loan.status = 'repaid';
        loan.repaidAt = new Date();
        loan.remainingAmount = 0;
      } else if (approved && !collateralReturned) {
        loan.status = 'seized';
        loan.seizedAt = new Date();
      } else {
        loan.status = 'rejected';
      }

      loan.lastTransactionHash = event.log.transactionHash;
      await loan.save();
      
      console.log(`✅ Loan ${loanId} finalized with status: ${loan.status}`);
      
    } catch (error) {
      console.error(`❌ Error handling LoanFinalized event:`, error);
    }
  }

  // Stop listening
  stopListening() {
    try {
      this.contract.removeAllListeners();
      console.log('🛑 Event listeners stopped');
    } catch (error) {
      console.error('❌ Error stopping listeners:', error);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      const contractCode = await this.provider.getCode(this.contractAddress);
      
      return {
        isConnected: true,
        network: network.name,
        chainId: network.chainId.toString(),
        blockNumber,
        contractDeployed: contractCode !== '0x',
        contractAddress: this.contractAddress
      };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        isConnected: false,
        error: error.message
      };
    }
  }
}

module.exports = BlockchainEventListener;