import { useMemo } from 'react';

export default function TopEvents({
  data,
  loading,
}: {
  data: { event_name: string; count: number }[];
  loading?: boolean;
}) {
  const maxCount = useMemo(() => Math.max(...data.map((e) => Number(e.count) || 0), 1), [data]);
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="space-y-2 animate-pulse">
            <div className="flex items-center justify-between gap-3">
              <div className="h-3.5 w-28 rounded bg-subtle" />
              <div className="h-3.5 w-8 rounded bg-subtle" />
            </div>
            <div className="h-1 w-2/3 rounded-full bg-subtle" />
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-lg border border-dashed border-line px-4 py-6 text-center">
        <p className="text-sm font-medium text-ink">No events to show</p>
        <p className="mt-1 text-xs text-ink-3">Track an event or widen the date range.</p>
      </div>
    );
  }

  const visible = data.slice(0, 5);

  return (
    <ol className="space-y-4">
      {visible.map((e, i) => (
        <li key={e.event_name}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-mono text-[13px] text-ink">{e.event_name}</span>
            <span className="shrink-0 font-mono text-[13px] text-ink-2 tabular-nums">{e.count}</span>
          </div>
          <div
            className={'mt-1.5 h-1 rounded-full ' + (i === 0 ? 'bg-accent' : 'bg-accent/40')}
            style={{ width: `${Math.max(2, Math.round(((Number(e.count) || 0) / maxCount) * 100))}%` }}
          />
        </li>
      ))}
    </ol>
  );
}
