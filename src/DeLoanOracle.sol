// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LoanContract {
    enum LoanStatus { PENDING, APPROVED, REJECTED, TRANSFERRED, REPAID }

    struct Loan {
        address borrower;
        uint256 amount;
        uint256 interest;
        uint256 duration;
        LoanStatus status;
        uint256 remainingAmount;
        uint256 createdAt;
    }

    uint256 public loanCounter;
    mapping(uint256 => Loan) public loans;

    address public owner;
    address public oracle;

    event LoanApplied(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanStatusUpdated(uint256 indexed loanId, LoanStatus status, uint256 remainingAmount);
    event LoanFinalized(uint256 indexed loanId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Not oracle");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    function applyLoan(uint256 amount, uint256 interest, uint256 duration) external returns (uint256) {
        loanCounter++;
        loans[loanCounter] = Loan({
            borrower: msg.sender,
            amount: amount,
            interest: interest,
            duration: duration,
            status: LoanStatus.PENDING,
            remainingAmount: amount + interest,
            createdAt: block.timestamp
        });

        emit LoanApplied(loanCounter, msg.sender, amount);
        return loanCounter;
    }

    function updateLoanStatus(uint256 loanId, LoanStatus newStatus, uint256 remainingAmount) external onlyOracle {
        Loan storage loan = loans[loanId];

        // Validasi transisi status (opsional tapi direkomendasikan)
        require(
            isValidStatusTransition(loan.status, newStatus),
            "Invalid status transition"
        );

        loan.status = newStatus;
        loan.remainingAmount = remainingAmount;

        emit LoanStatusUpdated(loanId, newStatus, remainingAmount);
    }

    function finalizeLoan(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        require(loan.borrower == msg.sender, "Not your loan");
        require(loan.status == LoanStatus.TRANSFERRED, "Loan not ready for finalization");

        loan.status = LoanStatus.REPAID;
        emit LoanFinalized(loanId);
    }

    function isValidStatusTransition(LoanStatus current, LoanStatus next) internal pure returns (bool) {
        if (current == LoanStatus.PENDING) {
            return next == LoanStatus.APPROVED || next == LoanStatus.REJECTED;
        } else if (current == LoanStatus.APPROVED) {
            return next == LoanStatus.TRANSFERRED;
        } else if (current == LoanStatus.TRANSFERRED) {
            return next == LoanStatus.REPAID;
        } else {
            return false;
        }
    }

    function getLoan(uint256 loanId) external view returns (
        address borrower,
        uint256 amount,
        uint256 interest,
        uint256 duration,
        LoanStatus status,
        uint256 remainingAmount,
        uint256 createdAt
    ) {
        Loan memory loan = loans[loanId];
        return (
            loan.borrower,
            loan.amount,
            loan.interest,
            loan.duration,
            loan.status,
            loan.remainingAmount,
            loan.createdAt
        );
    }
}
