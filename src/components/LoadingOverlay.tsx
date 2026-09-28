import Spinner from "@/components/Spinner";

// `label` is visible text, not aria-label only, so a missing translation can't hide (see AGENTS.md Failure log).
export default function LoadingOverlay({ label, contained = false }: { label: string; contained?: boolean }) {
  return (
    <div
      role="status"
      className={`bg-base-100/80 ${contained ? "absolute" : "fixed"} inset-0 z-50 flex flex-col items-center justify-center gap-3 backdrop-blur-sm`}
    >
      <Spinner size="2xl" />
      <p className="text-base-content/70 text-sm">{label}</p>
    </div>
  );
}
