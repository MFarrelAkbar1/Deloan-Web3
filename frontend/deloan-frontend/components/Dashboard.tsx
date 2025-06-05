'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { 
  DELOAN_CONTRACT_ADDRESS, 
  DELOAN_ORACLE_ABI, 
  ETH_PRICE_FEED_ADDRESS,
  MOCK_PRICE_FEED_ABI,
  TOKENS 
} from '../src/app/wagmi';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'borrow' | 'lend' | 'portfolio' | 'oracle'>('dashboard');

  // Read Oracle data
  const { data: ethPrice, refetch: refetchEthPrice } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ORACLE_ABI,
    functionName: 'getLatestPrice',
    args: [TOKENS.ETH],
  });

  const { data: dynamicRate, refetch: refetchDynamicRate } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ORACLE_ABI,
    functionName: 'calculateDynamicInterestRate',
  });

  const { data: contractBalance } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ORACLE_ABI,
    functionName: 'getContractBalance',
  });

  const { data: userLoans } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ORACLE_ABI,
    functionName: 'getUserLoans',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Mock price update for testing
  const { writeContract: updatePrice } = useWriteContract();

  // Auto-refresh prices
  useEffect(() => {
    const interval = setInterval(() => {
      refetchEthPrice();
      refetchDynamicRate();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [refetchEthPrice, refetchDynamicRate]);

  // Simulate price changes for testing
  const simulatePriceChange = (changePercent: number) => {
    updatePrice({
      address: ETH_PRICE_FEED_ADDRESS,
      abi: MOCK_PRICE_FEED_ABI,
      functionName: 'simulateVolatility',
      args: [BigInt(changePercent)],
    });

    setTimeout(() => {
      refetchEthPrice();
      refetchDynamicRate();
    }, 2000);
  };

  const formatPrice = (price: bigint) => {
    return (Number(formatEther(price)) / 1e10).toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome to DeLoan Oracle
          </h2>
          <p className="text-white/80 mb-8">
            Connect your wallet to access oracle-powered lending
          </p>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">
              🔮 Oracle-Powered Features
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-blue-400 text-2xl mb-2">⚡</div>
                <h4 className="font-medium text-white mb-2">Real-time Pricing</h4>
                <p className="text-white/70 text-sm">
                  Chainlink oracles provide accurate, real-time price feeds.
                </p>
              </div>
              <div>
                <div className="text-blue-400 text-2xl mb-2">🛡️</div>
                <h4 className="font-medium text-white mb-2">Auto Liquidation</h4>
                <p className="text-white/70 text-sm">
                  Smart contracts automatically liquidate risky positions.
                </p>
              </div>
              <div>
                <div className="text-blue-400 text-2xl mb-2">📈</div>
                <h4 className="font-medium text-white mb-2">Dynamic Rates</h4>
                <p className="text-white/70 text-sm">
                  Interest rates adjust based on market conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Live Oracle Status */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8 border border-white/20">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">🔮 Oracle Status</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-white/90">Live Prices</span>
              </div>
              <div className="text-white/70">|</div>
              <div className="text-white/90">
                ETH: ${ethPrice ? formatPrice(ethPrice) : '---'}
              </div>
              <div className="text-white/70">|</div>
              <div className="text-white/90">
                APY: {dynamicRate ? dynamicRate.toString() : '---'}%
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-sm">Last Updated</div>
            <div className="text-white font-medium">{new Date().toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">Total Liquidity</h3>
          <p className="text-2xl font-bold text-white">
            {contractBalance ? formatEther(contractBalance) : '0'} ETH
          </p>
          <p className="text-xs text-white/60">
            ≈ ${contractBalance && ethPrice ? 
              ((Number(formatEther(contractBalance)) * Number(formatPrice(ethPrice)))).toFixed(0) : 
              '---'} USD
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">Your Loans</h3>
          <p className="text-2xl font-bold text-white">
            {userLoans ? userLoans.length : 0}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">ETH Price</h3>
          <p className="text-2xl font-bold text-white">
            ${ethPrice ? formatPrice(ethPrice) : '---'}
          </p>
          <p className="text-xs text-green-400">Oracle Feed</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">Dynamic APY</h3>
          <p className="text-2xl font-bold text-white">
            {dynamicRate ? dynamicRate.toString() : '---'}%
          </p>
          <p className="text-xs text-blue-400">Auto-Adjusted</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 mb-8">
        <div className="flex border-b border-white/20 overflow-x-auto">
          {(['dashboard', 'borrow', 'lend', 'portfolio', 'oracle'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-400'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {tab === 'oracle' ? '🔮 Oracle' : tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Oracle Dashboard</h3>
              
              {/* Quick Actions */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-xl p-6">
                  <h4 className="font-medium text-white mb-4">🚀 Quick Borrow</h4>
                  <p className="text-white/70 text-sm mb-4">
                    Create oracle-backed loans with real-time collateral validation
                  </p>
                  <button 
                    onClick={() => setActiveTab('borrow')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Start Borrowing
                  </button>
                </div>
                
                <div className="bg-white/5 rounded-xl p-6">
                  <h4 className="font-medium text-white mb-4">💰 Quick Lend</h4>
                  <p className="text-white/70 text-sm mb-4">
                    Earn dynamic interest rates that adjust with market conditions
                  </p>
                  <button 
                    onClick={() => setActiveTab('lend')}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Start Lending
                  </button>
                </div>
              </div>

              {/* Market Overview */}
              <div className="bg-white/5 rounded-xl p-6">
                <h4 className="font-medium text-white mb-4">📊 Market Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-white/70">Utilization Rate:</span>
                    <span className="text-white ml-2">67%</span>
                  </div>
                  <div>
                    <span className="text-white/70">Total Borrowed:</span>
                    <span className="text-white ml-2">45.2 ETH</span>
                  </div>
                  <div>
                    <span className="text-white/70">Avg. Health Factor:</span>
                    <span className="text-green-400 ml-2">2.1</span>
                  </div>
                  <div>
                    <span className="text-white/70">Liquidations 24h:</span>
                    <span className="text-yellow-400 ml-2">3</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'borrow' && (
            <LoanForm />
          )}

          {activeTab === 'lend' && (
            <div className="text-center py-12">
              <h3 className="text-xl text-white mb-4">Lending with Oracle Protection</h3>
              <p className="text-white/70 mb-6">
                Lend your ETH and earn dynamic interest rates backed by real-time oracle data
              </p>
              <div className="bg-white/5 rounded-xl p-6 inline-block">
                <p className="text-white/80">Coming soon: Oracle-protected lending pools</p>
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div>
              <h3 className="text-xl font-semibold text-white mb-6">Your Oracle Portfolio</h3>
              {userLoans && userLoans.length > 0 ? (
                <div className="space-y-4">
                  {userLoans.map((loanId: bigint, index: number) => (
                    <LoanCard key={index} loanId={loanId} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-white/70 mb-4">No oracle loans found</p>
                  <button
                    onClick={() => setActiveTab('borrow')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Create Your First Oracle Loan
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'oracle' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-6">🔮 Oracle Control Panel</h3>
              
              {/* Price Display */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-xl p-6">
                  <h4 className="font-medium text-white mb-4">Current Prices</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/70">ETH/USD:</span>
                      <span className="text-white font-mono">${ethPrice ? formatPrice(ethPrice) : '---'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Dynamic APY:</span>
                      <span className="text-white font-mono">{dynamicRate ? dynamicRate.toString() : '---'}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h4 className="font-medium text-white mb-4">Price Simulation (Testing)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => simulatePriceChange(5)}
                      className="px-3 py-2 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors"
                    >
                      +5% Bull
                    </button>
                    <button
                      onClick={() => simulatePriceChange(-5)}
                      className="px-3 py-2 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30 transition-colors"
                    >
                      -5% Bear
                    </button>
                    <button
                      onClick={() => simulatePriceChange(-15)}
                      className="px-3 py-2 bg-red-500/30 text-red-300 rounded text-sm hover:bg-red-500/40 transition-colors"
                    >
                      -15% Crash
                    </button>
                    <button
                      onClick={() => {
                        refetchEthPrice();
                        refetchDynamicRate();
                      }}
                      className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded text-sm hover:bg-blue-500/30 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              </div>

              {/* Oracle Features */}
              <div className="bg-white/5 rounded-xl p-6">
                <h4 className="font-medium text-white mb-4">Oracle Features Active</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-white/80">Real-time Price Feeds</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-white/80">Auto Liquidation</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-white/80">Dynamic Interest Rates</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-white/80">Multi-Asset Support</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Oracle Loan Form Component
function LoanForm() {
  const [loanAmount, setLoanAmount] = useState('');
  const [collateralAmount, setCollateralAmount] = useState('');
  const [duration, setDuration] = useState('30');

  const { data: ethPrice } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ORACLE_ABI,
    functionName: 'getLatestPrice',
    args: [TOKENS.ETH],
  });

  const { data: dynamicRate } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ORACLE_ABI,
    functionName: 'calculateDynamicInterestRate',
  });

  const { writeContract, isPending } = useWriteContract();

  const getUSDValue = (ethAmount: string) => {
    if (!ethPrice || !ethAmount) return 0;
    const priceInUSD = Number(formatEther(ethPrice)) / 1e10;
    return parseFloat(ethAmount) * priceInUSD;
  };

  const loanValueUSD = getUSDValue(loanAmount);
  const collateralValueUSD = getUSDValue(collateralAmount);
  const collateralRatio = loanValueUSD > 0 ? (collateralValueUSD / loanValueUSD * 100) : 0;
  const isValidRatio = collateralRatio >= 150;

  const handleCreateLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidRatio) {
      alert('Insufficient collateral ratio');
      return;
    }

    try {
      writeContract({
        address: DELOAN_CONTRACT_ADDRESS,
        abi: DELOAN_ORACLE_ABI,
        functionName: 'createLoan',
        args: [
          parseEther(loanAmount),
          BigInt(parseInt(duration) * 24 * 60 * 60),
          dynamicRate || BigInt(5),
          TOKENS.ETH
        ],
        value: parseEther(collateralAmount),
      });
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold text-white mb-6">🔮 Create Oracle-Backed Loan</h3>
      
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-blue-200 text-sm">Current ETH Price</div>
            <div className="text-white text-xl font-bold">
              ${ethPrice ? (Number(formatEther(ethPrice)) / 1e10).toFixed(2) : '---'}
            </div>
          </div>
          <div>
            <div className="text-blue-200 text-sm">Dynamic APY</div>
            <div className="text-white text-xl font-bold">
              {dynamicRate ? dynamicRate.toString() : '---'}%
            </div>
          </div>
        </div>
      </div>

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
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            placeholder="0.5"
            required
          />
          {loanAmount && (
            <p className="text-xs text-white/60 mt-1">≈ ${loanValueUSD.toFixed(2)} USD</p>
          )}
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
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            placeholder="1.0"
            required
          />
          <div className="mt-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-white/70">Collateral Value:</span>
              <span className="text-white">${collateralValueUSD.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Collateral Ratio:</span>
              <span className={isValidRatio ? 'text-green-400' : 'text-red-400'}>
                {collateralRatio.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Duration (Days)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="60">60 Days</option>
            <option value="90">90 Days</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={!isValidRatio || isPending}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all"
        >
          {isPending ? 'Creating Oracle Loan...' : 'Create Oracle Loan'}
        </button>
      </form>
    </div>
  );
}

// Oracle Loan Card Component  
function LoanCard({ loanId }: { loanId: bigint }) {
  const { data: loan } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ORACLE_ABI,
    functionName: 'loans',
    args: [loanId],
  });

  const { data: canLiquidate } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_ORACLE_ABI,
    functionName: 'canLiquidate',
    args: [loanId],
  });

  if (!loan) return null;

  const [borrower, amount, collateral, interestRate, duration, startTime, isActive, isRepaid] = loan;

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-semibold text-white">Oracle Loan #{loanId.toString()}</h4>
          <p className="text-white/70">{formatEther(amount)} ETH</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm ${
          canLiquidate ? 'bg-red-500/20 text-red-400' :
          isRepaid ? 'bg-green-500/20 text-green-400' :
          isActive ? 'bg-blue-500/20 text-blue-400' :
          'bg-gray-500/20 text-gray-400'
        }`}>
          {canLiquidate ? '⚠️ At Risk' : isRepaid ? 'Repaid' : isActive ? 'Active' : 'Inactive'}
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