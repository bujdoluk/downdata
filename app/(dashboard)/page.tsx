import ServiceGrid from "@/components/service/ServiceGrid";
import { getAllServices } from "@/lib/services";

export default function Home() {
  const services = getAllServices();

  return (
    <main className="flex flex-1 items-start justify-center p-6">
      <div className="grid w-full max-w-6xl grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-4">
        <ServiceGrid services={services} />
      </div>
    </main>
  );
}
