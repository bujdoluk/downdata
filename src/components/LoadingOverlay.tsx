import Spinner from "@/components/Spinner";

// `label` used to be aria-label only — spoken by a screen reader but never
// actually shown to a sighted user, so both of this component's callers
// (NavigationLoadingBoundary, HistoryPageContent) were silently rendering
// an unlabeled spinner despite building and passing a real translated
// string in. Now rendered as visible text too; role="status" still covers
// the accessibility announcement on its own once the label is real content
// rather than a repeated aria-label of the same string.
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
