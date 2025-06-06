// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DeLoanOracle} from "../src/DeLoanOracle.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";

contract DeploySimpleScript is Script {
    DeLoanOracle public deloan;
    MockPriceFeed public ethPriceFeed;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        console.log("=== DEPLOYING DELOAN SIMPLE ==");

        // 1. Deploy Mock ETH Price Feed ($2000)
        console.log("1. Deploying ETH Price Feed...");
        ethPriceFeed = new MockPriceFeed(
            8, // decimals
            "ETH/USD",
            1, // version
            200000000000 // $2000 * 10^8
        );
        console.log("   ETH Price Feed:", address(ethPriceFeed));

        // 2. Deploy DeLoan Oracle
        console.log("2. Deploying DeLoan Oracle...");
        deloan = new DeLoanOracle(address(ethPriceFeed));
        console.log("   DeLoan Oracle:", address(deloan));

        // 3. Fund contract dengan 10 ETH
        console.log("3. Funding contract...");
        deloan.fundContract{value: 10 ether}();
        console.log("   Funded with 10 ETH");

        // 4. Test oracle functionality
        console.log("4. Testing...");
        uint256 ethPrice = deloan.getETHPriceUSD();
        console.log("   ETH Price:", ethPrice / 1e18, "USD");
        console.log("   Contract Balance:", deloan.getContractBalance() / 1e18, "ETH");

        vm.stopBroadcast();

        // Summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("DeLoan Oracle:", address(deloan));
        console.log("ETH Price Feed:", address(ethPriceFeed));
        console.log("Owner:", deloan.owner());
        console.log("ETH Price: $", ethPrice / 1e18);
        console.log("============================");

        // Frontend config
        console.log("\n=== FRONTEND CONFIG ===");
        console.log("NEXT_PUBLIC_DELOAN_CONTRACT_ADDRESS=", address(deloan));
        console.log("NEXT_PUBLIC_ETH_PRICE_FEED_ADDRESS=", address(ethPriceFeed));
        console.log("========================");
    }
}