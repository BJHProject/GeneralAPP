export function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M10 1L1 8L10 19L19 8L10 1Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M1 8L10 1L19 8L10 13L1 8Z" fill="white" fillOpacity="0.3" />
    </svg>
  )
}
