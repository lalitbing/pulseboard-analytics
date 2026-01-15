import { useMemo, useState } from 'react';

type RawEvent = {
  event_name: string;
  created_at: string;
};

type SortKey = 'time_desc' | 'time_asc' | 'name';

function fmtFull(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return `${Math.max(0, s)}s ago`;
}

export default function EventsView({
  events,
  loading,
  selectedEventName,
  onClearSelected,
}: {
  events: RawEvent[];
  loading?: boolean;
  selectedEventName: string | null;
  onClearSelected: () => void;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('time_desc');

  const normalized = q.trim().toLowerCase();

  const rows = useMemo(() => {
    let list = events.slice();

    if (selectedEventName) {
      list = list.filter((e) => e.event_name === selectedEventName);
    }

    if (normalized) {
      list = list.filter((e) => String(e.event_name || '').toLowerCase().includes(normalized));
    }

    const byTimeDesc = (a: RawEvent, b: RawEvent) => (a.created_at < b.created_at ? 1 : -1);
    const byTimeAsc = (a: RawEvent, b: RawEvent) => (a.created_at < b.created_at ? -1 : 1);
    const byName = (a: RawEvent, b: RawEvent) => String(a.event_name).localeCompare(String(b.event_name));

    const sorter = sort === 'time_asc' ? byTimeAsc : sort === 'name' ? byName : byTimeDesc;
    return list.sort(sorter);
  }, [events, normalized, selectedEventName, sort]);

  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-sm">
      <div className="flex flex-col gap-3 p-4 sm:p-5 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          {selectedEventName ? (
            <button
              type="button"
              className="self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-50 cursor-pointer"
              onClick={onClearSelected}
            >
              Clear selection
            </button>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search event name…"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          >
            <option value="time_desc">Sort: Newest</option>
            <option value="time_asc">Sort: Oldest</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      <div className="p-2 sm:p-3">
        {/* “Not a table”, but table-like */}
        <div className="hidden sm:grid grid-cols-[1.2fr_0.9fr_0.45fr] gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
          <div>Event</div>
          <div>Timestamp</div>
          <div className="text-right">Age</div>
        </div>

        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : rows.length ? (
          <div className="pr-1">
            <ul className="space-y-1">
              {rows.map((e, idx) => (
                <li
                  key={`${e.created_at}-${e.event_name}-${idx}`}
                  className="rounded-xl border border-gray-100 bg-white px-3 py-2 hover:border-gray-200 transition"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.9fr_0.45fr] gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{e.event_name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-gray-600">{e.created_at}</p>
                    </div>
                    <div className="text-sm text-gray-900">{fmtFull(e.created_at)}</div>
                    <div className="text-right text-sm text-gray-700 tabular-nums">{fmtAgo(e.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-gray-900">No events found</p>
            <p className="mt-1 text-xs text-gray-600">Try changing the date range, selection, or search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

