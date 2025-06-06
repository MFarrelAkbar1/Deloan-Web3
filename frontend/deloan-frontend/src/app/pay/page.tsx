import Pay from "../../../components/Pay";
import Header from "../../../components/Header";

export default function PayPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <div className="py-8">
        <Pay />
      </div>
    </main>
  );
}