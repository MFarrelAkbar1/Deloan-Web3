'use client';
import { useEffect, useState } from "react";

interface Loan {
  _id: string;
  loanId: string;
  username: string;
  borrowerWallet: string;
  amount: number;
  remainingAmount: number;
  reason?: string;
  durationDays: number;
  bankAccount?: string;
  status: string;
}

export default function BankDashboard() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{[key: string]: 'loading' | 'success' | 'error' | null}>({});

  async function fetchLoans() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:5000/loan");
      if (!res.ok) throw new Error("Failed to fetch loans");
      const data: Loan[] = await res.json();
      setLoans(data);
    } catch (err: any) {
      setError(err.message || "Error fetching loans");
    }
    setLoading(false);
  }

  async function approveLoan(id: string) {
    setActionStatus(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await fetch(`http://localhost:5000/loan/${id}/approve`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const errorData = await res.json();
        setActionStatus(prev => ({ ...prev, [id]: 'error' }));
        setTimeout(() => setActionStatus(prev => ({ ...prev, [id]: null })), 3000);
        return;
      }
      setActionStatus(prev => ({ ...prev, [id]: 'success' }));
      setTimeout(() => {
        setActionStatus(prev => ({ ...prev, [id]: null }));
        fetchLoans(); // refresh list
      }, 1000);
    } catch (err) {
      setActionStatus(prev => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, [id]: null })), 3000);
    }
  }
  
  async function rejectLoan(id: string) {
    setActionStatus(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await fetch(`http://localhost:5000/loan/${id}/reject`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const errorData = await res.json();
        setActionStatus(prev => ({ ...prev, [id]: 'error' }));
        setTimeout(() => setActionStatus(prev => ({ ...prev, [id]: null })), 3000);
        return;
      }
      setActionStatus(prev => ({ ...prev, [id]: 'success' }));
      setTimeout(() => {
        setActionStatus(prev => ({ ...prev, [id]: null }));
        fetchLoans(); // refresh list
      }, 1000);
    } catch (err) {
      setActionStatus(prev => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setActionStatus(prev => ({ ...prev, [id]: null })), 3000);
    }
  }

  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6 border border-white/20">
          <h1 className="text-3xl font-bold text-white mb-2">🏦 Bank Admin Dashboard</h1>
          <p className="text-white/70">Kelola persetujuan pinjaman DeLoan</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <h3 className="text-sm font-medium text-white/80">Total Pinjaman</h3>
            <p className="text-2xl font-bold text-white">{loans.length}</p>
          </div>
          <div className="bg-yellow-500/20 backdrop-blur-md rounded-xl p-4 border border-yellow-500/30">
            <h3 className="text-sm font-medium text-yellow-200">Pending</h3>
            <p className="text-2xl font-bold text-yellow-400">
              {loans.filter(l => l.status === 'pending').length}
            </p>
          </div>
          <div className="bg-green-500/20 backdrop-blur-md rounded-xl p-4 border border-green-500/30">
            <h3 className="text-sm font-medium text-green-200">Approved</h3>
            <p className="text-2xl font-bold text-green-400">
              {loans.filter(l => l.status === 'approved' || l.status === 'transferred').length}
            </p>
          </div>
          <div className="bg-red-500/20 backdrop-blur-md rounded-xl p-4 border border-red-500/30">
            <h3 className="text-sm font-medium text-red-200">Rejected</h3>
            <p className="text-2xl font-bold text-red-400">
              {loans.filter(l => l.status === 'rejected').length}
            </p>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Daftar Aplikasi Pinjaman</h2>
            <button 
              onClick={fetchLoans}
              className="mt-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
            >
              🔄 Refresh Data
            </button>
          </div>

          {loading && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center space-x-2 text-white/70">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading loans...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 m-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-400">❌ {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20 bg-white/5">
                    <th className="text-left p-4 text-white/80 font-medium">Loan ID</th>
                    <th className="text-left p-4 text-white/80 font-medium">Username</th>
                    <th className="text-left p-4 text-white/80 font-medium">Amount</th>
                    <th className="text-left p-4 text-white/80 font-medium">Duration</th>
                    <th className="text-left p-4 text-white/80 font-medium">Reason</th>
                    <th className="text-left p-4 text-white/80 font-medium">Status</th>
                    <th className="text-center p-4 text-white/80 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan, index) => (
                    <tr 
                      key={loan._id} 
                      className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                        index % 2 === 0 ? 'bg-white/2' : ''
                      }`}
                    >
                      <td className="p-4">
                        <span className="text-white font-mono text-sm">#{loan.loanId}</span>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="text-white font-medium">{loan.username}</div>
                          <div className="text-white/50 text-xs">
                            {loan.borrowerWallet?.slice(0, 6)}...{loan.borrowerWallet?.slice(-4)}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-white font-medium">
                          {formatIDR(loan.amount)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-white/80">{loan.durationDays} hari</span>
                      </td>
                      <td className="p-4">
                        <div className="text-white/80 text-sm max-w-xs truncate">
                          {loan.reason || '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          loan.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                          loan.status === 'approved' || loan.status === 'transferred' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          loan.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          loan.status === 'repaid' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                          {loan.status === 'pending' ? '⏳ Pending' :
                           loan.status === 'approved' ? '✅ Approved' :
                           loan.status === 'transferred' ? '🔄 Active' :
                           loan.status === 'rejected' ? '❌ Rejected' :
                           loan.status === 'repaid' ? '💰 Paid' :
                           loan.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {loan.status === "pending" ? (
                          <div className="flex space-x-2 justify-center">
                            <button
                              onClick={() => approveLoan(loan._id)}
                              disabled={actionStatus[loan._id] === 'loading'}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                actionStatus[loan._id] === 'loading' 
                                  ? 'bg-gray-500 cursor-not-allowed' 
                                  : actionStatus[loan._id] === 'success'
                                  ? 'bg-green-500 text-white'
                                  : actionStatus[loan._id] === 'error'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-green-500 hover:bg-green-600 text-white'
                              }`}
                            >
                              {actionStatus[loan._id] === 'loading' ? (
                                <div className="flex items-center space-x-1">
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>...</span>
                                </div>
                              ) : actionStatus[loan._id] === 'success' ? (
                                '✅'
                              ) : actionStatus[loan._id] === 'error' ? (
                                '❌'
                              ) : (
                                '✅ Approve'
                              )}
                            </button>
                            <button
                              onClick={() => rejectLoan(loan._id)}
                              disabled={actionStatus[loan._id] === 'loading'}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                actionStatus[loan._id] === 'loading' 
                                  ? 'bg-gray-500 cursor-not-allowed' 
                                  : actionStatus[loan._id] === 'success'
                                  ? 'bg-green-500 text-white'
                                  : actionStatus[loan._id] === 'error'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-red-500 hover:bg-red-600 text-white'
                              }`}
                            >
                              {actionStatus[loan._id] === 'loading' ? (
                                <div className="flex items-center space-x-1">
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>...</span>
                                </div>
                              ) : actionStatus[loan._id] === 'success' ? (
                                '✅'
                              ) : actionStatus[loan._id] === 'error' ? (
                                '❌'
                              ) : (
                                '❌ Reject'
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-white/50">-</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {loans.length === 0 && !loading && (
                <div className="p-8 text-center">
                  <p className="text-white/70">Belum ada aplikasi pinjaman</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}