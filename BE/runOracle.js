// runOracle.js
require("dotenv").config();
require("./db/connection"); // Connect to MongoDB
const OracleService = require("./oracleService");

async function runOracle() {
  try {
    console.log("🚀 Starting DeLoan Oracle Service...");
    
    const oracle = new OracleService();
    
    // Start monitoring dengan interval 2 menit
    await oracle.startMonitoring(2);
    
    console.log("✅ Oracle service running!");
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log("🛑 Oracle service shutting down...");
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log("🛑 Oracle service shutting down...");
      process.exit(0);
    });
    
  } catch (error) {
    console.error("❌ Failed to start oracle:", error.message);
    process.exit(1);
  }
}

// Export function untuk digunakan di index.js (opsional)
module.exports = { runOracle };

// Jika file ini dijalankan langsung
if (require.main === module) {
  runOracle();
}