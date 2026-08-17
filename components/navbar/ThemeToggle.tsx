"use client";

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.5 14.7A8.5 8.5 0 0 1 9.3 3.5a.75.75 0 0 0-.9-1 10 10 0 1 0 13.1 13.1.75.75 0 0 0-1-.9Z" />
    </svg>
  );
}

export default function ThemeToggle() {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <label
      aria-label="Toggle theme"
      className="swap swap-rotate text-base-content/60 hover:bg-base-content/10 rounded-full p-2"
    >
      <input type="checkbox" value="light" className="theme-controller" onChange={handleChange} />
      <SunIcon className="swap-on" />
      <MoonIcon className="swap-off" />
    </label>
  );
}
