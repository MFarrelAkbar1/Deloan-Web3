'use client';
import { useState } from "react";
import { useRouter } from "next/router";

export default function Pay() {
  const router = useRouter();
  const { username } = router.query;

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
      const res = await fetch(`/api/loan/pay/${username}`, {
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
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h1>Bayar Cicilan untuk: {username}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Jumlah Cicilan:
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
            required
            style={{ marginLeft: 10 }}
          />
        </label>
        <br />
        <button type="submit" style={{ marginTop: 10 }}>
          Bayar
        </button>
      </form>
      {message && <p style={{ color: "green", marginTop: 10 }}>{message}</p>}
      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
    </div>
  );
}
