export default function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs text-slate-500 mb-3">{label}</div>
      <div className="odometer text-2xl font-semibold inline-flex items-baseline gap-1">
        {value}
        {suffix && <span className="text-sm opacity-70">{suffix}</span>}
      </div>
    </div>
  );
}
