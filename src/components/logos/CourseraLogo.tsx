// Coursera's mark: a stylized open "C" ring, in Coursera blue.
export default function CourseraLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect width="24" height="24" rx="5" fill="#0056D2" />
      <path d="M12 5a7 7 0 1 0 6.1 10.4l-1.9-1.1a5 5 0 1 1 0-4.6l1.9-1.1A7 7 0 0 0 12 5z" fill="#fff" />
    </svg>
  );
}
