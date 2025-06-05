// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// Import Chainlink Price Feed interface
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
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
    struct Loan {
        address borrower;
        uint256 amount;
        uint256 collateral;
        uint256 interestRate;
        uint256 duration;
        uint256 startTime;
        bool isActive;
        bool isRepaid;
        address collateralToken;
    }
    
    struct LendingPool {
        address lender;
        uint256 amount;
        uint256 interestRate;
        bool isActive;
    }
    
    struct PriceFeed {
        AggregatorV3Interface priceFeed;
        bool isActive;
    }
    
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => LendingPool) public lendingPools;
    mapping(address => uint256[]) public userLoans;
    mapping(address => uint256[]) public userLendingPools;
    mapping(address => PriceFeed) public priceFeeds; // token => price feed
    
    uint256 public nextLoanId;
    uint256 public nextPoolId;
    uint256 public constant LIQUIDATION_THRESHOLD = 150; // 150%
    uint256 public constant PRICE_PRECISION = 1e18;
    
    address public owner;
    
    // Events
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 collateral);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 amount);
    event LoanLiquidated(uint256 indexed loanId, address indexed borrower, uint256 liquidationAmount);
    event PoolCreated(uint256 indexed poolId, address indexed lender, uint256 amount);
    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    // Add price feed for a token
    function addPriceFeed(address _token, address _priceFeed) external onlyOwner {
        priceFeeds[_token] = PriceFeed({
            priceFeed: AggregatorV3Interface(_priceFeed),
            isActive: true
        });
        emit PriceFeedUpdated(_token, _priceFeed);
    }
    
    // Get latest price from Chainlink Oracle
    function getLatestPrice(address _token) public view returns (uint256) {
        PriceFeed memory feed = priceFeeds[_token];
        require(feed.isActive, "Price feed not active");
        
        (, int256 price, , uint256 timeStamp, ) = feed.priceFeed.latestRoundData();
        
        require(price > 0, "Invalid price");
        require(timeStamp > 0, "Round not complete");
        require(block.timestamp - timeStamp < 3600, "Price data stale"); // 1 hour staleness check
        
        // Convert price to 18 decimals
        uint8 feedDecimals = feed.priceFeed.decimals();
        if (feedDecimals < 18) {
            return uint256(price) * (10 ** (18 - feedDecimals));
        } else {
            return uint256(price) / (10 ** (feedDecimals - 18));
        }
    }
    
    // Calculate USD value of collateral
    function getCollateralValueUSD(uint256 _amount, address _token) public view returns (uint256) {
        uint256 price = getLatestPrice(_token);
        return (_amount * price) / PRICE_PRECISION;
    }
    
    // Create loan with oracle-based collateral validation
    function createLoan(
        uint256 _amount, 
        uint256 _duration, 
        uint256 _interestRate,
        address _collateralToken
    ) external payable returns (uint256) {
        require(msg.value > 0, "Collateral required");
        require(_amount > 0, "Loan amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(priceFeeds[_collateralToken].isActive, "Unsupported collateral token");
        
        // Get USD values using Oracle
        uint256 collateralValueUSD = getCollateralValueUSD(msg.value, _collateralToken);
        uint256 loanValueUSD = getCollateralValueUSD(_amount, address(0)); // Assuming loan in ETH
        
        // Check collateral ratio with oracle prices
        uint256 collateralRatio = (collateralValueUSD * 100) / loanValueUSD;
        require(collateralRatio >= LIQUIDATION_THRESHOLD, "Insufficient collateral based on current prices");
        
        uint256 loanId = nextLoanId++;
        
        loans[loanId] = Loan({
            borrower: msg.sender,
            amount: _amount,
            collateral: msg.value,
            interestRate: _interestRate,
            duration: _duration,
            startTime: block.timestamp,
            isActive: true,
            isRepaid: false,
            collateralToken: _collateralToken
        });
        
        userLoans[msg.sender].push(loanId);
        
        // Transfer loan amount to borrower
        require(address(this).balance >= _amount, "Insufficient liquidity");
        payable(msg.sender).transfer(_amount);
        
        emit LoanCreated(loanId, msg.sender, _amount, msg.value);
        return loanId;
    }
    
    // Check if loan can be liquidated using oracle prices
    function canLiquidate(uint256 _loanId) public view returns (bool) {
        Loan memory loan = loans[_loanId];
        if (!loan.isActive || loan.isRepaid) return false;
        
        uint256 interest = calculateInterest(_loanId);
        uint256 totalDebt = loan.amount + interest;
        
        // Get current USD values from Oracle
        uint256 collateralValueUSD = getCollateralValueUSD(loan.collateral, loan.collateralToken);
        uint256 debtValueUSD = getCollateralValueUSD(totalDebt, address(0));
        
        uint256 currentRatio = (collateralValueUSD * 100) / debtValueUSD;
        
        return currentRatio < LIQUIDATION_THRESHOLD;
    }
    
    // Liquidate undercollateralized loan
    function liquidateLoan(uint256 _loanId) external payable {
        require(canLiquidate(_loanId), "Loan cannot be liquidated");
        
        Loan storage loan = loans[_loanId];
        
        uint256 interest = calculateInterest(_loanId);
        uint256 totalDebt = loan.amount + interest;
        
        require(msg.value >= totalDebt, "Insufficient payment for liquidation");
        
        // Calculate liquidation bonus (5%)
        uint256 liquidationBonus = (loan.collateral * 5) / 100;
        uint256 liquidationAmount = loan.collateral - liquidationBonus;
        
        loan.isActive = false;
        
        // Transfer collateral to liquidator minus penalty
        payable(msg.sender).transfer(liquidationAmount);
        
        emit LoanLiquidated(_loanId, loan.borrower, liquidationAmount);
    }
    
    // Dynamic interest rate based on utilization
    function calculateDynamicInterestRate() public view returns (uint256) {
        uint256 totalLiquidity = address(this).balance;
        uint256 totalBorrowed = getTotalBorrowed();
        
        if (totalLiquidity == 0) return 5; // Base rate 5%
        
        uint256 utilizationRate = (totalBorrowed * 100) / (totalLiquidity + totalBorrowed);
        
        // Base rate + utilization premium
        uint256 baseRate = 3;
        uint256 utilizationPremium = (utilizationRate * 12) / 100; // Max 12% premium
        
        return baseRate + utilizationPremium;
    }
    
    // Helper functions
    function getTotalBorrowed() internal view returns (uint256) {
        uint256 total = 0;
        for (uint256 i = 0; i < nextLoanId; i++) {
            if (loans[i].isActive && !loans[i].isRepaid) {
                total += loans[i].amount;
            }
        }
        return total;
    }
    
    function calculateInterest(uint256 _loanId) public view returns (uint256) {
        Loan memory loan = loans[_loanId];
        if (!loan.isActive) return 0;
        
        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 interest = (loan.amount * loan.interestRate * timeElapsed) / (365 days * 100);
        
        return interest;
    }
    
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
    
    function getUserLoans(address _user) external view returns (uint256[] memory) {
        return userLoans[_user];
    }
    
    function getUserLendingPools(address _user) external view returns (uint256[] memory) {
        return userLendingPools[_user];
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    receive() external payable {}
}