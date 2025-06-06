const express = require("express");
const router = express.Router();
const loanController = require("../controllers/loanController");

router.get("/", loanController.getAllLoans);
router.post("/", loanController.createLoan);
router.patch("/:id/approve", loanController.approveLoan);
router.patch("/pay/:username", loanController.payLoan);
router.delete("/:username", loanController.deleteLoanByUsername);
router.patch("/:id/reject", loanController.rejectLoan);

module.exports = router;
