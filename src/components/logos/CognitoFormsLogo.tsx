// Cognito Forms' real mark is a simplified cog; brand palette confirmed via
// their media kit (cognitoforms.com/newsroom/media-kit) — Jaywalk #D85427
// orange on Matins #234652 dark blue-gray.
export default function CognitoFormsLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#234652" />
      <path
        d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 1.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z"
        fill="#D85427"
      />
      <path
        d="M12 5.5v1.4M12 17.1v1.4M18.5 12h-1.4M6.9 12H5.5M16.5 7.5l-1 1M8.5 15.5l-1 1M16.5 16.5l-1-1M8.5 8.5l-1-1"
        stroke="#D85427"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
