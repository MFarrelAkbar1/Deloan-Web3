// loanEventListener.js
require("dotenv").config();
const { JsonRpcProvider, Contract } = require("ethers");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

function startListener() {
  const provider = new JsonRpcProvider(process.env.RPC_URL);
  const contractAddress = process.env.DELOAN_SIMPLE_CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    console.error("❌ DELOAN_SIMPLE_CONTRACT_ADDRESS not set in .env");
    return;
  }
  
  const contractABI = [
    "event LoanApplied(uint256 indexed loanId, address indexed borrower, uint256 amount, string username, string reason, uint256 durationDays, string bankAccount)"
  ];

  const contract = new Contract(contractAddress, contractABI, provider);
  const apiUrl = process.env.API_BASE_URL || "http://localhost:5000";

  console.log(`🎧 Event Listener started`);
  console.log(`📋 Contract: ${contractAddress}`);
  console.log(`🌐 API URL: ${apiUrl}/loan`);

  contract.on("LoanApplied", async (loanId, borrower, amount, username, reason, durationDays, bankAccount) => {
    console.log(`📢 LoanApplied detected!
    loanId=${loanId},
    borrower=${borrower},
    amount=${amount.toString()},
    username=${username},
    reason=${reason},
    durationDays=${durationDays.toString()},
    bankAccount=${bankAccount}`);

    try {
      const response = await fetch(`${apiUrl}/loan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: Number(loanId.toString()),
          borrowerWallet: borrower,
          amount: Number(amount.toString()),
          username: username,
          remainingAmount: Number(amount.toString()),
          reason: reason,
          durationDays: Number(durationDays.toString()),
          bankAccount: bankAccount
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Loan saved to MongoDB:", data);
    } catch (error) {
      console.error("❌ Failed to save loan:", error.message);
    }
  });

  contract.on("error", (error) => {
    console.error("❌ Contract event error:", error.message);
  });

  console.log("✅ Listening for LoanApplied events from DeLoanSimple...");
}

// Export function yang benar
module.exports = { startListener };

// Jika file ini dijalankan langsung
if (require.main === module) {
  startListener();
}