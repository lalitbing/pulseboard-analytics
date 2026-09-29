export default function KPI({
  label,
  value,
  loading,
  hint,
  secondary,
}: {
  label: string;
  value: string | number;
  loading?: boolean;
  hint?: string;
  secondary?: string;
}) {
  return (
    <div className="min-w-0 px-4 py-4 sm:px-5">
      <p className="text-xs font-medium text-ink-2" title={hint}>
        {label}
      </p>
      {loading ? (
        <div className="mt-2.5 h-7 w-16 rounded-md bg-subtle animate-pulse" />
      ) : (
        <div className="mt-1.5 flex items-baseline gap-2 min-w-0">
          <span className="font-mono text-2xl font-medium tracking-tight text-ink tabular-nums">{value}</span>
          {secondary ? <span className="truncate text-xs text-ink-3">{secondary}</span> : null}
        </div>
      )}
      {hint ? <p className="mt-1 truncate text-[11px] text-ink-3">{hint}</p> : null}
    </div>
  );
}
