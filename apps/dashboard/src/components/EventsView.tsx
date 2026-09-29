import { useMemo, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { formatIstDateTime, toIstIso } from '../lib/time';

type RawEvent = {
  event_name: string;
  created_at: string;
};

type SortKey = 'time_desc' | 'time_asc' | 'name';

function fmtFull(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatIstDateTime(d, {
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

  const controlClass =
    'rounded-lg border border-line bg-surface py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-3 p-4 sm:p-5 border-b border-line">
        {selectedEventName ? (
          <button
            type="button"
            className="self-start rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-subtle cursor-pointer"
            onClick={onClearSelected}
          >
            Clear selection
          </button>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <label htmlFor="events-search" className="sr-only">
              Search event name
            </label>
            <input
              id="events-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search event name…"
              className={controlClass + ' w-full pl-9 pr-3'}
            />
          </div>
          <label htmlFor="events-sort" className="sr-only">
            Sort
          </label>
          <select id="events-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={controlClass + ' px-3 cursor-pointer'}>
            <option value="time_desc">Newest first</option>
            <option value="time_asc">Oldest first</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div>
        <div className="hidden sm:grid grid-cols-[1.2fr_0.9fr_0.45fr] gap-3 border-b border-line bg-subtle/60 px-5 py-2 text-xs font-medium text-ink-3">
          <div>Event</div>
          <div>Timestamp (IST)</div>
          <div className="text-right">Age</div>
        </div>

        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.9fr_0.45fr] gap-3 px-5 py-3 animate-pulse">
                <div className="h-4 w-40 rounded bg-subtle" />
                <div className="hidden sm:block h-4 w-36 rounded bg-subtle" />
                <div className="hidden sm:block ml-auto h-4 w-12 rounded bg-subtle" />
              </div>
            ))}
          </div>
        ) : rows.length ? (
          <ul className="divide-y divide-line">
            {rows.map((e, idx) => (
              <li key={`${e.created_at}-${e.event_name}-${idx}`} className="px-5 py-2.5 transition-colors hover:bg-subtle/60">
                <div className="grid grid-cols-1 sm:grid-cols-[1.2fr_0.9fr_0.45fr] items-center gap-1 sm:gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[13px] text-ink">{e.event_name}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-ink-3">{toIstIso(e.created_at)}</p>
                  </div>
                  <div className="text-sm text-ink-2">{fmtFull(e.created_at)}</div>
                  <div className="sm:text-right font-mono text-xs text-ink-3 tabular-nums">{fmtAgo(e.created_at)}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-medium text-ink">No events found</p>
            <p className="mt-1 text-xs text-ink-3">Try changing the date range or search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
