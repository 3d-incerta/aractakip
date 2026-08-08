export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* İzometrik küp — "3D" temasını temsil eder */}
      <path d="M16 3 L28 9.5 L28 22.5 L16 29 L4 22.5 L4 9.5 Z" stroke="#F5A623" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M16 3 L16 16 M16 16 L28 9.5 M16 16 L4 9.5 M16 16 L16 29" stroke="#F5A623" strokeWidth="1.4" strokeLinejoin="round" strokeOpacity="0.85" />
      <circle cx="16" cy="16" r="2.1" fill="#F5A623" />
    </svg>
  );
}
