// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract DeLoanBankApproval {
    struct Loan {
        address borrower;
        uint256 amount;
        uint256 collateral;
        uint256 interestRate;
        uint256 duration;
        uint256 startTime;
        bool isActive;
        bool isRepaid;
        bool collateralLocked;
    }

    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public userLoans;
    mapping(uint256 => string) public loanStatus; // Oracle status
    
    uint256 public nextLoanId;
    address public owner;
    address public oracle;
    
    // Events
    event LoanApplied(
        uint256 indexed loanId, 
        address indexed borrower, 
        uint256 amount, 
        uint256 collateral,
        uint256 interestRate,
        uint256 duration,
        uint256 timestamp
    );
    event LoanStatusUpdated(uint256 indexed loanId, string status);
    event LoanFinalized(uint256 indexed loanId, bool approved, bool collateralReturned);
    event CollateralSeized(uint256 indexed loanId, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle || msg.sender == owner, "Not oracle");
        _;
    }

    constructor() {
        owner = msg.sender;
        oracle = msg.sender;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
    }

    // 1. User mengajukan pinjaman
    function applyLoan(
        uint256 _amount,
        uint256 _durationDays,
        uint256 _interestRate
    ) external payable returns (uint256) {
        require(msg.value > 0, "Collateral required");
        require(_amount > 0, "Loan amount must be greater than 0");
        require(_durationDays > 0, "Duration must be greater than 0");
        require(msg.value * 100 >= _amount * 150, "Insufficient collateral ratio");

        uint256 loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            amount: _amount,
            collateral: msg.value,
            interestRate: _interestRate,
            duration: _durationDays * 1 days,
            startTime: 0,
            isActive: false,
            isRepaid: false,
            collateralLocked: true
        });

        userLoans[msg.sender].push(loanId);
        loanStatus[loanId] = "pending";

        emit LoanApplied(
            loanId,
            msg.sender,
            _amount,
            msg.value,
            _interestRate,
            _durationDays,
            block.timestamp
        );

        return loanId;
    }

    // 2. Oracle update status
    function updateLoanStatus(uint256 _loanId, string memory _status) external onlyOracle {
        require(bytes(loanStatus[_loanId]).length > 0, "Loan not found");
        loanStatus[_loanId] = _status;
        
        emit LoanStatusUpdated(_loanId, _status);
        
        if (keccak256(bytes(_status)) == keccak256(bytes("approved"))) {
            _activateLoan(_loanId);
        }
        
        if (keccak256(bytes(_status)) == keccak256(bytes("rejected"))) {
            _returnCollateral(_loanId);
        }
    }

    // 3. Internal function activate loan
    function _activateLoan(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        require(!loan.isActive, "Loan already active");
        require(loan.collateralLocked, "Collateral not locked");
        
        loan.isActive = true;
        loan.startTime = block.timestamp;
        
        require(address(this).balance >= loan.amount, "Insufficient contract balance");
        payable(loan.borrower).transfer(loan.amount);
    }

    // 4. Internal function return collateral
    function _returnCollateral(uint256 _loanId) internal {
        Loan storage loan = loans[_loanId];
        require(loan.collateralLocked, "Collateral already returned");
        
        loan.collateralLocked = false;
        payable(loan.borrower).transfer(loan.collateral);
        
        emit LoanFinalized(_loanId, false, true);
    }

    // 5. User repay loan
    function repayLoan(uint256 _loanId) external payable {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Not your loan");
        require(loan.isActive, "Loan not active");
        require(!loan.isRepaid, "Loan already repaid");
        require(
            keccak256(bytes(loanStatus[_loanId])) == keccak256(bytes("approved")),
            "Loan not approved by bank"
        );

        uint256 interest = calculateInterest(_loanId);
        uint256 totalRepayment = loan.amount + interest;
        require(msg.value >= totalRepayment, "Insufficient repayment amount");

        loan.isActive = false;
        loan.isRepaid = true;
        loan.collateralLocked = false;

        payable(msg.sender).transfer(loan.collateral);
        emit LoanFinalized(_loanId, true, true);
    }

    // 6. Seize collateral if overdue
    function seizeCollateralIfOverdue(uint256 _loanId) external onlyOracle {
        Loan storage loan = loans[_loanId];
        require(loan.isActive, "Loan not active");
        require(!loan.isRepaid, "Loan already repaid");
        require(
            block.timestamp > loan.startTime + loan.duration,
            "Loan not overdue yet"
        );
        require(
            keccak256(bytes(loanStatus[_loanId])) == keccak256(bytes("approved")),
            "Can only seize approved loans"
        );

        loan.isActive = false;
        loan.collateralLocked = false;

        payable(owner).transfer(loan.collateral);
        emit CollateralSeized(_loanId, loan.collateral);
        emit LoanFinalized(_loanId, true, false);
    }

    // ✅ DIPECAH MENJADI BEBERAPA FUNCTION UNTUK MENGHINDARI STACK TOO DEEP

    // Get basic loan info
    function getLoanBasicInfo(uint256 _loanId) external view returns (
        address borrower,
        uint256 amount,
        uint256 collateral,
        uint256 interestRate
    ) {
        Loan memory loan = loans[_loanId];
        return (
            loan.borrower,
            loan.amount,
            loan.collateral,
            loan.interestRate
        );
    }

    // Get loan timing info
    function getLoanTimingInfo(uint256 _loanId) external view returns (
        uint256 startTime,
        uint256 dueDate,
        uint256 duration
    ) {
        Loan memory loan = loans[_loanId];
        return (
            loan.startTime,
            loan.startTime + loan.duration,
            loan.duration
        );
    }

    // Get loan status info
    function getLoanStatusInfo(uint256 _loanId) external view returns (
        bool isActive,
        bool isRepaid,
        bool collateralLocked,
        string memory status
    ) {
        Loan memory loan = loans[_loanId];
        return (
            loan.isActive,
            loan.isRepaid,
            loan.collateralLocked,
            loanStatus[_loanId]
        );
    }

    // Get all loan details (simplified version)
    function getLoanDetails(uint256 _loanId) external view returns (
        address borrower,
        uint256 amount,
        uint256 collateral,
        bool isActive,
        string memory status
    ) {
        Loan memory loan = loans[_loanId];
        return (
            loan.borrower,
            loan.amount,
            loan.collateral,
            loan.isActive,
            loanStatus[_loanId]
        );
    }

    // Helper functions
    function calculateInterest(uint256 _loanId) public view returns (uint256) {
        Loan memory loan = loans[_loanId];
        if (!loan.isActive || loan.startTime == 0) return 0;

        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 interest = (loan.amount * loan.interestRate * timeElapsed) / (365 days * 100);
        return interest;
    }

    function isLoanOverdue(uint256 _loanId) public view returns (bool) {
        Loan memory loan = loans[_loanId];
        if (!loan.isActive || loan.startTime == 0) return false;
        return block.timestamp > loan.startTime + loan.duration;
    }

    function getUserLoans(address _user) external view returns (uint256[] memory) {
        return userLoans[_user];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}
}