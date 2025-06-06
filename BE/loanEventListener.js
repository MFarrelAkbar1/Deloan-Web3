require("dotenv").config();
const { JsonRpcProvider, Contract } = require("ethers"); // Kompatibel untuk ethers v6
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args)); // Dinamis, dukung ESM

module.exports = function startListener() {
  const provider = new JsonRpcProvider(process.env.RPC_URL); // Ambil dari .env

  const contractAddress = process.env.CONTRACT_ADDRESS; // Juga dari .env
  const contractABI = [
    "event LoanApplied(uint256 indexed loanId, address indexed borrower, uint256 amount, string username)"
  ];

  const contract = new Contract(contractAddress, contractABI, provider);
  const apiUrl = "http://localhost:5000/api/loan";

  contract.on("LoanApplied", async (loanId, borrower, amount, username) => {
    console.log(`📢 LoanApplied detected!
    loanId=${loanId},
    borrower=${borrower},
    amount=${amount.toString()},
    username=${username}`);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: Number(loanId.toString()),
          borrowerWallet: borrower,
          amount: Number(amount.toString()),
          username: username,
          remainingAmount: Number(amount.toString()),
          reason: "from blockchain event",
          durationDays: 30,
          bankAccount: ""
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

  console.log("✅ Listening for LoanApplied events...");
};
