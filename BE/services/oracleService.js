const { ethers } = require('ethers');
const Loan = require('../models/BankLoanRequest');

// Smart contract ABI untuk Oracle functions
const ORACLE_ABI = [
  {
    "inputs": [
      {"name": "_loanId", "type": "uint256"},
      {"name": "_status", "type": "string"}
    ],
    "name": "updateLoanStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_loanId", "type": "uint256"}],
    "name": "seizeCollateralIfOverdue",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_loanId", "type": "uint256"}],
    "name": "isLoanOverdue",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "uint256"}],
    "name": "loanStatus",
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
];

class OracleService {
  constructor() {
    // Setup provider dan wallet
    this.provider = new ethers.JsonRpcProvider(
      process.env.RPC_URL || 'http://localhost:8545'
    );
    
    // Oracle private key (should be environment variable)
    const privateKey = process.env.ORACLE_PRIVATE_KEY || 
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Anvil default
    
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    // Setup contract
    this.contractAddress = process.env.DELOAN_CONTRACT_ADDRESS || 
      '0x5FbDB2315678afecb367f032d93F642f64180aa3';
    
    this.contract = new ethers.Contract(
      this.contractAddress,
      ORACLE_ABI,
      this.wallet
    );
    
    console.log(`🔮 Oracle Service initialized`);
    console.log(`   Contract: ${this.contractAddress}`);
    console.log(`   Oracle Address: ${this.wallet.address}`);
    
    // Sync interval (default: 30 seconds)
    this.syncInterval = parseInt(process.env.ORACLE_SYNC_INTERVAL || '30000');
    this.isRunning = false;
  }

  // Start oracle service
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Oracle already running');
      return;
    }

    try {
      console.log('🚀 Starting Oracle Service...');
      
      // Initial health check
      const health = await this.healthCheck();
      if (!health.isConnected) {
        throw new Error('Failed to connect to blockchain');
      }

      this.isRunning = true;
      
      // Start periodic sync
      this.syncIntervalId = setInterval(() => {
        this.syncStatusUpdates().catch(error => {
          console.error('❌ Error in periodic sync:', error);
        });
      }, this.syncInterval);

      // Initial sync
      await this.syncStatusUpdates();
      
      console.log(`✅ Oracle Service started successfully`);
      console.log(`   Sync interval: ${this.syncInterval}ms`);
      
    } catch (error) {
      console.error('❌ Failed to start Oracle Service:', error);
      this.isRunning = false;
    }
  }

  // Stop oracle service
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Oracle not running');
      return;
    }

    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    this.isRunning = false;
    console.log('🛑 Oracle Service stopped');
  }

  // Main sync function: MongoDB → Smart Contract
  async syncStatusUpdates() {
    try {
      console.log('🔄 Syncing status updates...');
      
      // 1. Get loans yang status-nya berubah di MongoDB tapi belum di-sync ke blockchain
      const loansToSync = await this.getLoansToSync();
      
      if (loansToSync.length === 0) {
        console.log('✅ No loans to sync');
        return;
      }

      console.log(`📋 Found ${loansToSync.length} loans to sync`);

      // 2. Update smart contract untuk setiap loan
      for (const loan of loansToSync) {
        await this.updateContractStatus(loan);
      }

      // 3. Check untuk overdue loans yang perlu disita
      await this.checkOverdueLoans();
      
      console.log('✅ Sync completed');
      
    } catch (error) {
      console.error('❌ Error in syncStatusUpdates:', error);
    }
  }

  // Get loans yang perlu di-sync ke blockchain
  async getLoansToSync() {
    try {
      // Cari loans yang statusnya approved/rejected di MongoDB 
      // tapi belum di-sync ke smart contract
      const loans = await Loan.find({
        $or: [
          { 
            status: 'approved', 
            bankApproved: true,
            $or: [
              { synced: { $ne: true } },
              { synced: { $exists: false } }
            ]
          },
          { 
            status: 'rejected', 
            bankApproved: false,
            $or: [
              { synced: { $ne: true } },
              { synced: { $exists: false } }
            ]
          }
        ]
      }).limit(10); // Batch processing

      return loans;
    } catch (error) {
      console.error('❌ Error getting loans to sync:', error);
      return [];
    }
  }

  // Update status di smart contract
  async updateContractStatus(loan) {
    try {
      console.log(`📤 Updating contract status for loan ${loan.loanId}: ${loan.status}`);
      
      // Send transaction untuk update status
      const tx = await this.contract.updateLoanStatus(
        loan.loanId,
        loan.status,
        {
          gasLimit: 100000 // Set gas limit
        }
      );

      console.log(`⏳ Transaction sent: ${tx.hash}`);
      
      // Wait untuk confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`✅ Status updated successfully for loan ${loan.loanId}`);
        
        // Mark as synced di MongoDB
        loan.synced = true;
        loan.lastSyncAt = new Date();
        loan.lastTransactionHash = tx.hash;
        await loan.save();
        
      } else {
        console.error(`❌ Transaction failed for loan ${loan.loanId}`);
      }
      
    } catch (error) {
      console.error(`❌ Error updating contract status for loan ${loan.loanId}:`, error);
      
      // Mark error di MongoDB
      loan.syncError = error.message;
      loan.lastSyncAttempt = new Date();
      await loan.save();
    }
  }

  // Check overdue loans dan seize collateral
  async checkOverdueLoans() {
    try {
      // Get active loans yang overdue
      const overdueLoans = await Loan.find({
        status: 'active',
        dueDate: { $lt: new Date() }
      });

      if (overdueLoans.length === 0) {
        return;
      }

      console.log(`⚠️  Found ${overdueLoans.length} overdue loans`);

      for (const loan of overdueLoans) {
        await this.seizeCollateralIfNeeded(loan);
      }
      
    } catch (error) {
      console.error('❌ Error checking overdue loans:', error);
    }
  }

  // Seize collateral untuk overdue loan
  async seizeCollateralIfNeeded(loan) {
    try {
      console.log(`🔒 Checking if collateral should be seized for loan ${loan.loanId}`);
      
      // Check di smart contract apakah benar-benar overdue
      const isOverdue = await this.contract.isLoanOverdue(loan.loanId);
      
      if (!isOverdue) {
        console.log(`✅ Loan ${loan.loanId} not overdue on-chain`);
        return;
      }

      // Send transaction untuk seize collateral
      const tx = await this.contract.seizeCollateralIfOverdue(
        loan.loanId,
        {
          gasLimit: 150000
        }
      );

      console.log(`⏳ Seizing collateral transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`✅ Collateral seized successfully for loan ${loan.loanId}`);
        
        // Update status di MongoDB
        loan.status = 'seized';
        loan.seizedAt = new Date();
        loan.lastTransactionHash = tx.hash;
        await loan.save();
        
      } else {
        console.error(`❌ Failed to seize collateral for loan ${loan.loanId}`);
      }
      
    } catch (error) {
      console.error(`❌ Error seizing collateral for loan ${loan.loanId}:`, error);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const network = await this.provider.getNetwork();
      const balance = await this.wallet.provider.getBalance(this.wallet.address);
      const blockNumber = await this.provider.getBlockNumber();
      
      // Test contract call
      const contractCode = await this.provider.getCode(this.contractAddress);
      
      return {
        isConnected: true,
        network: network.name,
        chainId: network.chainId.toString(),
        blockNumber,
        oracleAddress: this.wallet.address,
        oracleBalance: ethers.formatEther(balance),
        contractAddress: this.contractAddress,
        contractDeployed: contractCode !== '0x',
        isRunning: this.isRunning,
        syncInterval: this.syncInterval
      };
      
    } catch (error) {
      console.error('❌ Oracle health check failed:', error);
      return {
        isConnected: false,
        error: error.message
      };
    }
  }
}

module.exports = OracleService;