// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract DeLoanOracle {
    // Status sesuai MongoDB enum
    enum LoanStatus {
        PENDING,     // 0 - pending
        APPROVED,    // 1 - approved  
        TRANSFERRED, // 2 - transferred
        REPAID,      // 3 - repaid
        DEFAULTED    // 4 - defaulted
    }

    struct Loan {
        address borrower;
        uint256 amount;
        uint256 collateral;
        uint256 interestRate;
        uint256 startTime;
        bool isActive;
        LoanStatus status;
        uint256 remainingAmount;
        string username;
    }

    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public userLoans;
    mapping(address => bool) public authorizedOracles;
    
    uint256 public nextLoanId;
    address public owner;

    // Price feed untuk ETH
    AggregatorV3Interface public ethPriceFeed;

    // Events
    event LoanApplied(uint256 indexed loanId, address indexed borrower, uint256 amount, string username);
    event LoanStatusUpdated(uint256 indexed loanId, LoanStatus status, uint256 remainingAmount);
    event LoanFinalized(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 collateral);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 totalRepaid);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyOracle() {
        require(authorizedOracles[msg.sender] || msg.sender == owner, "Not authorized oracle");
        _;
    }

    constructor(address _ethPriceFeed) {
        owner = msg.sender;
        authorizedOracles[msg.sender] = true;
        ethPriceFeed = AggregatorV3Interface(_ethPriceFeed);
    }

    // ===== ORACLE MANAGEMENT =====
    
    function authorizeOracle(address _oracle, bool _authorized) external onlyOwner {
        authorizedOracles[_oracle] = _authorized;
    }

    // ===== LOAN APPLICATION =====
    
    function applyLoan(
        uint256 _amount, 
        string memory _username
    ) external returns (uint256) {
        uint256 loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            amount: _amount,
            collateral: 0,
            interestRate: 5, // 5% default
            startTime: 0,
            isActive: false,
            status: LoanStatus.PENDING,
            remainingAmount: _amount,
            username: _username
        });

        userLoans[msg.sender].push(loanId);

        // Emit event untuk backend listener
        emit LoanApplied(loanId, msg.sender, _amount, _username);
        
        return loanId;
    }

    // ===== ORACLE STATUS UPDATE =====
    
    function updateLoanStatus(
        uint256 _loanId,
        LoanStatus _status,
        uint256 _remainingAmount
    ) external onlyOracle {
        require(_loanId < nextLoanId, "Loan does not exist");
        
        Loan storage loan = loans[_loanId];
        loan.status = _status;
        loan.remainingAmount = _remainingAmount;
        
        emit LoanStatusUpdated(_loanId, _status, _remainingAmount);
    }

    // ===== FINALIZE LOAN (setelah approved) =====
    
    function finalizeLoan(uint256 _loanId) external payable {
        require(_loanId < nextLoanId, "Loan does not exist");
        
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Not your loan");
        require(loan.status == LoanStatus.TRANSFERRED, "Loan not approved");
        require(!loan.isActive, "Loan already active");
        require(msg.value > 0, "Collateral required");
        
        // Validasi collateral ratio (150% minimum)
        uint256 ethPrice = getETHPriceUSD();
        uint256 collateralValueUSD = (msg.value * ethPrice) / 1e18;
        uint256 loanValueUSD = (loan.amount * ethPrice) / 1e18;
        uint256 collateralRatio = (collateralValueUSD * 100) / loanValueUSD;
        
        require(collateralRatio >= 150, "Need 150% collateral ratio");
        
        // Activate loan
        loan.collateral = msg.value;
        loan.isActive = true;
        loan.startTime = block.timestamp;
        
        // Transfer loan amount to borrower
        require(address(this).balance >= loan.amount, "Insufficient liquidity");
        payable(msg.sender).transfer(loan.amount);
        
        emit LoanFinalized(_loanId, msg.sender, loan.amount, msg.value);
    }

    // ===== REPAY LOAN =====
    
    function repayLoan(uint256 _loanId) external payable {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Not your loan");
        require(loan.isActive, "Loan not active");

        uint256 interest = calculateInterest(_loanId);
        uint256 totalRepayment = loan.amount + interest;

        require(msg.value >= totalRepayment, "Insufficient payment");

        // Mark as repaid
        loan.isActive = false;
        loan.status = LoanStatus.REPAID;
        loan.remainingAmount = 0;

        // Return collateral to borrower
        payable(msg.sender).transfer(loan.collateral);

        emit LoanRepaid(_loanId, msg.sender, msg.value);
        emit LoanStatusUpdated(_loanId, LoanStatus.REPAID, 0);
    }

    // ===== VIEW FUNCTIONS =====
    
    function getLoanDetails(uint256 _loanId) external view returns (
        address borrower,
        uint256 amount,
        uint256 collateral,
        LoanStatus status,
        uint256 remainingAmount,
        bool isActive,
        string memory username
    ) {
        require(_loanId < nextLoanId, "Loan does not exist");
        Loan memory loan = loans[_loanId];
        return (
            loan.borrower,
            loan.amount,
            loan.collateral,
            loan.status,
            loan.remainingAmount,
            loan.isActive,
            loan.username
        );
    }

    function canFinalizeLoan(uint256 _loanId) external view returns (bool) {
        if (_loanId >= nextLoanId) return false;
        Loan memory loan = loans[_loanId];
        return loan.status == LoanStatus.TRANSFERRED && !loan.isActive;
    }

    function getUserLoans(address _user) external view returns (uint256[] memory) {
        return userLoans[_user];
    }

    function getTotalLoans() external view returns (uint256) {
        return nextLoanId;
    }

    // ===== HELPER FUNCTIONS =====
    
    function getETHPriceUSD() public view returns (uint256) {
        (, int256 price, , uint256 timeStamp, ) = ethPriceFeed.latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - timeStamp < 3600, "Price too old");
        
        // Convert to 18 decimals (Chainlink ETH/USD = 8 decimals)
        return uint256(price) * 1e10;
    }

    function calculateInterest(uint256 _loanId) public view returns (uint256) {
        Loan memory loan = loans[_loanId];
        if (!loan.isActive || loan.startTime == 0) return 0;

        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 annualInterest = (loan.amount * loan.interestRate) / 100;
        uint256 interest = (annualInterest * timeElapsed) / 365 days;
        
        return interest;
    }

    function calculateCollateralRatio(uint256 _loanId) external view returns (uint256) {
        require(_loanId < nextLoanId, "Loan does not exist");
        
        Loan memory loan = loans[_loanId];
        if (!loan.isActive) return 0;

        uint256 ethPrice = getETHPriceUSD();
        uint256 collateralValueUSD = (loan.collateral * ethPrice) / 1e18;
        
        uint256 interest = calculateInterest(_loanId);
        uint256 totalDebt = loan.amount + interest;
        uint256 debtValueUSD = (totalDebt * ethPrice) / 1e18;
        
        if (debtValueUSD == 0) return type(uint256).max;
        
        return (collateralValueUSD * 100) / debtValueUSD;
    }

    function canLiquidate(uint256 _loanId) external view returns (bool) {
        if (_loanId >= nextLoanId) return false;
        
        Loan memory loan = loans[_loanId];
        if (!loan.isActive) return false;
        
        return this.calculateCollateralRatio(_loanId) < 120; // Liquidation at 120%
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ===== FUNDING =====
    
    // Owner dapat fund contract untuk lending
    function fundContract() external payable onlyOwner {
        // Contract balance bertambah
    }

    // Emergency withdraw untuk owner
    function emergencyWithdraw(uint256 _amount) external onlyOwner {
        require(_amount <= address(this).balance, "Insufficient balance");
        payable(owner).transfer(_amount);
    }

    // Receive ETH
    receive() external payable {}
}