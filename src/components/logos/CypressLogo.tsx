// Cypress's mark: a hexagon outline containing a cypress-tree flame shape,
// in the brand's green.
export default function CypressLogo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path d="M12 2 21 7.5v9L12 22 3 16.5v-9Z" stroke="#69D3A7" strokeWidth="1.6" />
      <path d="M12 6c2 2.5 3.4 4.6 3.4 6.6a3.4 3.4 0 1 1-6.8 0C8.6 10.6 10 8.5 12 6Z" fill="#69D3A7" />
    </svg>
  );
}
