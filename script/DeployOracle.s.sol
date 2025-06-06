// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DeLoanOracle} from "../src/DeLoanOracle.sol";
import {MockPriceFeed} from "../src/MockPriceFeed.sol";

contract DeploySimpleScript is Script {
    DeLoanOracle public deloan;
    MockPriceFeed public ethPriceFeed;

    function run() external {
        vm.startBroadcast();

        console.log("=== DEPLOYING DELOAN ORACLE ===");

        // 1. Deploy mock price feed (ETH/USD) dengan decimals = 8
        console.log("1️⃣ Deploying Mock ETH/USD Price Feed...");
        ethPriceFeed = new MockPriceFeed(
            8,
            "ETH/USD",
            1,
            2000 * 10 ** 8  // $2000 → 2000 * 1e8
        );
        console.log("   → Price Feed @", address(ethPriceFeed));

        // 2. Deploy DeLoanOracle dengan parameter price feed
        console.log("2️⃣ Deploying DeLoanOracle...");
        deloan = new DeLoanOracle(address(ethPriceFeed));
        console.log("   → DeLoanOracle @", address(deloan));

        // 3. Fund contract dengan 10 ETH
        console.log("3️⃣ Funding DeLoanOracle with 10 ETH...");
        deloan.fundContract{value: 10 ether}();
        console.log("   ✅ Funded");

        // 4. Verifikasi price & balance
        uint256 ethPriceUSD = deloan.getETHPriceUSD();
        console.log("4️⃣ ETH Price from Oracle:", ethPriceUSD / 1e18, "USD");
        uint256 balance = deloan.getContractBalance();
        console.log("   Contract Balance:", balance / 1e18, "ETH");

        vm.stopBroadcast();

        // 5. Deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("DeLoanOracle: ", address(deloan));
        console.log("MockPriceFeed: ", address(ethPriceFeed));
        console.log("Owner:         ", deloan.owner());
        console.log("ETH Price 💰:   $", ethPriceUSD / 1e18);
        console.log("============================");

        console.log("\n=== FRONTEND CONFIG ===");
        console.log("NEXT_PUBLIC_DELOAN_CONTRACT_ADDRESS=", address(deloan));
        console.log("NEXT_PUBLIC_ETH_PRICE_FEED_ADDRESS=", address(ethPriceFeed));
        console.log("============================");
    }
}
