import Header from '../../components/Header';
import Dashboard from '../../components/Dashboard';
import BankDashboard from 'components/BankDashboard';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Dashboard />
      <BankDashboard />
    </main>
  );
}