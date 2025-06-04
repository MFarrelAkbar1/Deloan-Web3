// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract DeLoan {
    struct Loan {
        address borrower;
        uint256 amount;
        uint256 collateral;
        uint256 interestRate;
        uint256 duration;
        uint256 startTime;
        bool isActive;
        bool isRepaid;
    }
    
    struct LendingPool {
        address lender;
        uint256 amount;
        uint256 interestRate;
        bool isActive;
    }
    
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => LendingPool) public lendingPools;
    mapping(address => uint256[]) public userLoans;
    mapping(address => uint256[]) public userLendingPools;
    
    uint256 public nextLoanId;
    uint256 public nextPoolId;
    uint256 public constant LIQUIDATION_THRESHOLD = 150; // 150% collateral ratio
    
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 collateral);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event PoolCreated(uint256 indexed poolId, address indexed lender, uint256 amount);
    event LoanLiquidated(uint256 indexed loanId, address indexed borrower);
    
    // Create a loan with ETH as collateral
    function createLoan(uint256 _amount, uint256 _duration, uint256 _interestRate) 
        external 
        payable 
        returns (uint256) 
    {
        require(msg.value > 0, "Collateral required");
        require(_amount > 0, "Loan amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        
        // Check collateral ratio (must be at least 150% of loan amount)
        uint256 collateralRatio = (msg.value * 100) / _amount;
        require(collateralRatio >= LIQUIDATION_THRESHOLD, "Insufficient collateral");
        
        uint256 loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            amount: _amount,
            collateral: msg.value,
            interestRate: _interestRate,
            duration: _duration,
            startTime: block.timestamp,
            isActive: true,
            isRepaid: false
        });
        
        userLoans[msg.sender].push(loanId);
        
        // Transfer loan amount to borrower (simplified - in real app, this would come from lending pools)
        require(address(this).balance >= _amount, "Insufficient liquidity");
        payable(msg.sender).transfer(_amount);
        
        emit LoanCreated(loanId, msg.sender, _amount, msg.value);
        return loanId;
    }
    
    // Repay loan
    function repayLoan(uint256 _loanId) external payable {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Not your loan");
        require(loan.isActive, "Loan not active");
        require(!loan.isRepaid, "Loan already repaid");
        
        uint256 interest = calculateInterest(_loanId);
        uint256 totalRepayment = loan.amount + interest;
        
        require(msg.value >= totalRepayment, "Insufficient repayment amount");
        
        loan.isActive = false;
        loan.isRepaid = true;
        
        // Return collateral
        payable(msg.sender).transfer(loan.collateral);
        
        emit LoanRepaid(_loanId, msg.sender, totalRepayment);
    }
    
    // Create lending pool
    function createLendingPool(uint256 _interestRate) external payable returns (uint256) {
        require(msg.value > 0, "Amount must be greater than 0");
        
        uint256 poolId = nextPoolId++;
        
        lendingPools[poolId] = LendingPool({
            lender: msg.sender,
            amount: msg.value,
            interestRate: _interestRate,
            isActive: true
        });
        
        userLendingPools[msg.sender].push(poolId);
        
        emit PoolCreated(poolId, msg.sender, msg.value);
        return poolId;
    }
    
    // Calculate interest for a loan
    function calculateInterest(uint256 _loanId) public view returns (uint256) {
        Loan memory loan = loans[_loanId];
        if (!loan.isActive) return 0;
        
        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 interest = (loan.amount * loan.interestRate * timeElapsed) / (365 days * 100);
        
        return interest;
    }
    
    // Check if loan can be liquidated
    function canLiquidate(uint256 _loanId) public view returns (bool) {
        Loan memory loan = loans[_loanId];
        if (!loan.isActive || loan.isRepaid) return false;
        
        uint256 interest = calculateInterest(_loanId);
        uint256 totalDebt = loan.amount + interest;
        uint256 collateralRatio = (loan.collateral * 100) / totalDebt;
        
        return collateralRatio < LIQUIDATION_THRESHOLD;
    }
    
    // Get user's loans
    function getUserLoans(address _user) external view returns (uint256[] memory) {
        return userLoans[_user];
    }
    
    // Get user's lending pools
    function getUserLendingPools(address _user) external view returns (uint256[] memory) {
        return userLendingPools[_user];
    }
    
    // Get contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}