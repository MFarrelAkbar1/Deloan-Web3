import Header from '../../components/Header';
import OracleDashboard from '../../components/OracleDashboard';
import BankDashboard from 'components/BankDashboard';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <OracleDashboard />
      <BankDashboard />
    </main>
  );
}