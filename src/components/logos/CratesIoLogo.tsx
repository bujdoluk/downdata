// crates.io's mark: a simplified wooden crate/package, in the registry's
// signature orange (#ff7c00).
export default function CratesIoLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 2 21 6.5v11L12 22 3 17.5v-11Z" fill="#FF7C00" />
      <path d="M12 2 21 6.5 12 11 3 6.5Z" fill="#FFA347" />
      <path d="M12 11v11" stroke="#C25E00" strokeWidth="1.1" />
    </svg>
  );
}
