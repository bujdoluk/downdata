import Logo from "@/components/navbar/Logo";
import ThemeToggle from "@/components/navbar/ThemeToggle";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-10 border-b border-black/10 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-[#0b0d12]/80">
      <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-6 py-4">
        <Logo className="h-6 w-6" />
        <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
          downDATA
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
