// oracleService.js
require("dotenv").config();
const { JsonRpcProvider, Contract, Wallet } = require("ethers");
const Loan = require("./models/LoanRequest");

class OracleService {
  constructor() {
    // Validasi environment variables
    this.validateEnvVars();
    
    this.provider = new JsonRpcProvider(process.env.RPC_URL);
    
    // Validasi dan create wallet
    try {
      this.wallet = new Wallet(process.env.ORACLE_PRIVATE_KEY, this.provider);
      console.log(`🔑 Oracle wallet address: ${this.wallet.address}`);
    } catch (error) {
      throw new Error(`Invalid ORACLE_PRIVATE_KEY: ${error.message}`);
    }
    
    this.contractAddress = process.env.DELOAN_SIMPLE_CONTRACT_ADDRESS;
    this.contractABI = [
      "function updateLoanStatus(uint256 _loanId, uint8 _status) external",
      "function batchUpdateStatus(uint256[] _loanIds, uint8[] _statuses) external",
      "function getOracleStatus(uint256 _loanId) external view returns (uint8)",
      "function owner() external view returns (address)",
      "function oracle() external view returns (address)"
    ];
    
    this.contract = new Contract(this.contractAddress, this.contractABI, this.wallet);
    
    // Mapping status MongoDB ke Smart Contract
    this.statusMapping = {
      "pending": 0,    // Pending
      "approved": 1,   // Approved  
      "transferred": 3, // Transferred
      "rejected": 2,   // Rejected
      "repaid": 4,     // Repaid
      "defaulted": 5   // Defaulted
    };
  }

  validateEnvVars() {
    const required = [
      'RPC_URL',
      'ORACLE_PRIVATE_KEY',
      'DELOAN_SIMPLE_CONTRACT_ADDRESS'
    ];

    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    // Validate private key format
    const privateKey = process.env.ORACLE_PRIVATE_KEY;
    if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
      throw new Error('ORACLE_PRIVATE_KEY must be a valid hex string starting with 0x and 66 characters long');
    }
  }

  // Check oracle permissions
  async checkPermissions() {
    try {
      const oracleAddress = await this.contract.oracle();
      const ownerAddress = await this.contract.owner();
      
      console.log(`📋 Contract Owner: ${ownerAddress}`);
      console.log(`🔮 Contract Oracle: ${oracleAddress}`);
      console.log(`🔑 Wallet Address: ${this.wallet.address}`);
      
      if (this.wallet.address.toLowerCase() !== oracleAddress.toLowerCase()) {
        console.warn(`⚠️  Warning: Wallet address doesn't match contract oracle address`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("❌ Failed to check permissions:", error.message);
      return false;
    }
  }

  // Sync single loan status
  async syncLoanStatus(loanId, status) {
    try {
      const contractStatus = this.statusMapping[status];
      if (contractStatus === undefined) {
        console.error(`❌ Unknown status: ${status}`);
        return false;
      }

      console.log(`🔄 Syncing loan ${loanId}: ${status} (${contractStatus})`);
      
      // Estimate gas first
      try {
        const gasEstimate = await this.contract.updateLoanStatus.estimateGas(loanId, contractStatus);
        console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
      } catch (gasError) {
        console.error(`❌ Gas estimation failed: ${gasError.message}`);
        return false;
      }
      
      const tx = await this.contract.updateLoanStatus(loanId, contractStatus);
      console.log(`📝 Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Synced loan ${loanId} - Block: ${receipt.blockNumber}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to sync loan ${loanId}:`, error.message);
      return false;
    }
  }

  // Batch sync multiple loans (lebih efisien)
  async batchSyncLoans() {
    try {
      // Ambil loans yang statusnya berubah dari MongoDB
      const loans = await Loan.find({
        status: { $in: ["approved", "rejected", "transferred", "repaid", "defaulted"] }
      });

      if (loans.length === 0) {
        console.log("📭 No loans to sync");
        return true;
      }

      const loanIds = [];
      const statuses = [];

      for (const loan of loans) {
        const contractStatus = this.statusMapping[loan.status];
        if (contractStatus !== undefined) {
          // Check if already synced
          try {
            const currentStatus = await this.contract.getOracleStatus(loan.loanId);
            if (Number(currentStatus) !== contractStatus) {
              loanIds.push(loan.loanId);
              statuses.push(contractStatus);
            }
          } catch (error) {
            // If can't read status, add to sync list
            loanIds.push(loan.loanId);
            statuses.push(contractStatus);
          }
        }
      }

      if (loanIds.length === 0) {
        console.log("📭 All loans already synced");
        return true;
      }

      console.log(`🔄 Batch syncing ${loanIds.length} loans...`);
      
      // Estimate gas first
      try {
        const gasEstimate = await this.contract.batchUpdateStatus.estimateGas(loanIds, statuses);
        console.log(`⛽ Estimated gas for batch: ${gasEstimate.toString()}`);
      } catch (gasError) {
        console.error(`❌ Batch gas estimation failed: ${gasError.message}`);
        return false;
      }
      
      const tx = await this.contract.batchUpdateStatus(loanIds, statuses);
      console.log(`📝 Batch transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`✅ Batch synced ${loanIds.length} loans - Block: ${receipt.blockNumber}`);
      return true;
    } catch (error) {
      console.error("❌ Batch sync failed:", error.message);
      return false;
    }
  }

  // Check if loan status is in sync
  async isStatusInSync(loanId, mongoStatus) {
    try {
      const contractStatus = await this.contract.getOracleStatus(loanId);
      const expectedStatus = this.statusMapping[mongoStatus];
      
      return Number(contractStatus) === expectedStatus;
    } catch (error) {
      console.error(`❌ Failed to check sync status for loan ${loanId}:`, error.message);
      return false;
    }
  }

  // Monitor dan sync otomatis
  async startMonitoring(intervalMinutes = 5) {
    console.log(`🤖 Oracle monitoring started (every ${intervalMinutes} minutes)`);
    
    // Check permissions first
    const hasPermissions = await this.checkPermissions();
    if (!hasPermissions) {
      console.error("❌ Oracle doesn't have proper permissions");
      return;
    }
    
    const interval = intervalMinutes * 60 * 1000;
    
    // Initial sync
    console.log("🔍 Initial sync...");
    await this.batchSyncLoans();
    
    setInterval(async () => {
      console.log("🔍 Periodic sync check...");
      await this.batchSyncLoans();
    }, interval);
  }

  // Manual sync specific loan
  async manualSync(loanId) {
    try {
      const loan = await Loan.findOne({ loanId });
      if (!loan) {
        console.error(`❌ Loan ${loanId} not found in MongoDB`);
        return false;
      }

      return await this.syncLoanStatus(loanId, loan.status);
    } catch (error) {
      console.error(`❌ Manual sync failed for loan ${loanId}:`, error.message);
      return false;
    }
  }
}

module.exports = OracleService;