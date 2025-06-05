// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DeLoanOracle} from "../src/DeLoanOracle.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";

contract DeployOracleScript is Script {
    DeLoanOracle public deloan;
    MockPriceFeed public ethPriceFeed;
    MockPriceFeed public btcPriceFeed;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        console.log("=== DEPLOYING DELOAN WITH ORACLE ===");
        
        // Deploy Mock Price Feeds for local testing
        console.log("1. Deploying Mock Price Feeds...");
        
        // ETH/USD price feed (starting at $2000)
        ethPriceFeed = new MockPriceFeed(
            8, // decimals
            "ETH/USD",
            1, // version
            200000000000 // $2000 with 8 decimals (2000 * 10^8)
        );
        
        // BTC/USD price feed (starting at $40000)  
        btcPriceFeed = new MockPriceFeed(
            8, // decimals
            "BTC/USD", 
            1, // version
            4000000000000 // $40000 with 8 decimals (40000 * 10^8)
        );
        
        console.log("   ETH Price Feed deployed to:", address(ethPriceFeed));
        console.log("   BTC Price Feed deployed to:", address(btcPriceFeed));

        // Deploy DeLoan Oracle contract
        console.log("2. Deploying DeLoan Oracle Contract...");
        deloan = new DeLoanOracle();
        console.log("   DeLoan Oracle deployed to:", address(deloan));
        
        // Add price feeds to DeLoan contract
        console.log("3. Adding Price Feeds to DeLoan...");
        deloan.addPriceFeed(address(0), address(ethPriceFeed)); // ETH (address(0))
        deloan.addPriceFeed(address(0x1), address(btcPriceFeed)); // Mock BTC address
        console.log("   Price feeds added successfully");
        
        // Fund contract with ETH for testing
        console.log("4. Funding Contract...");
        payable(address(deloan)).transfer(10 ether);
        console.log("   Contract funded with 10 ETH");
        
        // Test Oracle functionality
        console.log("5. Testing Oracle...");
        uint256 ethPrice = deloan.getLatestPrice(address(0));
        uint256 dynamicRate = deloan.calculateDynamicInterestRate();
        
        console.log("   ETH Price from Oracle:", ethPrice);
        console.log("   Dynamic Interest Rate:", dynamicRate, "%");
        console.log("   Contract Balance:", address(deloan).balance);

        vm.stopBroadcast();
        
        // Summary for frontend integration
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("DeLoan Oracle Contract:", address(deloan));
        console.log("ETH Price Feed:", address(ethPriceFeed));
        console.log("BTC Price Feed:", address(btcPriceFeed));
        console.log("Current ETH Price: $", ethPrice / 1e18);
        console.log("==========================");
        
        // Save addresses to file for frontend
        console.log("\n=== FOR FRONTEND CONFIG ===");
        console.log('export const DELOAN_CONTRACT_ADDRESS = "', address(deloan), '" as const;');
        console.log('export const ETH_PRICE_FEED_ADDRESS = "', address(ethPriceFeed), '" as const;');
        console.log('export const BTC_PRICE_FEED_ADDRESS = "', address(btcPriceFeed), '" as const;');
        console.log("=============================");
    }
}