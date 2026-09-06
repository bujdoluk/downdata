import Spinner from "@/components/Spinner";

export default function LoadingOverlay({ label, contained = false }: { label: string; contained?: boolean }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`bg-base-100/80 ${contained ? "absolute" : "fixed"} inset-0 z-50 flex items-center justify-center backdrop-blur-sm`}
    >
      <Spinner size="2xl" />
    </div>
  );
}
