import ServiceGrid from "@/components/service/ServiceGrid";
import { getAllServices } from "@/lib/services";

export default function Home() {
  const services = getAllServices();

  return (
    <main className="flex flex-1 items-start justify-center p-6">
      <div className="grid grid-cols-3 gap-4">
        <ServiceGrid services={services} />
      </div>
    </main>
  );
}
