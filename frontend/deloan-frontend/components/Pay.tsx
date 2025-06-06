'use client';

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function Pay() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Get username from URL params or search params, or use input
  const urlUsername = params?.username || searchParams?.get('username');
  
  const [username, setUsername] = useState(urlUsername || "");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!username || typeof username !== "string") {
      setError("Invalid username");
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Amount harus lebih dari 0");
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/loan/pay/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numAmount }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Pembayaran gagal");
        return;
      }

      setMessage(data.message);
      setAmount("");
    } catch {
      setError("Terjadi kesalahan saat mengirim pembayaran");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
      <h1 className="text-2xl font-bold text-white mb-6">
        Bayar Cicilan Pinjaman
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Username Peminjam:
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
            placeholder="Masukkan username peminjam"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Jumlah Cicilan:
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
            placeholder="Masukkan jumlah cicilan"
          />
        </div>
        
        <button 
          type="submit" 
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          Bayar Cicilan
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
          <p className="text-green-400">{message}</p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}