'use client';

import { useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatEther } from 'viem';
import { DELOAN_ABI, DELOAN_CONTRACT_ADDRESS } from '../src/app/wagmi';
import LoanForm from './LoanForm';
import LendingPoolForm from './LendingPoolForm';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'borrow' | 'lend' | 'portfolio'>('borrow');

  // Read user's loans
  const { data: userLoans } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ABI,
    functionName: 'getUserLoans',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read contract balance
  const { data: contractBalance } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ABI,
    functionName: 'getContractBalance',
  });

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome to DeLoan
          </h2>
          <p className="text-white/80 mb-8">
            Connect your wallet to start borrowing or lending
          </p>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">
              Why Choose DeLoan?
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-blue-400 text-2xl mb-2">⚡</div>
                <h4 className="font-medium text-white mb-2">Fast & Efficient</h4>
                <p className="text-white/70 text-sm">
                  Get loans in minutes, not weeks. Smart contracts automate everything.
                </p>
              </div>
              <div>
                <div className="text-blue-400 text-2xl mb-2">🔒</div>
                <h4 className="font-medium text-white mb-2">Secure & Transparent</h4>
                <p className="text-white/70 text-sm">
                  All transactions on blockchain. No hidden fees or middlemen.
                </p>
              </div>
              <div>
                <div className="text-blue-400 text-2xl mb-2">🌟</div>
                <h4 className="font-medium text-white mb-2">Student Friendly</h4>
                <p className="text-white/70 text-sm">
                  Designed for students and communities with flexible terms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">Total Liquidity</h3>
          <p className="text-2xl font-bold text-white">
            {contractBalance ? formatEther(contractBalance) : '0'} ETH
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">Your Loans</h3>
          <p className="text-2xl font-bold text-white">
            {userLoans ? userLoans.length : 0}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">APY Range</h3>
          <p className="text-2xl font-bold text-white">3-15%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 mb-8">
        <div className="flex border-b border-white/20">
          {(['borrow', 'lend', 'portfolio'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-400'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'borrow' && (
            <div className="grid lg:grid-cols-2 gap-8">
              <LoanForm />
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                  How Borrowing Works
                </h3>
                <div className="space-y-3 text-white/80">
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
                    <span>Provide ETH as collateral (minimum 150% of loan amount)</span>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
                    <span>Set your preferred loan duration and interest rate</span>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
                    <span>Receive funds instantly from the liquidity pool</span>
                  </div>
                  <div className="flex items-start">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">4</span>
                    <span>Repay loan + interest to get your collateral back</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'lend' && (
            <div className="grid lg:grid-cols-2 gap-8">
              <LendingPoolForm />
              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4">
                  Lending Benefits
                </h3>
                <div className="space-y-4 text-white/80">
                  <div>
                    <h4 className="font-medium text-white">Earn Passive Income</h4>
                    <p className="text-sm">Provide liquidity and earn interest from borrowers</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Flexible Terms</h4>
                    <p className="text-sm">Set your own interest rates and conditions</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Secure Collateral</h4>
                    <p className="text-sm">All loans are over-collateralized for protection</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Instant Liquidity</h4>
                    <p className="text-sm">Withdraw your funds anytime (when not lent)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-6">Your Portfolio</h3>
              {userLoans && userLoans.length > 0 ? (
                <div className="space-y-4">
                  {userLoans.map((loanId, index) => (
                    <LoanCard key={index} loanId={loanId} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-white/70">No loans found</p>
                  <button
                    onClick={() => setActiveTab('borrow')}
                    className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Create Your First Loan
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Component untuk menampilkan loan card
function LoanCard({ loanId }: { loanId: bigint }) {
  const { data: loan } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ABI,
    functionName: 'loans',
    args: [loanId],
  });

  if (!loan) return null;

  const [borrower, amount, collateral, interestRate, duration, startTime, isActive, isRepaid] = loan;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-semibold text-white">
            Loan #{loanId.toString()}
          </h4>
          <p className="text-white/70">
            {formatEther(amount)} ETH
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          isRepaid ? 'bg-green-500/20 text-green-400' :
          isActive ? 'bg-blue-500/20 text-blue-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {isRepaid ? 'Repaid' : isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-white/70">Collateral:</span>
          <span className="text-white ml-2">{formatEther(collateral)} ETH</span>
        </div>
        <div>
          <span className="text-white/70">Interest:</span>
          <span className="text-white ml-2">{interestRate.toString()}%</span>
        </div>
      </div>
    </div>
  );
}