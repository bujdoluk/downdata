export default function CodewarsLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <rect x="1" y="1" width="22" height="22" rx="4" fill="#F05656" />
      <path d="M7 9.5c1.6-1.8 3.3-2.7 5-2.7s3.4.9 5 2.7c-.9 3.6-2.7 6.3-5 8-2.3-1.7-4.1-4.4-5-8z" fill="#fff" />
      <circle cx="9.6" cy="10.8" r="1.1" fill="#F05656" />
      <circle cx="14.4" cy="10.8" r="1.1" fill="#F05656" />
    </svg>
  );
}
