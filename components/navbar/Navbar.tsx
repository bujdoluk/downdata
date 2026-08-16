import Link from "next/link";
import Logo from "@/components/navbar/Logo";
import ThemeToggle from "@/components/navbar/ThemeToggle";
import ServiceSearch from "@/components/service/ServiceSearch";
import { getAllServices } from "@/lib/services";

export default function Navbar() {
  const services = getAllServices();

  return (
    // Background is intentionally unconditional — the navbar stays black
    // regardless of the site-wide light/dark theme.
    <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0b0d12]/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
        {/* Forces every dark: utility below to always apply, since this
            content always sits on the permanently-black bar. ThemeToggle
            stays outside this scope so its icon still reflects the real
            site-wide theme. */}
        <div data-theme="dark" className="flex flex-1 items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="h-6 w-6" />
            <span className="text-lg font-semibold tracking-tight text-white">
              <span className="text-red-500">down</span>DATA
            </span>
          </Link>
          <ServiceSearch services={services} />
          <nav className="ml-auto flex shrink-0 items-center gap-4">
            <Link
              href="/"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Services
            </Link>
            <Link
              href="/add-service"
              className="text-sm font-medium text-white/70 transition-colors hover:text-white"
            >
              Add service
            </Link>
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
