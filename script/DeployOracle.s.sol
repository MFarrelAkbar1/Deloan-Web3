// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DeLoanSimple} from "../src/DeLoanSimple.sol";

contract DeploySimpleScript is Script {
    DeLoanSimple public deloan;

    function setUp() public {}

    function run() public {
        // Ambil private key dari environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("=== DEPLOYING DELOAN SIMPLE ===");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Network Chain ID:", block.chainid);

        // Deploy DeLoan Simple contract
        deloan = new DeLoanSimple();
        
        console.log("DeLoan Simple deployed to:", address(deloan));
        console.log("Admin:", deloan.admin());

        vm.stopBroadcast();

        // Test basic read functions
        console.log("\n=== TESTING BASIC FUNCTIONS ===");
        console.log("Admin address:", deloan.admin());

        // Summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("DeLoan Simple Contract:", address(deloan));
        console.log("Admin Address:", deloan.admin());
        console.log("Network Chain ID:", block.chainid);
        console.log("=========================");
        
        console.log("\n=== UPDATE .ENV FILE ===");
        console.log("DELOAN_SIMPLE_CONTRACT_ADDRESS=", address(deloan));
        console.log("=====================");
        
        console.log("\n=== UNTUK FRONTEND CONFIG ===");
        console.log("export const DELOAN_SIMPLE_CONTRACT_ADDRESS = \"", address(deloan), "\" as const;");
        console.log("====================");
    }
}