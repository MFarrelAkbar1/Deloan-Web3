'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { DELOAN_ABI, DELOAN_CONTRACT_ADDRESS } from '../app/wagmi';

export default function LoanForm() {
  const [loanAmount, setLoanAmount] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [duration, setDuration] = useState('30');
  const [interestRate, setInterestRate] = useState('5');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loanAmount || !collateralAmount) {
      alert('Please fill all fields');
      return;
    }

    try {
      const loanAmountWei = parseEther(loanAmount);
      const collateralAmountWei = parseEther(collateralAmount);
      const durationSeconds = parseInt(duration) * 24 * 60 * 60; // Convert days to seconds

      writeContract({
        address: DELOAN_CONTRACT_ADDRESS,
        abi: DELOAN_ABI,
        functionName: 'createLoan',
        args: [loanAmountWei, BigInt(durationSeconds), BigInt(interestRate)],
        value: collateralAmountWei,
      });
    } catch (err) {
      console.error('Error creating loan:', err);
    }
  };

  const collateralRatio = loanAmount && collateralAmount 
    ? (parseFloat(collateralAmount) / parseFloat(loanAmount) * 100).toFixed(1)
    : '0';

  const isValidRatio = parseFloat(collateralRatio) >= 150;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-6">Create Loan</h2>
      
      <form onSubmit={handleCreateLoan} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Loan Amount (ETH)
          </label>
          <input
            type="number"
            step="0.01"
            value={loanAmount}
            onChange={(e) => setLoanAmount(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                     text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
            placeholder="0.5"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Collateral Amount (ETH)
          </label>
          <input
            type="number"
            step="0.01"
            value={collateralAmount}
            onChange={(e) => setCollateralAmount(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                     text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
            placeholder="1.0"
            required
          />
          <div className="mt-2 text-sm">
            <span className={`${isValidRatio ? 'text-green-400' : 'text-red-400'}`}>
              Collateral Ratio: {collateralRatio}%
            </span>
            {!isValidRatio && (
              <span className="text-red-400 block">
                Minimum 150% required
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Duration (Days)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                       text-white focus:outline-none focus:border-blue-400"
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Interest Rate (%)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                       text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming || !isValidRatio}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 
                   hover:from-blue-600 hover:to-purple-700 disabled:opacity-50
                   text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
        >
          {isPending ? 'Preparing...' : 
           isConfirming ? 'Creating Loan...' : 
           'Create Loan'}
        </button>

        {error && (
          <div className="text-red-400 text-sm mt-2">
            Error: {error.message}
          </div>
        )}

        {isConfirmed && (
          <div className="text-green-400 text-sm mt-2">
            Loan created successfully! 🎉
          </div>
        )}
      </form>
    </div>
  );
}