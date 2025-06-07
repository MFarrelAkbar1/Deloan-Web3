'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import {
  DELOAN_CONTRACT_ADDRESS,
  DELOAN_SIMPLE_ABI,
  ETH_PRICE_FEED_ADDRESS,
  MOCK_PRICE_FEED_ABI,
  formatIDR,
  parseIDR,
  CONVERSION_RATES,
} from '../src/app/wagmi';

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'oracle'>('dashboard');
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Read data dari smart contract
  const { data: userLoans } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_SIMPLE_ABI,
    functionName: 'getUserLoans',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: nextLoanId } = useReadContract({
    address: DELOAN_CONTRACT_ADDRESS,
    abi: DELOAN_SIMPLE_ABI,
    functionName: 'nextLoanId',
  });

  // Mock price untuk demo (dalam production gunakan oracle real)
  const mockETHPrice = 2000; // $2000 USD
  const ethPriceIDR = mockETHPrice * CONVERSION_RATES.USD_TO_IDR;

  // Fetch loans dari backend
  const fetchLoans = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/loan');
      if (response.ok) {
        const data = await response.json();
        setLoans(data);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isConnected) {
      fetchLoans();
    }
  }, [isConnected]);

  const userBackendLoans = loans.filter(loan => 
    loan.borrowerWallet?.toLowerCase() === address?.toLowerCase()
  );

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Welcome to DeLoan Indonesia
          </h2>
          <p className="text-white/80 mb-8">
            Platform pinjaman mikro dengan jaminan kripto. Pinjam dalam Rupiah, jaminan ETH.
          </p>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">
              🇮🇩 Fitur Pinjaman Rupiah
            </h3>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-blue-400 text-2xl mb-2">💰</div>
                <h4 className="font-medium text-white mb-2">Pinjam dalam IDR</h4>
                <p className="text-white/70 text-sm">
                  Ajukan pinjaman dalam Rupiah, bayar dengan transfer bank.
                </p>
              </div>
              <div>
                <div className="text-blue-400 text-2xl mb-2">⚡</div>
                <h4 className="font-medium text-white mb-2">Jaminan ETH</h4>
                <p className="text-white/70 text-sm">
                  Gunakan ETH sebagai jaminan dengan nilai real-time.
                </p>
              </div>
              <div>
                <div className="text-blue-400 text-2xl mb-2">🏦</div>
                <h4 className="font-medium text-white mb-2">Pembayaran Mudah</h4>
                <p className="text-white/70 text-sm">
                  Bayar cicilan melalui transfer bank atau e-wallet.
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
      {/* Live Status */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 mb-8 border border-white/20">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">📊 Status Real-time</h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-white/90">ETH Price Live</span>
              </div>
              <div className="text-white/70">|</div>
              <div className="text-white/90">
                ETH: ${mockETHPrice} USD
              </div>
              <div className="text-white/70">|</div>
              <div className="text-white/90">
                ≈ {formatIDR(ethPriceIDR)}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white/80 text-sm">Last Updated</div>
            <div className="text-white font-medium">{new Date().toLocaleTimeString('id-ID')}</div>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">Total Pinjaman</h3>
          <p className="text-2xl font-bold text-white">
            {nextLoanId ? nextLoanId.toString() : '0'}
          </p>
          <p className="text-xs text-white/60">Di sistem</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">Pinjaman Anda</h3>
          <p className="text-2xl font-bold text-white">
            {userBackendLoans.length}
          </p>
          <p className="text-xs text-white/60">Total aplikasi</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">Harga ETH</h3>
          <p className="text-2xl font-bold text-white">
            {formatIDR(ethPriceIDR)}
          </p>
          <p className="text-xs text-green-400">Real-time</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <h3 className="text-sm font-medium text-white/80">Bunga Tahunan</h3>
          <p className="text-2xl font-bold text-white">5%</p>
          <p className="text-xs text-blue-400">Per tahun</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 mb-8">
        <div className="flex border-b border-white/20 overflow-x-auto">
          {(['dashboard', 'oracle'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-400'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {tab === 'dashboard' ? '🏠 Dashboard' : '⚙️ Oracle'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Selamat Datang di DeLoan Indonesia!</h3>
              
              {/* Loan Application Form */}
              <div className="bg-white/5 rounded-xl p-6">
                <h4 className="font-medium text-white mb-4">💰 Ajukan Pinjaman</h4>
                <LoanFormIDR onSuccess={fetchLoans} />
              </div>

              {/* User's Loans Portfolio */}
              <div className="bg-white/5 rounded-xl p-6">
                <h4 className="font-medium text-white mb-4">📊 Pinjaman Anda</h4>
                <PortfolioIDR loans={userBackendLoans} loading={loading} onRefresh={fetchLoans} />
              </div>

              {/* Recent Loans Summary */}
              <div className="bg-white/5 rounded-xl p-6">
                <h4 className="font-medium text-white mb-4">📋 Ringkasan Sistem</h4>
                {loading ? (
                  <p className="text-white/70">Loading...</p>
                ) : (
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{loans.length}</div>
                      <div className="text-white/70 text-sm">Total Pinjaman</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {loans.filter(l => l.status === 'repaid').length}
                      </div>
                      <div className="text-white/70 text-sm">Lunas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {loans.filter(l => l.status === 'pending').length}
                      </div>
                      <div className="text-white/70 text-sm">Pending</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'oracle' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-white mb-6">⚙️ Panel Oracle</h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-xl p-6">
                  <h4 className="font-medium text-white mb-4">Harga Saat Ini</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-white/70">ETH/USD:</span>
                      <span className="text-white font-mono">${mockETHPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">ETH/IDR:</span>
                      <span className="text-white font-mono">
                        {formatIDR(ethPriceIDR)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-6">
                  <h4 className="font-medium text-white mb-4">Smart Contract Info</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Contract:</span>
                      <span className="text-white font-mono text-xs">
                        {DELOAN_CONTRACT_ADDRESS.slice(0, 8)}...{DELOAN_CONTRACT_ADDRESS.slice(-6)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Next Loan ID:</span>
                      <span className="text-white">{nextLoanId?.toString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Your Loans:</span>
                      <span className="text-white">{userLoans?.length || 0}</span>
                    </div>
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

// Komponen Form Pinjaman dengan Toast Notification
function LoanFormIDR({ onSuccess }: { onSuccess: () => void }) {
  const [loanAmountIDR, setLoanAmountIDR] = useState('');
  const [duration, setDuration] = useState('30');
  const [reason, setReason] = useState('');
  const [username, setUsername] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  
  // State untuk notification
  const [submitStatus, setSubmitStatus] = useState<'loading' | 'success' | 'error' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const { address } = useAccount();
  const loanAmountNumber = parseIDR(loanAmountIDR);
  const loanAmountETH = loanAmountNumber / CONVERSION_RATES.ETH_TO_IDR;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !loanAmountIDR || !reason) {
      setSubmitStatus('error');
      setStatusMessage('Mohon lengkapi semua field');
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    if (loanAmountNumber < 10000) {
      setSubmitStatus('error');
      setStatusMessage('Masukan angka lebih dari 10.000');
      setTimeout(() => setSubmitStatus(null), 3000);
      return;
    }

    // Set loading state
    setSubmitStatus('loading');
    setStatusMessage('Sedang mengajukan pinjaman...');

    try {
      const response = await fetch('http://localhost:5000/loan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanId: Date.now(),
          borrowerWallet: address,
          amount: loanAmountNumber,
          remainingAmount: loanAmountNumber,
          reason,
          durationDays: parseInt(duration),
          bankAccount,
          username,
          status: 'pending',
        }),
      });

      if (response.ok) {
        // Success state
        setSubmitStatus('success');
        setStatusMessage('Pinjaman berhasil diajukan! Data akan muncul di dashboard.');
        
        // Reset form
        setLoanAmountIDR('');
        setUsername('');
        setReason('');
        setBankAccount('');
        
        // Refresh data dan clear notification
        setTimeout(() => {
          onSuccess(); // Refresh loan data
          setSubmitStatus(null);
        }, 2000);
        
      } else {
        const errorData = await response.json();
        setSubmitStatus('error');
        setStatusMessage(errorData.error || 'Gagal menyimpan ke database');
        setTimeout(() => setSubmitStatus(null), 5000);
      }

    } catch (err) {
      console.error('Error:', err);
      setSubmitStatus('error');
      setStatusMessage('Gagal mengajukan pinjaman. Periksa koneksi internet.');
      setTimeout(() => setSubmitStatus(null), 5000);
    }
  };

  return (
    <div className="max-w-2xl">
      {/* Toast Notification */}
      {submitStatus && (
        <div className={`mb-4 p-4 rounded-lg border transition-all duration-300 ${
          submitStatus === 'loading' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
          submitStatus === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center space-x-2">
            {submitStatus === 'loading' && (
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            )}
            {submitStatus === 'success' && <span>✅</span>}
            {submitStatus === 'error' && <span>❌</span>}
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            placeholder="Masukkan username Anda"
            required
            disabled={submitStatus === 'loading'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Jumlah Pinjaman (IDR)
          </label>
          <input
            type="text"
            value={loanAmountIDR}
            onChange={(e) => {
              const value = e.target.value.replace(/[^\d]/g, '');
              setLoanAmountIDR(value ? formatIDR(parseInt(value)).replace('Rp', '').trim() : '');
            }}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            placeholder="1.000.000"
            required
            disabled={submitStatus === 'loading'}
          />
          {loanAmountIDR && (
            <p className="text-xs text-white/60 mt-1">
              ≈ {loanAmountETH.toFixed(6)} ETH (untuk referensi)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Alasan Pinjaman
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            placeholder="Modal usaha, biaya pendidikan, dll."
            rows={3}
            required
            disabled={submitStatus === 'loading'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Nomor Rekening Bank (Opsional)
          </label>
          <input
            type="text"
            value={bankAccount}
            onChange={(e) => setBankAccount(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            placeholder="1234567890"
            disabled={submitStatus === 'loading'}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Jangka Waktu (Hari)
          </label>
            <select
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            disabled={submitStatus === 'loading'}
            >
            <option value="7" className="text-black">7 Hari</option>
            <option value="14" className="text-black">14 Hari</option>
            <option value="30" className="text-black">30 Hari</option>
            <option value="60" className="text-black">60 Hari</option>
            <option value="90" className="text-black">90 Hari</option>
            </select>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <h4 className="text-yellow-200 font-medium mb-2">ℹ️ Informasi Penting:</h4>
          <ul className="text-yellow-200/80 text-sm space-y-1">
            <li>• Pinjaman dalam Rupiah, bayar melalui transfer bank</li>
            <li>• Admin akan mengevaluasi aplikasi Anda</li>
            <li>• Dana akan ditransfer ke rekening setelah approved</li>
            <li>• Bunga 5% per tahun, dihitung pro-rata</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={submitStatus === 'loading' || !loanAmountIDR || !username}
          className={`w-full font-semibold py-3 px-6 rounded-lg transition-all ${
            submitStatus === 'loading' || !loanAmountIDR || !username
              ? 'bg-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700'
          } text-white`}
        >
          {submitStatus === 'loading' ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Mengajukan Pinjaman...</span>
            </div>
          ) : (
            'Ajukan Pinjaman'
          )}
        </button>
      </form>
    </div>
  );
}

// Komponen Portfolio
function PortfolioIDR({ loans, loading, onRefresh }: { loans: any[], loading: boolean, onRefresh: () => void }) {
  const handlePayment = async (loanId: string, username: string) => {
    const amount = prompt('Masukkan jumlah pembayaran (IDR):');
    if (!amount) return;

    const paymentAmount = parseIDR(amount);
    if (paymentAmount <= 0) {
      alert('Jumlah pembayaran tidak valid');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/loan/pay/${username}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: paymentAmount }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(result.message);
        onRefresh();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      alert('Gagal memproses pembayaran');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-white/70">Loading...</p>
      </div>
    );
  }

  if (loans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-white/70 mb-4">Belum ada pinjaman</p>
        <p className="text-white/50 text-sm">Ajukan pinjaman pertama Anda di atas</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {loans.map((loan) => (
        <div key={loan._id} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-lg font-semibold text-white">Pinjaman #{loan.loanId}</h4>
              <p className="text-white/70">{loan.username}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm ${
              loan.status === 'repaid' ? 'bg-green-500/20 text-green-400' :
              loan.status === 'transferred' ? 'bg-blue-500/20 text-blue-400' :
              loan.status === 'approved' ? 'bg-purple-500/20 text-purple-400' :
              loan.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {loan.status === 'repaid' ? '✅ Lunas' :
               loan.status === 'transferred' ? '🔄 Aktif' :
               loan.status === 'approved' ? '👍 Disetujui' :
               loan.status === 'pending' ? '⏳ Menunggu' :
               '❌ Ditolak'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <span className="text-white/70">Jumlah Pinjaman:</span>
              <div className="text-white font-medium">{formatIDR(loan.amount)}</div>
            </div>
            <div>
              <span className="text-white/70">Sisa Cicilan:</span>
              <div className="text-white font-medium">{formatIDR(loan.remainingAmount)}</div>
            </div>
            <div>
              <span className="text-white/70">Jangka Waktu:</span>
              <div className="text-white font-medium">{loan.durationDays} hari</div>
            </div>
            <div>
              <span className="text-white/70">Progress:</span>
              <div className="text-white font-medium">
                {((loan.amount - loan.remainingAmount) / loan.amount * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {loan.reason && (
            <div className="mb-4">
              <span className="text-white/70 text-sm">Alasan: </span>
              <span className="text-white text-sm">{loan.reason}</span>
            </div>
          )}

          {loan.status === 'transferred' && loan.remainingAmount > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => handlePayment(loan.loanId, loan.username)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                💳 Bayar Cicilan
              </button>
              <button
                onClick={() => {
                  const remainingAmount = loan.remainingAmount;
                  if (confirm(`Lunasi pinjaman sebesar ${formatIDR(remainingAmount)}?`)) {
                    handlePayment(loan.loanId, loan.username);
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                💰 Lunasi
              </button>
            </div>
          )}

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-white/70 mb-1">
              <span>Dibayar: {formatIDR(loan.amount - loan.remainingAmount)}</span>
              <span>Sisa: {formatIDR(loan.remainingAmount)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(loan.amount - loan.remainingAmount) / loan.amount * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}