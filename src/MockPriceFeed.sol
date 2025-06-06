// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract MockPriceFeed {
    uint8 public decimals;
    string public description;
    uint256 public version;
    
    int256 private price;
    uint80 private roundId;
    uint256 private updatedAt;
    
    constructor(
        uint8 _decimals,
        string memory _description,
        uint256 _version,
        int256 _initialPrice
    ) {
        decimals = _decimals;
        description = _description;
        version = _version;
        price = _initialPrice;
        roundId = 1;
        updatedAt = block.timestamp;
    }
    
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId_,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt_,
            uint80 answeredInRound
        )
    {
        return (
            roundId,
            price,
            updatedAt,
            updatedAt,
            roundId
        );
    }
    
    // Function to update price for testing
    function updatePrice(int256 _price) external {
        price = _price;
        roundId++;
        updatedAt = block.timestamp;
    }
    
    // Simulate price volatility for testing
    function simulateVolatility(int256 _changePercent) external {
        price = price + (price * _changePercent / 100);
        roundId++;
        updatedAt = block.timestamp;
    }
    
    // Get current price (for easy access)
    function getCurrentPrice() external view returns (int256) {
        return price;
    }
}