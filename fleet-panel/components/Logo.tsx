export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Sade altıgen işaret */}
      <path
        d="M16 3 L28 9.5 L28 22.5 L16 29 L4 22.5 L4 9.5 Z"
        stroke="#E5E7EB"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2" fill="#E5E7EB" />
    </svg>
  );
}
