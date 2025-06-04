'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { DELOAN_ABI, DELOAN_CONTRACT_ADDRESS } from '../app/wagmi';

export default function LendingPoolForm() {
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('8');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = 
    useWaitForTransactionReceipt({ hash });

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount) {
      alert('Please enter amount');
      return;
    }

    try {
      const amountWei = parseEther(amount);

      writeContract({
        address: DELOAN_CONTRACT_ADDRESS,
        abi: DELOAN_ABI,
        functionName: 'createLendingPool',
        args: [BigInt(interestRate)],
        value: amountWei,
      });
    } catch (err) {
      console.error('Error creating lending pool:', err);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <h2 className="text-2xl font-bold text-white mb-6">Create Lending Pool</h2>
      
      <form onSubmit={handleCreatePool} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Amount to Lend (ETH)
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg 
                     text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
            placeholder="1.0"
            required
          />
          <p className="text-xs text-white/60 mt-1">
            Minimum 0.1 ETH required
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Interest Rate (% per year)
          </label>
          <div className="relative">
            <input
              type="range"
              min="3"
              max="15"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-white/60 mt-1">
              <span>3%</span>
              <span className="text-white font-medium">{interestRate}%</span>
              <span>15%</span>
            </div>
          </div>
        </div>

        {/* Expected Returns Calculator */}
        {amount && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-sm font-medium text-white mb-2">Expected Returns</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/70">Monthly:</span>
                <span className="text-green-400 ml-2 font-medium">
                  {((parseFloat(amount) * parseFloat(interestRate)) / 12 / 100).toFixed(4)} ETH
                </span>
              </div>
              <div>
                <span className="text-white/70">Yearly:</span>
                <span className="text-green-400 ml-2 font-medium">
                  {((parseFloat(amount) * parseFloat(interestRate)) / 100).toFixed(4)} ETH
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-start">
            <span className="text-yellow-400 mr-2">⚠️</span>
            <div className="text-xs text-yellow-200">
              <p className="font-medium mb-1">Risk Notice:</p>
              <p>Lending carries risks. Your funds will be locked when borrowed. 
                 Consider starting with smaller amounts.</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending || isConfirming}
          className="w-full bg-gradient-to-r from-green-500 to-blue-600 
                   hover:from-green-600 hover:to-blue-700 disabled:opacity-50
                   text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
        >
          {isPending ? 'Preparing...' : 
           isConfirming ? 'Creating Pool...' : 
           'Create Lending Pool'}
        </button>

        {error && (
          <div className="text-red-400 text-sm mt-2">
            Error: {error.message}
          </div>
        )}

        {isConfirmed && (
          <div className="text-green-400 text-sm mt-2">
            Lending pool created successfully! 🎉
          </div>
        )}
      </form>
    </div>
  );
}