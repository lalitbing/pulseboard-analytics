export default function KPI({
  label,
  value,
  loading,
  hint,
  secondary,
}: {
  label: string;
  value: any;
  loading?: boolean;
  hint?: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-600">{label}</p>
          {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
        </div>
      </div>
      {loading ? (
        <div className="mt-3 h-7 w-16 bg-gray-200 rounded animate-pulse" />
      ) : (
        <div className="mt-2">
          <div className="text-2xl font-semibold tracking-tight text-gray-900 tabular-nums">{value}</div>
          {secondary ? <div className="mt-1 text-xs text-gray-600">{secondary}</div> : null}
        </div>
      )}
    </div>
  );
}
