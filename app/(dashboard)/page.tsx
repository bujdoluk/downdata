import ServiceGrid from "@/components/service/ServiceGrid";
import AddServiceButton from "@/components/service/AddServiceButton";
import NoServicesMessage from "@/components/service/NoServicesMessage";
import { getAllServices } from "@/lib/services";

export default function Home() {
  const services = getAllServices();

  return (
    <main className="flex flex-1 items-start justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="mb-4 flex justify-end">
          <AddServiceButton />
        </div>
        {services.length === 0 ? (
          <NoServicesMessage />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(350px,1fr))] gap-4">
            <ServiceGrid services={services} />
          </div>
        )}
      </div>
    </main>
  );
}
