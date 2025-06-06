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
    try {
     const res = await fetch(`http://localhost:5000/loan/${id}/approve`, {
    method: "PATCH",
    });
      if (!res.ok) {
        const errorData = await res.json();
        alert("Error: " + (errorData.error || "Approve failed"));
        return;
      }
      alert("Loan approved!");
      fetchLoans(); // refresh list
    } catch (err) {
      alert("Error approving loan");
    }
  }
  
 async function rejectLoan(id: string) {
    try {
      const res = await fetch(`http://localhost:5000/loan/${id}/reject`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const errorData = await res.json();
        alert("Error: " + (errorData.error || "Reject failed"));
        return;
      }
      alert("Loan rejected!");
      fetchLoans(); // refresh list
    } catch (err) {
      alert("Error rejecting loan");
    }
 }

  useEffect(() => {
    fetchLoans();
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "auto", padding: 20 }}>
      <h1>Loan Dashboard (Approve Loans)</h1>
      {loading && <p>Loading loans...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <table border={1} cellPadding={8} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Loan ID</th>
            <th>Username</th>
            <th>Amount</th>
            <th>Remaining</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan._id}>
              <td>{loan.loanId}</td>
              <td>{loan.username}</td>
              <td>{loan.amount}</td>
              <td>{loan.remainingAmount}</td>
              <td>{loan.status}</td>
              <td>
              {loan.status === "pending" ? (
              <>
              <button onClick={() => approveLoan(loan._id)}>Approve</button>{" "}
              <button onClick={() => rejectLoan(loan._id)}>Reject</button>
              </>
              ) : (
              "-"
              )}
            </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
