// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {DeLoanOracle} from "../src/DeLoanOracle.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";

contract DeLoanOracleTest is Test {
    DeLoanOracle public deloan;
    MockPriceFeed public ethPriceFeed;
    MockPriceFeed public btcPriceFeed;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public liquidator = address(0x3);
    
    // Token addresses
    address public constant ETH = address(0);
    address public constant BTC = address(0x1);
    
    function setUp() public {
        // Deploy Oracle and Price Feeds
        deloan = new DeLoanOracle();
        
        // Deploy mock price feeds
        ethPriceFeed = new MockPriceFeed(
            8, // decimals
            "ETH/USD",
            1, // version  
            200000000000 // $2000 with 8 decimals
        );
        
        btcPriceFeed = new MockPriceFeed(
            8, // decimals
            "BTC/USD",
            1, // version
            4000000000000 // $40000 with 8 decimals  
        );
        
        // Add price feeds to DeLoan
        deloan.addPriceFeed(ETH, address(ethPriceFeed));
        deloan.addPriceFeed(BTC, address(btcPriceFeed));
        
        // Give users some ETH
        vm.deal(user1, 20 ether);
        vm.deal(user2, 20 ether);
        vm.deal(liquidator, 20 ether);
        
        // Fund the contract with ETH for loans
        vm.deal(address(deloan), 10 ether);
    }
    
    function testOraclePriceFeeds() public view {
        // Test ETH price
        uint256 ethPrice = deloan.getLatestPrice(ETH);
        
        // Expected: $2000 * 10^18 / 10^8 = 2000 * 10^10
        assert(ethPrice == 2000 * 10**18); // ETH price should be $2000
        
        // Test BTC price  
        uint256 btcPrice = deloan.getLatestPrice(BTC);
        
        // Expected: $40000 * 10^18 / 10^8 = 40000 * 10^10
        assert(btcPrice == 40000 * 10**18); // BTC price should be $40000
    }
    
    function testOracleCollateralValidation() public {
        vm.startPrank(user1);
        
        uint256 loanAmount = 1 ether; // $2000 at current price
        uint256 collateralAmount = 2 ether; // $4000 at current price - 200% ratio
        
        // This should work (200% > 150% threshold)
        uint256 loanId = deloan.createLoan{value: collateralAmount}(
            loanAmount, 
            30 days, 
            5, // 5% interest
            ETH // ETH as collateral
        );
        
        // Verify loan was created
        (address borrower, uint256 amount, uint256 collateral, , , , bool isActive, bool isRepaid, address collateralToken) = deloan.loans(loanId);
        
        assertEq(borrower, user1);
        assertEq(amount, loanAmount);
        assertEq(collateral, collateralAmount);
        assertEq(collateralToken, ETH);
        assertTrue(isActive);
        assertFalse(isRepaid);
        
        vm.stopPrank();
    }
    
    function testFailInsufficientOracleCollateral() public {
        vm.startPrank(user1);
        
        uint256 loanAmount = 1 ether; // $2000
        uint256 collateralAmount = 1.4 ether; // $2800 - only 140% ratio
        
        // This should fail (140% < 150% threshold)
        deloan.createLoan{value: collateralAmount}(
            loanAmount,
            30 days,
            5,
            ETH
        );
        
        vm.stopPrank();
    }
    
    function testOracleLiquidation() public {
        vm.startPrank(user1);
        
        // Create loan with 200% collateral ratio
        uint256 loanAmount = 1 ether;
        uint256 collateralAmount = 2 ether;
        
        uint256 loanId = deloan.createLoan{value: collateralAmount}(
            loanAmount,
            30 days, 
            5,
            ETH
        );
        
        vm.stopPrank();
        
        // Should not be liquidatable initially
        assertFalse(deloan.canLiquidate(loanId), "Loan should not be liquidatable initially");
        
        // Simulate ETH price crash (50% drop)
        ethPriceFeed.simulateVolatility(-50);
        
        // Fast forward time to accrue interest
        vm.warp(block.timestamp + 15 days);
        
        // Now should be liquidatable
        assertTrue(deloan.canLiquidate(loanId), "Loan should be liquidatable after price crash");
        
        // Liquidate the loan
        vm.startPrank(liquidator);
        
        uint256 interest = deloan.calculateInterest(loanId);
        uint256 totalDebt = loanAmount + interest;
        
        uint256 liquidatorBalanceBefore = liquidator.balance;
        
        deloan.liquidateLoan{value: totalDebt}(loanId);
        
        uint256 liquidatorBalanceAfter = liquidator.balance;
        
        // Liquidator should receive collateral minus penalty
        assertTrue(liquidatorBalanceAfter > liquidatorBalanceBefore, "Liquidator should profit");
        
        vm.stopPrank();
        
        // Loan should no longer be active
        (, , , , , , bool isActive, ,) = deloan.loans(loanId);
        assertFalse(isActive, "Loan should be inactive after liquidation");
    }
    
    function testDynamicInterestRate() public {
        // Initially should be base rate (low utilization)
        uint256 initialRate = deloan.calculateDynamicInterestRate();
        console.log("Initial Dynamic Rate:", initialRate);
        
        // Create multiple loans to increase utilization
        vm.startPrank(user1);
        deloan.createLoan{value: 3 ether}(1.5 ether, 30 days, 5, ETH);
        vm.stopPrank();
        
        vm.startPrank(user2);  
        deloan.createLoan{value: 4 ether}(2 ether, 30 days, 5, ETH);
        vm.stopPrank();
        
        // Rate should increase with higher utilization
        uint256 newRate = deloan.calculateDynamicInterestRate();
        console.log("New Dynamic Rate:", newRate);
        
        assertTrue(newRate > initialRate, "Interest rate should increase with utilization");
    }
    
    function testOracleCollateralValueUSD() public view {
        uint256 ethAmount = 1 ether;
        uint256 usdValue = deloan.getCollateralValueUSD(ethAmount, ETH);
        
        // 1 ETH at $2000 should equal $2000 (2000 * 10^18)
        assert(usdValue == 2000 * 10**18); // 1 ETH should be worth $2000 USD
        
        uint256 btcAmount = 1 ether; // Treating as 1 BTC for simplicity
        uint256 btcUsdValue = deloan.getCollateralValueUSD(btcAmount, BTC);
        
        // 1 BTC at $40000 should equal $40000
        assert(btcUsdValue == 40000 * 10**18); // 1 BTC should be worth $40000 USD
    }
    
    function testOraclePriceUpdate() public {
        uint256 initialPrice = deloan.getLatestPrice(ETH);
        
        // Update price feed
        ethPriceFeed.updatePrice(250000000000); // $2500
        
        uint256 newPrice = deloan.getLatestPrice(ETH);
        
        assertTrue(newPrice > initialPrice, "Price should have increased");
        assertEq(newPrice, 2500 * 10**18, "New price should be $2500");
    }
    
    function testOracleRepayment() public {
        vm.startPrank(user1);
        
        uint256 loanAmount = 1 ether;
        uint256 collateralAmount = 2 ether;
        
        uint256 loanId = deloan.createLoan{value: collateralAmount}(
            loanAmount,
            30 days,
            5,
            ETH
        );
        
        // Fast forward time
        vm.warp(block.timestamp + 15 days);
        
        uint256 interest = deloan.calculateInterest(loanId);
        uint256 totalRepayment = loanAmount + interest;
        
        uint256 userBalanceBefore = user1.balance;
        
        // Repay loan
        deloan.repayLoan{value: totalRepayment}(loanId);
        
        uint256 userBalanceAfter = user1.balance;
        
        // User should get collateral back
        assertEq(userBalanceAfter - userBalanceBefore, collateralAmount - totalRepayment, "User should receive collateral back");
        
        // Loan should be marked as repaid
        (, , , , , , bool isActive, bool isRepaid,) = deloan.loans(loanId);
        assertFalse(isActive, "Loan should be inactive");
        assertTrue(isRepaid, "Loan should be marked as repaid");
        
        vm.stopPrank();
    }
}