import BankDashboard from '../../../components/BankDashboard';
import Header from "../../../components/Header";

export default function BankPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="py-8">
        <BankDashboard />
      </div>
    </main>
  );
}