const SPINNER_SIZE_CLASSES: Record<"xs" | "sm" | "md" | "lg" | "xl", string> = {
  xs: "loading-xs",
  sm: "loading-sm",
  md: "loading-md",
  lg: "loading-lg",
  xl: "loading-xl",
};

export default function Spinner({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof SPINNER_SIZE_CLASSES;
  className?: string;
}) {
  return <span className={`loading loading-spinner ${SPINNER_SIZE_CLASSES[size]} ${className}`} aria-hidden="true" />;
}
