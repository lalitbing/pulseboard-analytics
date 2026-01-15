import { useMemo } from 'react';

type SortKey = 'time' | 'count' | 'name';

type TopEventRow = {
  event_name: string;
  count: number;
  last_seen: string;
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function EventsExplorer({
  title = 'Events',
  data,
  loading,
  query,
  onQueryChange,
  sort,
  onSortChange,
  onSelectEvent,
  selectedEventName,
}: {
  title?: string;
  data: TopEventRow[];
  loading?: boolean;
  query: string;
  onQueryChange: (v: string) => void;
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  onSelectEvent: (eventName: string) => void;
  selectedEventName?: string | null;
}) {
  const normalizedQuery = query.trim().toLowerCase();

  const rows = useMemo(() => {
    const filtered = normalizedQuery
      ? data.filter((e) => String(e.event_name || '').toLowerCase().includes(normalizedQuery))
      : data.slice();

    const byTime = (a: TopEventRow, b: TopEventRow) => {
      const ta = new Date(a.last_seen).getTime();
      const tb = new Date(b.last_seen).getTime();
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return tb - ta;
    };

    const byCount = (a: TopEventRow, b: TopEventRow) => (Number(b.count) || 0) - (Number(a.count) || 0);
    const byName = (a: TopEventRow, b: TopEventRow) => String(a.event_name).localeCompare(String(b.event_name));

    const sorter = sort === 'count' ? byCount : sort === 'name' ? byName : byTime;
    return filtered.sort(sorter);
  }, [data, normalizedQuery, sort]);

  return (
    <div className="px-3 py-3 w-full">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-900">{title}</p>
        <span className="text-[11px] text-gray-600 tabular-nums">{rows.length}</span>
      </div>

      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search events…"
            className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          {query.trim() ? (
            <button
              type="button"
              className="shrink-0 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 cursor-pointer"
              onClick={() => onQueryChange('')}
              title="Clear search"
            >
              Clear
            </button>
          ) : null}
        </div>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortKey)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
        >
          <option value="time">Sort: Last seen</option>
          <option value="count">Sort: Count</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <div className="mt-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-9 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : rows.length ? (
          <div className="max-h-[52vh] overflow-auto pr-1">
            <ul className="space-y-1">
              {rows.map((e) => (
                <li key={e.event_name}>
                  <button
                    type="button"
                    className={
                      'w-full cursor-pointer rounded-xl px-2.5 py-2 text-left focus:outline-none focus:ring-2 focus:ring-gray-900/10 ' +
                      (selectedEventName === e.event_name ? 'bg-gray-900 text-white hover:bg-gray-900/90' : 'hover:bg-gray-50')
                    }
                    onClick={() => onSelectEvent(e.event_name)}
                    title="Open this event"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={'min-w-0 truncate text-sm font-medium ' + (selectedEventName === e.event_name ? 'text-white' : 'text-gray-900')}>
                        {e.event_name}
                      </span>
                      <span className={'shrink-0 text-xs font-semibold tabular-nums ' + (selectedEventName === e.event_name ? 'text-white/90' : 'text-gray-900')}>
                        {e.count}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <span className={'min-w-0 truncate text-[11px] ' + (selectedEventName === e.event_name ? 'text-white/70' : 'text-gray-600')}>
                        {fmtTime(e.last_seen)}
                      </span>
                      <span className={'shrink-0 text-[11px] ' + (selectedEventName === e.event_name ? 'text-white/60' : 'text-gray-500')}>
                        last seen
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-gray-600 mt-2">
            No events match your search.
          </p>
        )}
      </div>
    </div>
  );
}

