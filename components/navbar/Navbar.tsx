import Link from "next/link";
import Logo from "@/components/navbar/Logo";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import ServiceSearch from "@/components/service/ServiceSearch";
import { getAllServices } from "@/lib/services";

export default function Navbar() {
  const services = getAllServices();

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0b10]/80 backdrop-blur">
      <div className="navbar mx-auto max-w-5xl">
        <div data-theme="dark" className="navbar-start gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-6 w-6" />
            <span className="text-lg font-semibold tracking-tight text-base-content">
              <span className="text-primary">down</span>DATA
            </span>
          </Link>
          <ServiceSearch services={services} />
        </div>
        <div className="navbar-end gap-1">
          <div data-theme="dark" className="flex items-center gap-1">
            <Link href="/" className="btn btn-ghost btn-sm text-base-content/70">
              Services
            </Link>
            <Link href="/add-service" className="btn btn-ghost btn-sm text-base-content/70">
              Add service
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
