declare global {
  interface Window {
    Tawk_API?: {
      maximize?: () => void;
    };
  }
}

// Opens the Tawk.to widget from any "Chat with us" button, e.g. onClick={() => openSupportChat()}.
// Returns false (rather than throwing) when the widget hasn't loaded yet — it only loads once
// the user has opted into the Support Chat cookie (see TawkChat.tsx) and the embed script has
// finished fetching, so a click just after page load can legitimately race it.
export function openSupportChat(): boolean {
  const maximize = window.Tawk_API?.maximize;
  if (typeof maximize !== "function") return false;
  maximize();
  return true;
}
