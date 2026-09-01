// A small "can't find what you're looking for?" prompt — used on the
// integrations page, the add-service catalog browser, and the landing page.
// Deliberately dumb: no mailto-building logic, no i18n lookups — the caller
// owns copy and destination, this just renders the dashed-border shell.
export default function RequestCard({
  title,
  buttonLabel,
  href,
  className = "",
}: {
  title: string;
  buttonLabel: string;
  href: string;
  className?: string;
}) {
  return (
    <div
      className={`border-base-content/20 flex aspect-square w-44 flex-none flex-col items-center justify-center gap-3 rounded-box border border-dashed p-4 text-center ${className}`}
    >
      <p className="text-base-content/60 text-sm">{title}</p>
      <a href={href} className="btn btn-outline btn-info btn-sm">
        {buttonLabel}
      </a>
    </div>
  );
}
