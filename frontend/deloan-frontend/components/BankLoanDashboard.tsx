'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

// NOTE: Pastikan ABI ini lengkap sesuai dengan kontrak Anda, terutama event dan fungsi yang relevan.
const BANK_LOAN_CONTRACT_ABI = [
 {
   "inputs": [
     { "name": "_amount", "type": "uint256" },
     { "name": "_durationDays", "type": "uint256" },
     { "name": "_interestRate", "type": "uint256" }
   ],
   "name": "applyLoan",
   "outputs": [{ "name": "", "type": "uint256" }],
   "stateMutability": "payable",
   "type": "function"
 },
  // Tambahkan event dan fungsi lain jika perlu, contoh:
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "loanId", "type": "uint256" },
      { "indexed": true, "name": "borrower", "type": "address" }
    ],
    "name": "LoanApplied",
    "type": "event"
  }
] as const;

// Pastikan alamat kontrak ini sesuai dengan hasil deployment Anda
const BANK_LOAN_CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`;

// --- Interface & Type Definitions ---
interface LoanData {
  loanId: string;
  username: string;
  borrowerWallet: string;
  amount: number;
  collateral: number;
  interestRate: number;
  duration: number;
  bankAccount: string;
  reason: string;
  status: string;
  bankApproved: boolean;
  createdAt: string;
  collateralRatio: string;
}

interface UserUpdateData {
  username: string;
  bankAccount: string;
  reason: string;
}

// --- Main Component ---
export default function BankLoanDashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'borrow' | 'admin'>('borrow');
  
  // State for data
  const [userLoans, setUserLoans] = useState<LoanData[]>([]);
  const [pendingLoans, setPendingLoans] = useState<LoanData[]>([]);
  const [loading, setLoading] = useState(false);

  // State for on-chain loan application form
  const [loanForm, setLoanForm] = useState({
    amount: '',
    collateral: '',
    duration: '30',
    interestRate: '8',
  });

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // --- Data Fetching Functions ---
  const fetchUserLoans = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/bank-loan/wallet/${address}`);
      const data = await response.json();
      if (data.success) {
        setUserLoans(data.data);
      }
    } catch (error) {
      console.error('Error fetching user loans:', error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  const fetchPendingLoans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/bank-loan/pending');
      const data = await response.json();
      if (data.success) {
        setPendingLoans(data.data);
      }
    } catch (error) {
      console.error('Error fetching pending loans:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // --- useEffect Hooks for Logic ---
  useEffect(() => {
    if (activeTab === 'admin') {
      fetchPendingLoans();
    } else if (isConnected && address) {
      fetchUserLoans();
    }
  }, [activeTab, isConnected, address, fetchUserLoans, fetchPendingLoans]);

  useEffect(() => {
    if (isConfirmed) {
      alert('Transaksi on-chain berhasil! Pinjaman Anda akan muncul di daftar setelah disinkronkan oleh server (sekitar 5-10 detik).');
      reset();
      setLoanForm({ amount: '', collateral: '', duration: '30', interestRate: '8' });
      setTimeout(() => {
        fetchUserLoans();
      }, 5000); // Give backend listener time to process the event
    }
  }, [isConfirmed, reset, fetchUserLoans]);

  // --- Event Handlers ---
  const handleLoanRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return alert('Please connect your wallet');

    const collateralRatioNum = loanForm.amount && loanForm.collateral
      ? (parseFloat(loanForm.collateral) / parseFloat(loanForm.amount) * 100)
      : 0;
    if (collateralRatioNum < 150) {
      return alert('Rasio Jaminan minimal 150%');
    }

    writeContract({
      address: BANK_LOAN_CONTRACT_ADDRESS,
      abi: BANK_LOAN_CONTRACT_ABI,
      functionName: 'applyLoan',
      args: [
        parseEther(loanForm.amount),
        BigInt(parseInt(loanForm.duration)),
        BigInt(parseInt(loanForm.interestRate))
      ],
      value: parseEther(loanForm.collateral)
    });
  };

  const handleUpdateUserData = async (loanId: string, userData: UserUpdateData) => {
    try {
      const response = await fetch(`http://localhost:5000/bank-loan/user-data/${loanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      if (response.ok) {
        alert('Data pengguna berhasil diperbarui!');
        fetchUserLoans();
        return true;
      } else {
        const err = await response.json();
        alert(`Gagal memperbarui data: ${err.error || 'Terjadi kesalahan'}`);
        return false;
      }
    } catch (error) {
      console.error('Error updating user data:', error);
      alert('Terjadi kesalahan saat memperbarui data.');
      return false;
    }
  };
  
  const handleApprove = async (loanId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/bank-loan/approve/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes: 'Disetujui oleh admin panel', processedBy: 'admin' })
      });
      if (response.ok) {
        alert('Pinjaman disetujui! Oracle akan menyinkronkan ke blockchain.');
        fetchPendingLoans();
      } else {
        alert('Gagal menyetujui pinjaman.');
      }
    } catch (error) {
      console.error('Error approving loan:', error);
    }
  };

  const handleReject = async (loanId: string) => {
    const reason = prompt('Masukkan alasan penolakan:');
    if (!reason) return;
    try {
      const response = await fetch(`http://localhost:5000/bank-loan/reject/${loanId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason, processedBy: 'admin' })
      });
      if (response.ok) {
        alert('Pinjaman ditolak! Oracle akan menyinkronkan ke blockchain.');
        fetchPendingLoans();
      } else {
        alert('Gagal menolak pinjaman.');
      }
    } catch (error) {
      console.error('Error rejecting loan:', error);
    }
  };

  const collateralRatio = loanForm.amount && loanForm.collateral
    ? (parseFloat(loanForm.collateral) / parseFloat(loanForm.amount) * 100).toFixed(1)
    : '0';
  
  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">🏦 DeLoan Bank System</h2>
        <p className="text-white/80 mb-8">Connect your wallet to access bank-approved lending.</p>
      </div>
    );
  }

  // --- JSX Rendering ---
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header & Tabs */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 mb-8 border border-white/20">
        <h2 className="text-2xl font-bold text-white mb-2">🏦 Bank Loan System</h2>
        <p className="text-white/90">Sistem pinjaman dengan approval bank off-chain.</p>
      </div>
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 mb-8">
        <div className="flex border-b border-white/20">
          <button onClick={() => setActiveTab('borrow')} className={`px-6 py-4 font-medium transition-colors ${activeTab === 'borrow' ? 'text-white border-b-2 border-blue-400' : 'text-white/70 hover:text-white'}`}>
            💰 Ajukan & Kelola Pinjaman
          </button>
          <button onClick={() => setActiveTab('admin')} className={`px-6 py-4 font-medium transition-colors ${activeTab === 'admin' ? 'text-white border-b-2 border-blue-400' : 'text-white/70 hover:text-white'}`}>
            🏦 Bank Admin
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'borrow' && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column: Application Form */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-white">Langkah 1: Ajukan Pinjaman On-Chain</h3>
                <p className="text-sm text-white/70">Kirim transaksi ke blockchain untuk mencatat pengajuan pinjaman Anda. Data tambahan akan diisi pada langkah berikutnya.</p>
                <form onSubmit={handleLoanRequest} className="space-y-4">
                  {/* ... Inputs for loanForm ... */}
                   <div>
                     <label className="block text-sm font-medium text-white/80 mb-2">Jumlah Pinjaman (ETH)</label>
                     <input type="number" step="0.01" value={loanForm.amount} onChange={(e) => setLoanForm({...loanForm, amount: e.target.value})} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white" placeholder="1.0" required />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-white/80 mb-2">Jaminan (ETH)</label>
                     <input type="number" step="0.01" value={loanForm.collateral} onChange={(e) => setLoanForm({...loanForm, collateral: e.target.value})} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white" placeholder="1.5" required />
                     {collateralRatio !== '0' && ( <p className={`text-xs mt-1 ${ parseFloat(collateralRatio) >= 150 ? 'text-green-400' : 'text-red-400' }`}> Rasio Jaminan: {collateralRatio}% {parseFloat(collateralRatio) < 150 && '(Minimum 150%)'} </p> )}
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-white/80 mb-2">Durasi (Hari)</label>
                     <select value={loanForm.duration} onChange={(e) => setLoanForm({...loanForm, duration: e.target.value})} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white">
                       <option value="7">7 Hari</option> <option value="30">30 Hari</option> <option value="60">60 Hari</option> <option value="90">90 Hari</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-white/80 mb-2">Suku Bunga (% per tahun)</label>
                     <input type="number" value={loanForm.interestRate} onChange={(e) => setLoanForm({...loanForm, interestRate: e.target.value})} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white" min="3" max="20" />
                   </div>
                  <button type="submit" disabled={isPending || isConfirming || parseFloat(collateralRatio) < 150} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-all">
                    {isPending ? 'Mempersiapkan Transaksi...' : isConfirming ? 'Menunggu Konfirmasi Blockchain...' : `Ajukan Pinjaman On-Chain`}
                  </button>
                </form>
              </div>

              {/* Right Column: User's Loans & Complete Data */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white">Langkah 2: Pinjaman Saya</h3>
                  <button onClick={() => fetchUserLoans()} disabled={loading} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
                    {loading ? 'Memuat...' : 'Refresh'}
                  </button>
                </div>
                <p className="text-sm text-white/70">Setelah pengajuan on-chain berhasil, lengkapi data pinjaman Anda di bawah ini agar dapat diproses oleh bank.</p>
                
                {loading && <p className="text-white/70 text-center py-4">Memuat data pinjaman Anda...</p>}
                {!loading && userLoans.length > 0 ? (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {userLoans.map((loan) => (
                      <UserLoanCard key={loan.loanId} loan={loan} onUpdate={handleUpdateUserData} />
                    ))}
                  </div>
                ) : (
                  !loading && <p className="text-white/70 text-center py-4">Anda belum memiliki pinjaman atau data sedang disinkronkan.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center">
                 <h3 className="text-xl font-semibold text-white">Pengajuan Pinjaman Masuk</h3>
                 <button onClick={fetchPendingLoans} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600" disabled={loading}>
                   {loading ? 'Loading...' : 'Refresh'}
                 </button>
               </div>
               {pendingLoans.length > 0 ? (
                 <div className="space-y-4">
                   {pendingLoans.map((loan) => (
                     <AdminLoanCard key={loan.loanId} loan={loan} onApprove={() => handleApprove(loan.loanId)} onReject={() => handleReject(loan.loanId)} />
                   ))}
                 </div>
               ) : (
                 <p className="text-white/70">Tidak ada pengajuan yang menunggu approval.</p>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// --- Sub-Component: UserLoanCard ---
function UserLoanCard({ loan, onUpdate }: { loan: LoanData; onUpdate: (loanId: string, data: UserUpdateData) => Promise<boolean> }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: loan.username && !loan.username.startsWith('user_') ? loan.username : '',
    bankAccount: loan.bankAccount || '',
    reason: loan.reason || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const needsData = loan.status === 'pending' && (!loan.username || loan.username.startsWith('user_') || !loan.bankAccount || !loan.reason);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!editForm.username || !editForm.bankAccount || !editForm.reason) {
        return alert("Semua field wajib diisi.");
    }
    setIsSaving(true);
    const success = await onUpdate(loan.loanId, editForm);
    setIsSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'approved': return 'bg-blue-500/20 text-blue-400';
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'repaid': return 'bg-green-600/20 text-green-300';
      case 'rejected': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return  '⏳ Menunggu Bank' ;
      case 'approved': return  '✅ Disetujui Bank' ;
      case 'active': return '🔄 Aktif';
      case 'repaid': return  '✅ Lunas' ;
      case 'rejected': return  '❌ Ditolak' ;
      default: return status;
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/20 transition-all hover:border-blue-400">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="text-lg font-semibold text-white">Loan ID #{loan.loanId}</h4>
          <p className="text-sm text-white/70">{loan.amount} ETH</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
          {getStatusText(loan.status)}
        </span>
      </div>
      
      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-3 mt-4 animate-fade-in">
          <div>
             <label className="text-xs text-white/80">Username</label>
             <input type="text" value={editForm.username} onChange={(e) => setEditForm({...editForm, username: e.target.value})} className="w-full text-sm px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white" required />
          </div>
          <div>
             <label className="text-xs text-white/80">No. Rekening Bank</label>
             <input type="text" value={editForm.bankAccount} onChange={(e) => setEditForm({...editForm, bankAccount: e.target.value})} className="w-full text-sm px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white" required />
          </div>
          <div>
             <label className="text-xs text-white/80">Alasan Pinjaman</label>
             <textarea value={editForm.reason} onChange={(e) => setEditForm({...editForm, reason: e.target.value})} className="w-full text-sm px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white" rows={2} required />
          </div>
          <div className="flex space-x-2">
            <button type="submit" disabled={isSaving} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold disabled:opacity-50">
              {isSaving ? 'Menyimpan...' : 'Simpan Data'}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm">Batal</button>
          </div>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-white/60">Jaminan:</span> <span className="text-white ml-2">{loan.collateral} ETH</span></div>
            <div><span className="text-white/60">Rasio:</span> <span className="text-white ml-2">{loan.collateralRatio}%</span></div>
          </div>
          {needsData ? (
            <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-500/30 rounded-lg text-center">
              <p className="text-yellow-300 text-sm mb-2">Pinjaman ini membutuhkan data tambahan untuk diproses oleh bank.</p>
              <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 font-semibold text-sm">
                Lengkapi Data Sekarang
              </button>
            </div>
          ) : (
            loan.status === 'pending' && (
             <div className="mt-4 p-3 bg-green-900/50 border border-green-500/30 rounded-lg text-center">
                 <p className="text-green-300 text-sm">Data lengkap. Menunggu persetujuan dari pihak bank.</p>
             </div>
            )
          )}
        </>
      )}
    </div>
  );
}

// --- Sub-Component: AdminLoanCard ---
function AdminLoanCard({ loan, onApprove, onReject }: { loan: LoanData; onApprove: () => void; onReject: () => void; }) {
  return (
    <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-semibold text-white"> Loan #{loan.loanId} - {loan.username} </h4>
          <p className="text-white/70 text-sm break-all">{loan.borrowerWallet}</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <button onClick={onApprove} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"> ✅ Setujui </button>
          <button onClick={onReject} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"> ❌ Tolak </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
        <div> <span className="text-white/70">Pinjaman:</span> <span className="text-white ml-2">{loan.amount} ETH</span> </div>
        <div> <span className="text-white/70">Jaminan:</span> <span className="text-white ml-2">{loan.collateral} ETH</span> </div>
        <div> <span className="text-white/70">Rasio:</span> <span className={`ml-2 font-medium ${ parseFloat(loan.collateralRatio) >= 150 ? 'text-green-400' : 'text-red-400' }`}> {loan.collateralRatio}% </span> </div>
      </div>
      {loan.reason && (
        <div className="p-3 bg-white/5 rounded">
          <p className="text-white/80 text-sm"> <strong>Alasan:</strong> {loan.reason} </p>
          <p className="text-white/80 text-sm mt-1"> <strong>Rekening:</strong> {loan.bankAccount} </p>
        </div>
      )}
    </div>
  );
}
