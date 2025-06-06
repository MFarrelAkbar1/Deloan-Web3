import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  localhost,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'DeLoan Oracle',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'test123',
  chains: [
    localhost, // Local development
    sepolia,   // Testnet with Chainlink
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
  ],
  ssr: true,
});

// DeLoan Oracle ABI
export const DELOAN_ORACLE_ABI = [
  {
    inputs: [
      { name: '_amount', type: 'uint256' },
      { name: '_duration', type: 'uint256' },
      { name: '_interestRate', type: 'uint256' },
      { name: '_collateralToken', type: 'address' }
    ],
    name: 'createLoan',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: '_loanId', type: 'uint256' }],
    name: 'repayLoan',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: '_loanId', type: 'uint256' }],
    name: 'liquidateLoan',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: '_interestRate', type: 'uint256' }],
    name: 'createLendingPool',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: '_token', type: 'address' }],
    name: 'getLatestPrice',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_amount', type: 'uint256' }, { name: '_token', type: 'address' }],
    name: 'getCollateralValueUSD',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'calculateDynamicInterestRate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_loanId', type: 'uint256' }],
    name: 'canLiquidate',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '_user', type: 'address' }],
    name: 'getUserLoans',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: '', type: 'uint256' }],
    name: 'loans',
    outputs: [
      { name: 'borrower', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'collateral', type: 'uint256' },
      { name: 'interestRate', type: 'uint256' },
      { name: 'duration', type: 'uint256' },
      { name: 'startTime', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'isRepaid', type: 'bool' },
      { name: 'collateralToken', type: 'address' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getContractBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Mock Price Feed ABI
export const MOCK_PRICE_FEED_ABI = [
  {
    inputs: [{ name: '_price', type: 'int256' }],
    name: 'updatePrice',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: '_changePercent', type: 'int256' }],
    name: 'simulateVolatility',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [],
    name: 'latestRoundData',
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getCurrentPrice',
    outputs: [{ name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// frontend/deloan-frontend/src/app/wagmi.ts
export const BANK_LOAN_CONTRACT_ADDRESS = '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0' as `0x${string}`;

// Contract addresses - Use environment variables dengan fallback
export const DELOAN_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_DELOAN_CONTRACT_ADDRESS || 
  '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`;
  
export const ETH_PRICE_FEED_ADDRESS = (process.env.NEXT_PUBLIC_ETH_PRICE_FEED_ADDRESS || 
  '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as `0x${string}`;
  
export const BTC_PRICE_FEED_ADDRESS = (process.env.NEXT_PUBLIC_BTC_PRICE_FEED_ADDRESS || 
  '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as `0x${string}`;

// Token addresses
export const TOKENS = {
  ETH: '0x0000000000000000000000000000000000000000',
  BTC: '0x0000000000000000000000000000000000000001', // Mock BTC
} as const;