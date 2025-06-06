// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

contract DeLoanSimple {
    address public admin;

    struct Loan {
        address borrower;
        address nftContract;
        uint256 tokenId;
        uint256 dueDate;
        uint256 amount;
        bool repaid;
        bool claimed;
        uint256 createdAt;
    }

    mapping(bytes32 => Loan) public loans;
    
    // Events
    event LoanRegistered(
        bytes32 indexed loanId,
        address indexed borrower,
        address nftContract,
        uint256 tokenId,
        uint256 dueDate,
        uint256 amount
    );
    
    event LoanRepaid(bytes32 indexed loanId, address indexed borrower);
    event CollateralReturned(bytes32 indexed loanId, address indexed borrower);
    event CollateralClaimed(bytes32 indexed loanId, address indexed admin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function setAdmin(address _newAdmin) external onlyAdmin {
        admin = _newAdmin;
    }

    function registerLoan(
        bytes32 loanId,
        address borrower,
        address nftContract,
        uint256 tokenId,
        uint256 dueDate,
        uint256 amount
    ) external onlyAdmin {
        require(loans[loanId].borrower == address(0), "Loan already exists");
        
        // Transfer NFT from borrower to contract
        IERC721(nftContract).safeTransferFrom(borrower, address(this), tokenId);
        
        loans[loanId] = Loan({
            borrower: borrower,
            nftContract: nftContract,
            tokenId: tokenId,
            dueDate: dueDate,
            amount: amount,
            repaid: false,
            claimed: false,
            createdAt: block.timestamp
        });

        emit LoanRegistered(loanId, borrower, nftContract, tokenId, dueDate, amount);
    }

    function markRepaid(bytes32 loanId) external onlyAdmin {
        require(loans[loanId].borrower != address(0), "Loan does not exist");
        require(!loans[loanId].repaid, "Already repaid");
        
        loans[loanId].repaid = true;
        emit LoanRepaid(loanId, loans[loanId].borrower);
    }

    function returnCollateral(bytes32 loanId) external {
        Loan storage loan = loans[loanId];
        require(loan.borrower != address(0), "Loan does not exist");
        require(loan.repaid, "Not repaid");
        require(!loan.claimed, "Already claimed");
        require(msg.sender == loan.borrower, "Only borrower can claim");
        
        loan.claimed = true;
        IERC721(loan.nftContract).safeTransferFrom(address(this), loan.borrower, loan.tokenId);
        
        emit CollateralReturned(loanId, loan.borrower);
    }

    function claimCollateral(bytes32 loanId) external onlyAdmin {
        Loan storage loan = loans[loanId];
        require(loan.borrower != address(0), "Loan does not exist");
        require(block.timestamp > loan.dueDate, "Not due");
        require(!loan.repaid, "Already repaid");
        require(!loan.claimed, "Already claimed");
        
        loan.claimed = true;
        IERC721(loan.nftContract).safeTransferFrom(address(this), admin, loan.tokenId);
        
        emit CollateralClaimed(loanId, admin);
    }

    // View functions
    function getLoan(bytes32 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    function isLoanActive(bytes32 loanId) external view returns (bool) {
        Loan memory loan = loans[loanId];
        return loan.borrower != address(0) && !loan.repaid && !loan.claimed;
    }

    function canLiquidate(bytes32 loanId) external view returns (bool) {
        Loan memory loan = loans[loanId];
        return loan.borrower != address(0) && 
               block.timestamp > loan.dueDate && 
               !loan.repaid && 
               !loan.claimed;
    }

    // Emergency function
    function emergencyWithdraw(address nftContract, uint256 tokenId) external onlyAdmin {
        IERC721(nftContract).safeTransferFrom(address(this), admin, tokenId);
    }

    // Handle NFT transfers - fix warnings by commenting out unused parameters
    function onERC721Received(
        address /* operator */,
        address /* from */,
        uint256 /* tokenId */,
        bytes calldata /* data */
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
}