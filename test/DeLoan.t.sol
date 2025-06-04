// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {DeLoan} from "../src/DeLoan.sol";

contract DeLoanTest is Test {
    DeLoan public deloan;
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        deloan = new DeLoan();
        
        // Give users some ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        
        // Fund the contract with some ETH for loans
        vm.deal(address(deloan), 5 ether);
    }
    
    function testCreateLoan() public {
        vm.startPrank(user1);
        
        uint256 loanAmount = 1 ether;
        uint256 collateralAmount = 2 ether; // 200% collateral ratio
        uint256 duration = 30 days;
        uint256 interestRate = 5; // 5%
        
        uint256 loanId = deloan.createLoan{value: collateralAmount}(
            loanAmount, 
            duration, 
            interestRate
        );
        
        // Check loan was created
        (address borrower, uint256 amount, uint256 collateral, , , , bool isActive, bool isRepaid) = deloan.loans(loanId);
        
        assertEq(borrower, user1);
        assertEq(amount, loanAmount);
        assertEq(collateral, collateralAmount);
        assertTrue(isActive);
        assertFalse(isRepaid);
        
        vm.stopPrank();
    }
    
    function testCreateLendingPool() public {
        vm.startPrank(user2);
        
        uint256 poolAmount = 2 ether;
        uint256 interestRate = 4; // 4%
        
        uint256 poolId = deloan.createLendingPool{value: poolAmount}(interestRate);
        
        (address lender, uint256 amount, uint256 rate, bool isActive) = deloan.lendingPools(poolId);
        
        assertEq(lender, user2);
        assertEq(amount, poolAmount);
        assertEq(rate, interestRate);
        assertTrue(isActive);
        
        vm.stopPrank();
    }
    
    function testRepayLoan() public {
        vm.startPrank(user1);
        
        // Create loan first
        uint256 loanAmount = 1 ether;
        uint256 collateralAmount = 2 ether;
        
        uint256 loanId = deloan.createLoan{value: collateralAmount}(
            loanAmount, 
            30 days, 
            5
        );
        
        // Fast forward time to accrue some interest
        vm.warp(block.timestamp + 10 days);
        
        uint256 interest = deloan.calculateInterest(loanId);
        uint256 totalRepayment = loanAmount + interest;
        
        // Repay loan
        deloan.repayLoan{value: totalRepayment}(loanId);
        
        // Check loan is repaid
        (, , , , , , bool isActive, bool isRepaid) = deloan.loans(loanId);
        assertFalse(isActive);
        assertTrue(isRepaid);
        
        vm.stopPrank();
    }
    
    function testFailInsufficientCollateral() public {
        vm.startPrank(user1);
        
        // Try to create loan with insufficient collateral (less than 150%)
        deloan.createLoan{value: 1 ether}(1 ether, 30 days, 5);
        
        vm.stopPrank();
    }
}