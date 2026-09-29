import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { getEvents, type Range } from './api/analytics';
import { API_KEY, API_URL, isConvexConfigured } from './lib/convex';
import { formatDayLabel, formatIstDateTime, istDate, REPORT_TIME_ZONE } from './lib/time';
import EventsChart from './components/EventsChart';
import TopEvents from './components/TopEvents';
import KPI from './components/KPI';
import Card from './components/Card';
import DateFilter, { type DatePreset } from './components/DateFilter';
import AppShell from './components/AppShell';
import EventsView from './components/EventsView';
import IntegrationView from './components/IntegrationView';
import { DownloadSimple, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react';
import { subscribeToast, type ToastInput, type ToastPayload } from './lib/toastBus';

function formatShortDate(iso: string) {
  return formatDayLabel(iso, { year: 'numeric', month: 'short', day: '2-digit' });
}

function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const csv = [header, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function App() {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [snippetTab, setSnippetTab] = useState<'curl' | 'js'>('curl');
  const [page, setPage] = useState<'Overview' | 'Events' | 'Integration'>('Overview');
  const selectedEventName = null;
  const showDateFilter = page !== 'Integration';

  const makeDefaultRange = () => {
    const to = istDate(new Date());
    const from = '2026-01-01';
    return { from, to };
  };

  const [appliedRange, setAppliedRange] = useState(makeDefaultRange);
  const [draftRange, setDraftRange] = useState(makeDefaultRange);
  const [activePreset, setActivePreset] = useState<DatePreset>('all');
  const [customOpen, setCustomOpen] = useState(false);

  // Everything on the dashboard is a live Convex subscription: queries re-run whenever events land.
  // Stats wait for the key check so an invalid key shows a status instead of throwing.
  const project = useQuery(api.stats.projectInfo, isConvexConfigured ? { apiKey: API_KEY } : 'skip');
  const statsArgs = project ? { apiKey: API_KEY, ...appliedRange } : 'skip';
  const summary = useQuery(api.stats.summary, statsArgs);
  const events = useQuery(api.stats.events, page === 'Events' ? statsArgs : 'skip');
  const liveProblem = !isConvexConfigured ? 'missing_config' : project === null ? 'invalid_key' : null;

  // Stamp "Last updated" whenever a new summary result arrives.
  const [stampedSummary, setStampedSummary] = useState(summary);
  if (summary !== stampedSummary) {
    setStampedSummary(summary);
    if (summary) setLastUpdatedAt(new Date());
  }

  const handleRangeChange = (key: 'from' | 'to', value: string) => {
    setDraftRange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  useEffect(() => {
    return subscribeToast((t) => setToast(t));
  }, []);


  useEffect(() => {
    if (!exportOpen) return;

    const onClick = (e: MouseEvent) => {
      const el = exportRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setExportOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportOpen(false);
    };

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [exportOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.ttlMs ?? 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const applyRange = (next: Range) => {
    setDraftRange(next);
    setAppliedRange(next);
  };

  const applyPreset = (preset: Exclude<DatePreset, 'custom'>) => {
    // Clicking the already-active pill should do nothing.
    if (preset === activePreset && !customOpen) return;

    setCustomOpen(false);
    setActivePreset(preset);

    const to = istDate(new Date());
    const from =
      preset === '7d'
        ? istDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        : '2026-01-01';

    applyRange({ from, to });
  };

  const openCustom = () => {
    // Opening custom should NOT change the active pill until Apply.
    setCustomOpen(true);
  };

  const applyCustom = () => {
    setAppliedRange(draftRange);
    setActivePreset('custom');
    setCustomOpen(true);
  };

  const formatRangeLabel = (from: string, to: string) => {
    if (!from || !to) {
      return 'Stats for the selected period';
    }

    const formatDate = (iso: string) => {
      const [year, month, day] = iso.split('-').map(Number);

      const suffix = (d: number) => {
        if (d >= 11 && d <= 13) return 'th';
        switch (d % 10) {
          case 1:
            return 'st';
          case 2:
            return 'nd';
          case 3:
            return 'rd';
          default:
            return 'th';
        }
      };

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      return `${day}${suffix(day)} ${monthNames[month - 1]} ${year}`;
    };

    return `Stats from ${formatDate(from)} to ${formatDate(to)}`;
  };

  const apiUrl = API_URL;
  const apiKeyPresent = Boolean(API_KEY);

  const isLoading = liveProblem === null && summary === undefined;
  const displayTop = summary?.top ?? [];
  const daily = summary?.daily ?? [];
  const totalEvents = summary?.total ?? 0;

  const todayIso = istDate(new Date());
  const activeDays = daily.length;
  const uniqueEvents = displayTop.length;
  const todayCount = daily.find((d) => d.date === todayIso)?.count ?? 0;

  const peak = daily.reduce<{ date: string; count: number } | null>((best, d) => {
    if (!best || d.count > best.count) return d;
    return best;
  }, null);

  const avgPerActiveDay = activeDays ? Math.round((totalEvents / activeDays) * 10) / 10 : 0;

  const recentEvents = summary?.recent ?? [];

  const snippet =
    snippetTab === 'curl'
      ? `curl -X POST "${apiUrl}/track" \\\n  -H "x-api-key: <YOUR_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"event":"signup_completed","queued":false}'`
      : `await fetch("${apiUrl}/track", {\n  method: "POST",\n  headers: {\n    "x-api-key": "<YOUR_API_KEY>",\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({ event: "signup_completed", queued: false }),\n});`;

  const exportEventsCsv = async () => {
    try {
      const rows = events ?? (await getEvents(appliedRange));
      downloadCsv(
        `events_${appliedRange.from}_to_${appliedRange.to}.csv`,
        ['event_name', 'created_at'],
        rows.map((e) => [e.event_name, e.created_at])
      );
    } catch {
      setToast({ kind: 'error', message: 'Export failed' });
    }
  };

  return (
    <AppShell
      title={page}
      subtitle={page === 'Overview' ? formatRangeLabel(appliedRange.from, appliedRange.to) : undefined}
      activeNav={page}
      onNavigate={(p) => setPage(p)}
      onToast={(t: ToastInput) => setToast(typeof t === 'string' ? { message: t } : t)}
      onEventTracked={() => {
        // The live queries pick the new event up on their own.
        setToast({ kind: 'success', message: 'Event tracked' });
      }}
      liveProblem={liveProblem}
      right={
        showDateFilter ? (
        <div className="w-full">
          <DateFilter
            activePreset={activePreset}
            customOpen={customOpen}
            onPresetClick={applyPreset}
            onCustomOpen={openCustom}
            range={draftRange}
            onChange={(k, v) => {
              handleRangeChange(k, v);
            }}
            onApply={applyCustom}
            hasChanges={draftRange.from !== appliedRange.from || draftRange.to !== appliedRange.to}
            right={
              <div ref={exportRef} className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={exportOpen}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <DownloadSimple size={14} />
                  Export
                </button>
                {exportOpen ? (
                  <div className="absolute right-0 z-10 mt-1.5 w-44 overflow-hidden rounded-lg border border-line bg-surface p-1 shadow-pop animate-pop-in" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-ink hover:bg-subtle cursor-pointer transition"
                      onClick={() => {
                        setExportOpen(false);
                        void exportEventsCsv();
                      }}
                    >
                      Events CSV
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full rounded-md px-2.5 py-1.5 text-left text-sm text-ink hover:bg-subtle cursor-pointer transition"
                      onClick={() => {
                        setExportOpen(false);
                        downloadCsv(
                          `top_events_${appliedRange.from}_to_${appliedRange.to}.csv`,
                          ['event_name', 'count', 'last_seen'],
                          displayTop.map((e) => [e.event_name, e.count, e.last_seen])
                        );
                      }}
                    >
                      Top events CSV
                    </button>
                  </div>
                ) : null}
              </div>
            }
          />
        </div>
        ) : undefined
      }
    >
      {toast ? (
        <div className="fixed top-4 right-4 z-60" role="status" aria-live="polite">
          <div key={toast.message} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 shadow-pop animate-pop-in">
            {toast.kind === 'error' ? (
              <WarningCircle size={18} weight="fill" className="mt-px shrink-0 text-bad" />
            ) : toast.kind === 'success' ? (
              <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-ok" />
            ) : (
              <Info size={18} weight="fill" className="mt-px shrink-0 text-ink-3" />
            )}
            <div>
              {toast.title ? <div className="text-sm font-medium text-ink">{toast.title}</div> : null}
              <div className="text-sm text-ink">{toast.message}</div>
            </div>
          </div>
        </div>
      ) : null}

      {page === 'Overview' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4 min-w-0">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-line bg-surface [&>*]:border-line max-lg:[&>*:nth-child(-n+2)]:border-b [&>*:nth-child(odd)]:border-r lg:[&>*:not(:last-child)]:border-r">
              <KPI label="Total events" value={totalEvents} loading={isLoading} hint="All tracked events" />
              <KPI label="Unique events" value={uniqueEvents} loading={isLoading} hint="Distinct names" />
              <KPI label="Avg / active day" value={avgPerActiveDay} loading={isLoading} hint="Smoothed" />
              <KPI
                label="Peak day"
                value={peak ? peak.count : '-'}
                loading={isLoading}
                hint="Most events in one day"
                secondary={peak ? formatShortDate(peak.date) : undefined}
              />
            </div>

            {/* Chart */}
            <Card
              title="Events over time"
              subtitle={lastUpdatedAt ? `Last updated ${lastUpdatedAt.toLocaleTimeString(undefined, { timeZone: REPORT_TIME_ZONE })} IST` : undefined}
              actions={
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  {liveProblem === null && summary !== undefined && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md bg-ok-soft px-1.5 py-0.5 text-[11px] font-medium text-ok"
                      title="Live updates active"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />
                      Live
                    </span>
                  )}
                  <span
                    className={
                      'rounded-md px-1.5 py-0.5 text-[11px] font-medium ' +
                      (apiKeyPresent ? 'bg-subtle text-ink-2' : 'bg-warn-soft text-warn')
                    }
                    title={apiKeyPresent ? 'API key configured' : 'Missing VITE_API_KEY'}
                  >
                    {apiKeyPresent ? 'Key OK' : 'Key missing'}
                  </span>
                  <span
                    className="rounded-md bg-subtle px-1.5 py-0.5 font-mono text-[11px] text-ink-2 min-w-0 max-w-full sm:max-w-[260px] truncate"
                    title={apiUrl}
                  >
                    {apiUrl.replace(/^https?:\/\//, '')}
                  </span>
                </div>
              }
            >
              <EventsChart data={daily} loading={isLoading} />
            </Card>

            {/* Recent activity */}
            <Card title="Recent activity" subtitle="Latest events observed on the backend">
              {isLoading ? (
                <div className="-mx-4 sm:-mx-5 -mb-4 sm:-mb-5 divide-y divide-line border-t border-line">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-4 sm:px-5 py-3 animate-pulse">
                      <div className="h-3.5 w-32 rounded bg-subtle" />
                      <div className="h-3.5 w-24 rounded bg-subtle" />
                    </div>
                  ))}
                </div>
              ) : recentEvents.length ? (
                <ul className="-mx-4 sm:-mx-5 -mb-4 sm:-mb-5 divide-y divide-line border-t border-line">
                  {recentEvents.map((e, idx) => (
                    <li
                      key={`${e.created_at}-${e.event_name}-${idx}`}
                      className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2.5 transition-colors hover:bg-subtle/60"
                    >
                      <p className="min-w-0 truncate font-mono text-[13px] text-ink">{e.event_name}</p>
                      <p className="shrink-0 text-xs text-ink-3 tabular-nums">{formatIstDateTime(new Date(e.created_at))}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
                  <p className="text-sm font-medium text-ink">No events in this range yet</p>
                  <p className="mt-1 text-xs text-ink-3">Track one with the button in the bottom-right corner.</p>
                </div>
              )}
            </Card>
          </div>

          {/* Right rail */}
          <div className="space-y-4 min-w-0">
            <Card title="Top events" subtitle="Most frequent">
              <TopEvents data={displayTop} loading={isLoading} />
            </Card>

            <Card title="Today" subtitle="Quick snapshot">
              {isLoading ? (
                <div className="h-12 rounded-lg bg-subtle animate-pulse" />
              ) : (
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-xs text-ink-3">Events</dt>
                    <dd className="mt-1 font-mono text-xl font-medium text-ink tabular-nums">{todayCount}</dd>
                    <dd className="mt-0.5 font-mono text-[11px] text-ink-3">{todayIso}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-3">Active days</dt>
                    <dd className="mt-1 font-mono text-xl font-medium text-ink tabular-nums">{activeDays}</dd>
                  </div>
                </dl>
              )}
            </Card>

            <Card title="Integrate" subtitle="Copy-paste tracking examples">
              <div className="flex items-center gap-2">
                <div role="tablist" aria-label="Snippet language" className="inline-flex items-center gap-0.5 rounded-lg bg-subtle p-0.5">
                  {(['curl', 'js'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={snippetTab === tab}
                      onClick={() => setSnippetTab(tab)}
                      className={
                        'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition ' +
                        (snippetTab === tab ? 'bg-surface text-ink ring-1 ring-line' : 'text-ink-2 hover:text-ink')
                      }
                    >
                      {tab === 'curl' ? 'curl' : 'JS'}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="ml-auto rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink hover:bg-subtle active:scale-[0.98] cursor-pointer"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(snippet);
                      setToast({ kind: 'success', message: 'Copied snippet' });
                    } catch {
                      setToast({ kind: 'error', message: 'Copy failed (clipboard blocked)' });
                    }
                  }}
                >
                  Copy
                </button>
              </div>

              <pre className="mt-3 overflow-auto rounded-lg border border-line bg-subtle p-3 font-mono text-[12px] leading-5 text-ink">{snippet}</pre>

              {!apiKeyPresent ? (
                <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
                  Set <span className="font-mono font-medium">VITE_API_KEY</span> to enable requests from the dashboard.
                </p>
              ) : null}
            </Card>
          </div>
        </div>
      ) : page === 'Events' ? (
        <EventsView events={events ?? []} loading={liveProblem === null && events === undefined} selectedEventName={selectedEventName} onClearSelected={() => {}} />
      ) : (
        <IntegrationView apiUrl={apiUrl} apiKeyPresent={apiKeyPresent} />
      )}
    </AppShell>
  );
}

export default App;
