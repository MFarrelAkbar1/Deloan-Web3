// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test, console} from "forge-std/Test.sol";
import {DeLoanSimple} from "../src/DeLoanSimple.sol";

// Mock NFT contract for testing
contract MockNFT {
    mapping(uint256 => address) private _owners;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    function mint(address to, uint256 tokenId) external {
        _owners[tokenId] = to;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }

    function approve(address to, uint256 tokenId) external {
        _tokenApprovals[tokenId] = to;
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        return _tokenApprovals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        require(_owners[tokenId] == from, "Not owner");
        require(
            msg.sender == from || 
            _tokenApprovals[tokenId] == msg.sender || 
            _operatorApprovals[from][msg.sender], 
            "Not approved"
        );
        
        _owners[tokenId] = to;
        _tokenApprovals[tokenId] = address(0);
    }
}

contract DeLoanSimpleTest is Test {
    DeLoanSimple public deloan;
    MockNFT public mockNFT;
    
    address public admin = address(this);
    address public borrower = address(0x1);
    address public newAdmin = address(0x2);
    
    bytes32 public constant LOAN_ID = keccak256("test-loan-1");
    uint256 public constant TOKEN_ID = 1;
    uint256 public constant LOAN_AMOUNT = 1000 ether;
    uint256 public dueDate;

    function setUp() public {
        // Deploy contracts
        deloan = new DeLoanSimple();
        mockNFT = new MockNFT();
        
        // Setup due date (1 week from now)
        dueDate = block.timestamp + 7 days;
        
        // Give borrower an NFT
        mockNFT.mint(borrower, TOKEN_ID);
        
        // Verify initial state
        assertEq(deloan.admin(), admin);
        assertEq(mockNFT.ownerOf(TOKEN_ID), borrower);
    }

    function testRegisterLoan() public {
        // Borrower approves DeLoan to transfer NFT
        vm.prank(borrower);
        mockNFT.approve(address(deloan), TOKEN_ID);
        
        // Admin registers loan
        deloan.registerLoan(
            LOAN_ID,
            borrower,
            address(mockNFT),
            TOKEN_ID,
            dueDate,
            LOAN_AMOUNT
        );
        
        // Check loan details
        DeLoanSimple.Loan memory loan = deloan.getLoan(LOAN_ID);
        assertEq(loan.borrower, borrower);
        assertEq(loan.nftContract, address(mockNFT));
        assertEq(loan.tokenId, TOKEN_ID);
        assertEq(loan.dueDate, dueDate);
        assertEq(loan.amount, LOAN_AMOUNT);
        assertFalse(loan.repaid);
        assertFalse(loan.claimed);
        assertEq(loan.createdAt, block.timestamp);
        
        // Check NFT ownership transferred
        assertEq(mockNFT.ownerOf(TOKEN_ID), address(deloan));
        
        // Check loan status
        assertTrue(deloan.isLoanActive(LOAN_ID));
        assertFalse(deloan.canLiquidate(LOAN_ID));
    }

    function testMarkRepaid() public {
        // Setup loan
        vm.prank(borrower);
        mockNFT.approve(address(deloan), TOKEN_ID);
        
        deloan.registerLoan(
            LOAN_ID,
            borrower,
            address(mockNFT),
            TOKEN_ID,
            dueDate,
            LOAN_AMOUNT
        );
        
        // Mark as repaid
        deloan.markRepaid(LOAN_ID);
        
        // Check loan status
        DeLoanSimple.Loan memory loan = deloan.getLoan(LOAN_ID);
        assertTrue(loan.repaid);
        assertFalse(deloan.isLoanActive(LOAN_ID));
    }

    function testReturnCollateral() public {
        // Setup and repay loan
        vm.prank(borrower);
        mockNFT.approve(address(deloan), TOKEN_ID);
        
        deloan.registerLoan(
            LOAN_ID,
            borrower,
            address(mockNFT),
            TOKEN_ID,
            dueDate,
            LOAN_AMOUNT
        );
        
        deloan.markRepaid(LOAN_ID);
        
        // Borrower returns collateral
        vm.prank(borrower);
        deloan.returnCollateral(LOAN_ID);
        
        // Check NFT returned to borrower
        assertEq(mockNFT.ownerOf(TOKEN_ID), borrower);
        
        // Check loan marked as claimed
        DeLoanSimple.Loan memory loan = deloan.getLoan(LOAN_ID);
        assertTrue(loan.claimed);
    }

    function testClaimCollateral() public {
        // Setup loan
        vm.prank(borrower);
        mockNFT.approve(address(deloan), TOKEN_ID);
        
        deloan.registerLoan(
            LOAN_ID,
            borrower,
            address(mockNFT),
            TOKEN_ID,
            dueDate,
            LOAN_AMOUNT
        );
        
        // Fast forward past due date
        vm.warp(dueDate + 1);
        
        // Check can liquidate
        assertTrue(deloan.canLiquidate(LOAN_ID));
        
        // Admin claims collateral
        deloan.claimCollateral(LOAN_ID);
        
        // Check NFT transferred to admin
        assertEq(mockNFT.ownerOf(TOKEN_ID), admin);
        
        // Check loan marked as claimed
        DeLoanSimple.Loan memory loan = deloan.getLoan(LOAN_ID);
        assertTrue(loan.claimed);
    }

    function testSetAdmin() public {
        // Set new admin
        deloan.setAdmin(newAdmin);
        assertEq(deloan.admin(), newAdmin);
        
        // Only new admin can set admin
        vm.prank(newAdmin);
        deloan.setAdmin(admin);
        assertEq(deloan.admin(), admin);
    }

    function testOnlyAdminModifier() public {
        // Non-admin cannot register loan
        vm.prank(borrower);
        vm.expectRevert("Only admin");
        deloan.registerLoan(
            LOAN_ID,
            borrower,
            address(mockNFT),
            TOKEN_ID,
            dueDate,
            LOAN_AMOUNT
        );
        
        // Non-admin cannot mark repaid
        vm.prank(borrower);
        vm.expectRevert("Only admin");
        deloan.markRepaid(LOAN_ID);
        
        // Non-admin cannot claim collateral
        vm.prank(borrower);
        vm.expectRevert("Only admin");
        deloan.claimCollateral(LOAN_ID);
    }
}