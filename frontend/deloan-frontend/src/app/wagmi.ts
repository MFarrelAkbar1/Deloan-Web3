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
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'DeLoan Indonesia',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'test123',
  chains: [
    localhost, // Local development
    sepolia, // Testnet with Chainlink
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
  ],
  ssr: true,
});

// DeLoan Simple ABI (Smart Contract yang baru)
export const DELOAN_SIMPLE_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "loanId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "borrower",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "durationDays",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "bankAccount",
        "type": "string"
      }
    ],
    "name": "LoanApplied",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "loanId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "borrower",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum DeLoanSimple.LoanStatus",
        "name": "finalStatus",
        "type": "uint8"
      }
    ],
    "name": "LoanFinalized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "loanId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum DeLoanSimple.LoanStatus",
        "name": "status",
        "type": "uint8"
      }
    ],
    "name": "LoanStatusUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_username",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_reason",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_durationDays",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_bankAccount",
        "type": "string"
      }
    ],
    "name": "applyLoan",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_loanId",
        "type": "uint256"
      }
    ],
    "name": "finalizeLoan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_loanId",
        "type": "uint256"
      }
    ],
    "name": "getLoan",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "loanId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "borrower",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "username",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "reason",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "durationDays",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "bankAccount",
            "type": "string"
          },
          {
            "internalType": "enum DeLoanSimple.LoanStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "appliedAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct DeLoanSimple.Loan",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_user",
        "type": "address"
      }
    ],
    "name": "getUserLoans",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "loans",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "loanId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "borrower",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "durationDays",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "bankAccount",
        "type": "string"
      },
      {
        "internalType": "enum DeLoanSimple.LoanStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "appliedAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextLoanId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Compatibility: Export DELOAN_ORACLE_ABI as alias untuk DELOAN_SIMPLE_ABI
export const DELOAN_ORACLE_ABI = DELOAN_SIMPLE_ABI;

// Mock Price Feed ABI untuk testing
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

// Contract addresses - Update setelah deploy
export const DELOAN_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_DELOAN_CONTRACT_ADDRESS ||
  '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`;

export const ETH_PRICE_FEED_ADDRESS = (process.env.NEXT_PUBLIC_ETH_PRICE_FEED_ADDRESS ||
  '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512') as `0x${string}`;

export const BTC_PRICE_FEED_ADDRESS = (process.env.NEXT_PUBLIC_BTC_PRICE_FEED_ADDRESS ||
  '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as `0x${string}`;

// Token addresses
export const TOKENS = {
  ETH: '0x0000000000000000000000000000000000000000',
  BTC: '0x0000000000000000000000000000000000000001',
} as const;

// Loan Status enum
export const LoanStatus = {
  Pending: 0,
  Approved: 1,
  Rejected: 2,
  Transferred: 3,
  Repaid: 4,
  Defaulted: 5
} as const;

// Currency conversion rates
export const CONVERSION_RATES = {
  ETH_TO_IDR: 48000000, // 1 ETH = 48 juta IDR
  USD_TO_IDR: 15500, // 1 USD = 15,500 IDR
} as const;

// Utility functions
export const formatIDR = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const parseIDR = (idrString: string) => {
  return parseInt(idrString.replace(/[^\d]/g, ''));
};

export const convertETHToIDR = (ethAmount: number) => {
  return ethAmount * CONVERSION_RATES.ETH_TO_IDR;
};

export const convertIDRToETH = (idrAmount: number) => {
  return idrAmount / CONVERSION_RATES.ETH_TO_IDR;
};