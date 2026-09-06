// ElevenLabs' mark is monochrome black, same as GitHub's — currentColor so it isn't invisible in dark mode
export default function ElevenlabsLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M4.6035 0v24h4.9317V0zm9.8613 0v24h4.9317V0z" />
    </svg>
  );
}
