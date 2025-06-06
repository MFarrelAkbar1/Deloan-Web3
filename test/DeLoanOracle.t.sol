// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {DeLoanOracle} from "../src/DeLoanOracle.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";

contract DeLoanSimpleTest is Test {
    DeLoanOracle public deloan;
    MockPriceFeed public ethPriceFeed;
    
    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public oracle = address(0x3);

    function setUp() public {
        // Deploy price feed
        ethPriceFeed = new MockPriceFeed(8, "ETH/USD", 1, 200000000000); // $2000
        
        // Deploy contract
        deloan = new DeLoanOracle(address(ethPriceFeed));
        
        // Fund contract
        deloan.fundContract{value: 10 ether}();
        
        // Authorize oracle
        deloan.authorizeOracle(oracle, true);
        
        // Give users ETH
        vm.deal(user1, 5 ether);
        vm.deal(user2, 5 ether);
    }

    function testApplyLoan() public {
        vm.startPrank(user1);
        
        uint256 loanId = deloan.applyLoan(1 ether, "alice");
        
        // Check loan details
        (
            address borrower,
            uint256 amount,
            uint256 collateral,
            DeLoanOracle.LoanStatus status,
            uint256 remainingAmount,
            bool isActive,
            string memory username
        ) = deloan.getLoanDetails(loanId);
        
        assertEq(borrower, user1);
        assertEq(amount, 1 ether);
        assertEq(collateral, 0);
        assertEq(uint8(status), 0); // PENDING
        assertEq(remainingAmount, 1 ether);
        assertEq(isActive, false);
        assertEq(username, "alice");
        
        vm.stopPrank();
    }

    function testOracleUpdateStatus() public {
        // Apply loan
        vm.prank(user1);
        uint256 loanId = deloan.applyLoan(1 ether, "alice");
        
        // Oracle updates status to TRANSFERRED
        vm.prank(oracle);
        deloan.updateLoanStatus(loanId, DeLoanOracle.LoanStatus.TRANSFERRED, 1 ether);
        
        // Check updated status
        (, , , DeLoanOracle.LoanStatus status, uint256 remainingAmount, ,) = deloan.getLoanDetails(loanId);
        assertEq(uint8(status), 2); // TRANSFERRED
        assertEq(remainingAmount, 1 ether);
    }

    function testFinalizeLoan() public {
        // Apply loan
        vm.prank(user1);
        uint256 loanId = deloan.applyLoan(1 ether, "alice");
        
        // Oracle approves
        vm.prank(oracle);
        deloan.updateLoanStatus(loanId, DeLoanOracle.LoanStatus.TRANSFERRED, 1 ether);
        
        // User finalizes with collateral
        vm.startPrank(user1);
        uint256 balanceBefore = user1.balance;
        
        // Need 150% collateral: 1 ETH loan needs 1.5 ETH collateral
        deloan.finalizeLoan{value: 1.5 ether}(loanId);
        
        uint256 balanceAfter = user1.balance;
        
        // User should receive 1 ETH (loan amount) but pay 1.5 ETH (collateral)
        // Net: -0.5 ETH
        assertEq(balanceBefore - balanceAfter, 0.5 ether);
        
        // Check loan is now active
        (, , uint256 collateral, , , bool isActive,) = deloan.getLoanDetails(loanId);
        assertEq(collateral, 1.5 ether);
        assertEq(isActive, true);
        
        vm.stopPrank();
    }

    function testRepayLoan() public {
        // Setup: Apply, approve, finalize loan
        vm.prank(user1);
        uint256 loanId = deloan.applyLoan(1 ether, "alice");
        
        vm.prank(oracle);
        deloan.updateLoanStatus(loanId, DeLoanOracle.LoanStatus.TRANSFERRED, 1 ether);
        
        vm.prank(user1);
        deloan.finalizeLoan{value: 1.5 ether}(loanId);
        
        // Fast forward time to accrue interest
        vm.warp(block.timestamp + 30 days);
        
        // Calculate total repayment
        uint256 interest = deloan.calculateInterest(loanId);
        uint256 totalRepayment = 1 ether + interest;
        
        // Repay loan
        vm.startPrank(user1);
        uint256 balanceBefore = user1.balance;
        
        deloan.repayLoan{value: totalRepayment}(loanId);
        
        uint256 balanceAfter = user1.balance;
        
        // User should get collateral back (1.5 ETH) but pay totalRepayment
        // Net gain: 1.5 ETH - totalRepayment
        assertEq(balanceAfter - balanceBefore, 1.5 ether - totalRepayment);
        
        // Check loan is repaid
        (, , , DeLoanOracle.LoanStatus status, uint256 remainingAmount, bool isActive,) = deloan.getLoanDetails(loanId);
        assertEq(uint8(status), 3); // REPAID
        assertEq(remainingAmount, 0);
        assertEq(isActive, false);
        
        vm.stopPrank();
    }

    function testCollateralRatio() public {
        // Setup loan
        vm.prank(user1);
        uint256 loanId = deloan.applyLoan(1 ether, "alice");
        
        vm.prank(oracle);
        deloan.updateLoanStatus(loanId, DeLoanOracle.LoanStatus.TRANSFERRED, 1 ether);
        
        vm.prank(user1);
        deloan.finalizeLoan{value: 1.5 ether}(loanId);
        
        // Check collateral ratio (should be 150%)
        uint256 ratio = deloan.calculateCollateralRatio(loanId);
        assertEq(ratio, 150);
        
        // Simulate ETH price drop by 20%
        ethPriceFeed.simulateVolatility(-20);
        
        // Ratio should decrease
        uint256 newRatio = deloan.calculateCollateralRatio(loanId);
        assertLt(newRatio, ratio);
    }

    function testInsufficientCollateral() public {
        vm.prank(user1);
        uint256 loanId = deloan.applyLoan(1 ether, "alice");
        
        vm.prank(oracle);
        deloan.updateLoanStatus(loanId, DeLoanOracle.LoanStatus.TRANSFERRED, 1 ether);
        
        // Try to finalize with insufficient collateral (140%)
        vm.prank(user1);
        vm.expectRevert("Need 150% collateral ratio");
        deloan.finalizeLoan{value: 1.4 ether}(loanId);
    }

    function testUnauthorizedOracleUpdate() public {
        vm.prank(user1);
        uint256 loanId = deloan.applyLoan(1 ether, "alice");
        
        // Random user tries to update status
        vm.prank(user2);
        vm.expectRevert("Not authorized oracle");
        deloan.updateLoanStatus(loanId, DeLoanOracle.LoanStatus.TRANSFERRED, 1 ether);
    }

    function testGetETHPrice() public {
        uint256 price = deloan.getETHPriceUSD();
        assertEq(price, 2000 * 1e18); // $2000 with 18 decimals
    }

    function testCanFinalizeLoan() public {
        vm.prank(user1);
        uint256 loanId = deloan.applyLoan(1 ether, "alice");
        
        // Should not be able to finalize when pending
        assertFalse(deloan.canFinalizeLoan(loanId));
        
        // After oracle approval, should be able to finalize
        vm.prank(oracle);
        deloan.updateLoanStatus(loanId, DeLoanOracle.LoanStatus.TRANSFERRED, 1 ether);
        
        assertTrue(deloan.canFinalizeLoan(loanId));
    }
}