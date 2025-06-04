// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {DeLoan} from "../src/DeLoan.sol";

contract DeployScript is Script {
    DeLoan public deloan;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy DeLoan contract
        deloan = new DeLoan();
        
        console.log("DeLoan deployed to:", address(deloan));
        
        // Fund contract with some ETH for testing
        payable(address(deloan)).transfer(5 ether);
        
        console.log("Contract funded with 5 ETH");
        console.log("Contract balance:", address(deloan).balance);

        vm.stopBroadcast();
    }
}