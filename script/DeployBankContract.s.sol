// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DeLoanBankApproval} from "../src/DeLoanBankApproval.sol";

contract DeployBankContractScript is Script {
    DeLoanBankApproval public bankContract;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        console.log("=== DEPLOYING DELOAN BANK APPROVAL SYSTEM ===");

        // Deploy DeLoan Bank Contract
        console.log("1. Deploying DeLoan Bank Contract...");
        bankContract = new DeLoanBankApproval();
        console.log("   Bank Contract deployed to:", address(bankContract));

        // Fund contract with ETH for lending
        console.log("2. Funding Contract...");
        payable(address(bankContract)).transfer(10 ether);
        console.log("   Contract funded with 10 ETH");

        // Test basic functionality
        console.log("3. Testing Bank System...");
        console.log("   Contract balance:", address(bankContract).balance);
        console.log("   Contract owner:", bankContract.owner());
        console.log("   Oracle address:", bankContract.oracle());
        console.log("   Next loan ID:", bankContract.nextLoanId());

        vm.stopBroadcast();

        // Summary for frontend integration
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Bank Contract Address:", address(bankContract));
        console.log("Contract Balance:", address(bankContract).balance);
        console.log("============================");

        // Frontend config output
        console.log("\n=== FOR FRONTEND CONFIG ===");
        console.log('export const BANK_LOAN_CONTRACT_ADDRESS = "', address(bankContract), '" as const;');
        console.log("==============================");
    }
}