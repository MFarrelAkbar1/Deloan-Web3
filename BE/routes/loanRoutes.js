const express = require("express");
const router = express.Router();

// Legacy routes untuk compatibility
// Hanya endpoint dasar untuk menghindari error

router.get("/", (req, res) => {
  res.json({
    message: "Legacy loan routes",
    note: "Use /bank-loan/* for new bank approval system",
    availableEndpoints: [
      "GET /bank-loan/pending",
      "POST /bank-loan/approve/:loanId", 
      "GET /bank-loan/user/:username"
    ]
  });
});

router.get("/health", (req, res) => {
  res.json({ status: "Legacy routes working" });
});

module.exports = router;