// Chatfuel — chatbot builder; an original chat-bubble-with-spark mark in the
// prior monogram's purple (no official hex was findable).
export default function ChatfuelLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="#6C5CE7" aria-hidden="true">
      <path d="M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-4 4v-4H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path d="M12 8.2l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z" fill="#fff" />
    </svg>
  );
}
