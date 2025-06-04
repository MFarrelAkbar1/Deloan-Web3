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
  appName: 'DeLoan',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    localhost, // Local development
    sepolia,   // Testnet
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
  ],
  ssr: true,
});

// DeLoan contract ABI
export const DELOAN_ABI = [
  {
    inputs: [
      { name: '_amount', type: 'uint256' },
      { name: '_duration', type: 'uint256' },
      { name: '_interestRate', type: 'uint256' }
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
    inputs: [{ name: '_interestRate', type: 'uint256' }],
    name: 'createLendingPool',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
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
      { name: 'isRepaid', type: 'bool' }
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
  },
  {
    inputs: [{ name: '_loanId', type: 'uint256' }],
    name: 'calculateInterest',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// Contract address - Update setelah deploy
export const DELOAN_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`;