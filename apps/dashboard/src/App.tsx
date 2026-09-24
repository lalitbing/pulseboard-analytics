import { useEffect, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { getEvents, getProjectInfo, getSummary, type Range } from './api/analytics';
import { API_KEY, API_URL, isConvexConfigured } from './lib/convex';
import EventsChart from './components/EventsChart';
import TopEvents from './components/TopEvents';
import KPI from './components/KPI';
import Card from './components/Card';
import DateFilter, { type DatePreset } from './components/DateFilter';
import AppShell from './components/AppShell';
import EventsView from './components/EventsView';
import IntegrationView from './components/IntegrationView';
import { subscribeToast, type ToastInput, type ToastPayload } from './lib/toastBus';

type EventRow = {
  created_at: string;
  event_name: string;
};

type TopEventRow = {
  event_name: string;
  count: number;
  last_seen: string;
};

type RealTimeStatus = 'disabled' | 'missing_config' | 'missing_project' | 'connecting' | 'subscribed' | 'error';

type Summary = {
  total: number;
  daily: { date: string; count: number }[];
  top: TopEventRow[];
  recent: EventRow[];
};

function safeIsoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
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
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [snippetTab, setSnippetTab] = useState<'curl' | 'js'>('curl');
  const [page, setPage] = useState<'Overview' | 'Events' | 'Integration'>('Overview');
  const selectedEventName = null;
  const showDateFilter = page !== 'Integration';

  const makeDefaultRange = () => {
    const to = safeIsoDate(new Date());
    const from = '2026-01-01';
    return { from, to };
  };

  const [appliedRange, setAppliedRange] = useState(makeDefaultRange);
  const [draftRange, setDraftRange] = useState(makeDefaultRange);
  const [activePreset, setActivePreset] = useState<DatePreset>('all');
  const [customOpen, setCustomOpen] = useState(false);

  // Real-time mode: subscribe to the same Convex queries; they re-run whenever events land.
  const live = realTimeEnabled && isConvexConfigured && !projectError;
  const liveArgs = { apiKey: API_KEY, ...appliedRange };
  const liveSummary = useQuery(api.stats.summary, live ? liveArgs : 'skip');
  const liveEvents = useQuery(api.stats.events, live && page === 'Events' ? liveArgs : 'skip');

  const handleRangeChange = (key: 'from' | 'to', value: string) => {
    setDraftRange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const loadSummary = async (currentRange: Range) => {
    if (!isConvexConfigured) {
      setLoadingSummary(false);
      return;
    }
    setLoadingSummary(true);
    try {
      setSummary(await getSummary(currentRange));
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error('Failed to load summary:', err);
      setToast({ kind: 'error', message: 'Failed to load stats' });
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadEvents = async (currentRange: Range) => {
    if (!isConvexConfigured) {
      setLoadingEvents(false);
      return;
    }
    setLoadingEvents(true);
    try {
      setEvents(await getEvents(currentRange));
    } catch (err) {
      console.error('Failed to load events:', err);
      setToast({ kind: 'error', message: 'Failed to load events' });
    } finally {
      setLoadingEvents(false);
    }
  };

  // Validate the API key once so a bad key shows a clear status instead of failing silently.
  useEffect(() => {
    if (!isConvexConfigured) return;
    getProjectInfo().catch((err) => {
      console.error('Project lookup failed:', err);
      setProjectError('Invalid API key (project lookup failed)');
    });
  }, []);

  useEffect(() => {
    return subscribeToast((t) => setToast(t));
  }, []);

  // One-shot loads when Real-time mode is off.
  useEffect(() => {
    if (realTimeEnabled) return;
    void loadSummary(appliedRange);
  }, [realTimeEnabled, appliedRange]);

  useEffect(() => {
    if (realTimeEnabled || page !== 'Events') return;
    void loadEvents(appliedRange);
  }, [realTimeEnabled, appliedRange, page]);

  useEffect(() => {
    if (liveSummary) setLastUpdatedAt(new Date());
  }, [liveSummary]);

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

  const isoDate = (d: Date) => d.toISOString().split('T')[0];

  const applyPreset = (preset: Exclude<DatePreset, 'custom'>) => {
    // Clicking the already-active pill should do nothing.
    if (preset === activePreset && !customOpen) return;

    setCustomOpen(false);
    setActivePreset(preset);

    const to = isoDate(new Date());
    const from =
      preset === '7d'
        ? isoDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
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

  // Use the live subscription when Real-time mode is on, otherwise the one-shot results
  const displaySummary = live ? liveSummary ?? null : summary;
  const displayEvents = live ? liveEvents ?? [] : events;
  const displayLoading = live ? liveSummary === undefined : loadingSummary;
  const displayEventsLoading = live ? liveEvents === undefined : loadingEvents;
  const displayTop = displaySummary?.top ?? [];
  const daily = displaySummary?.daily ?? [];
  const totalEvents = displaySummary?.total ?? 0;

  const realTimeStatus: RealTimeStatus = !realTimeEnabled
    ? 'disabled'
    : !isConvexConfigured
      ? 'missing_config'
      : projectError
        ? 'missing_project'
        : liveSummary === undefined
          ? 'connecting'
          : 'subscribed';
  const realTimeError = !realTimeEnabled
    ? null
    : !isConvexConfigured
      ? 'Missing VITE_CONVEX_URL / VITE_API_KEY'
      : projectError;

  const todayIso = safeIsoDate(new Date());
  const activeDays = daily.length;
  const uniqueEvents = displayTop.length;
  const todayCount = daily.find((d) => d.date === todayIso)?.count ?? 0;

  const peak = daily.reduce<{ date: string; count: number } | null>((best, d) => {
    if (!best || d.count > best.count) return d;
    return best;
  }, null);

  const avgPerActiveDay = activeDays ? Math.round((totalEvents / activeDays) * 10) / 10 : 0;

  const recentEvents = displaySummary?.recent ?? [];

  const handleRealTimeToggle = (enabled: boolean) => {
    if (enabled && !isConvexConfigured) {
      setToast({ kind: 'error', message: 'Real-time unavailable: missing Convex env' });
      return;
    }
    setRealTimeEnabled(enabled);
  };

  const exportEventsCsv = async () => {
    try {
      const rows = live && liveEvents ? liveEvents : await getEvents(appliedRange);
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
        setToast({ kind: 'success', message: 'Event tracked' });
        // Real-time mode picks the new event up on its own.
        if (!realTimeEnabled) {
          void loadSummary(appliedRange);
          if (page === 'Events') void loadEvents(appliedRange);
        }
      }}
      realTimeEnabled={realTimeEnabled}
      onRealTimeToggle={handleRealTimeToggle}
      realTimeStatus={realTimeStatus}
      realTimeError={realTimeError}
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
                  className="cursor-pointer rounded-full border border-gray-900 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                  aria-label="Export"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                {exportOpen ? (
                  <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl" style={{ zIndex: 90 }} role="menu">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer transition"
                      onClick={() => {
                        setExportOpen(false);
                        void exportEventsCsv();
                      }}
                    >
                      Events CSV
                    </button>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 cursor-pointer transition"
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
        <div className="fixed top-4 right-4 z-60">
          <div
            className={
              'rounded-xl border bg-white shadow-lg px-3 py-2 ' +
              (toast.kind === 'error'
                ? 'border-red-200'
                : toast.kind === 'success'
                  ? 'border-emerald-200'
                  : 'border-gray-200')
            }
          >
            {toast.title ? <div className="text-sm font-semibold text-gray-900">{toast.title}</div> : null}
            <div className="text-sm text-gray-900">{toast.message}</div>
          </div>
        </div>
      ) : null}

      {page === 'Overview' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI label="Total events" value={totalEvents} loading={displayLoading} hint="All tracked events" />
              <KPI label="Unique events" value={uniqueEvents} loading={displayLoading} hint="Distinct names" />
              <KPI label="Avg / active day" value={avgPerActiveDay} loading={displayLoading} hint="Smoothed" />
              <KPI
                label="Peak day"
                value={peak ? peak.count : '—'}
                loading={displayLoading}
                hint="Most events in one day"
                secondary={peak ? formatShortDate(peak.date) : undefined}
              />
            </div>

            {/* Chart */}
            <Card
              title="Events over time"
              subtitle={lastUpdatedAt ? `Last updated ${lastUpdatedAt.toLocaleTimeString()}` : ' '}
              actions={
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {live && (
                    <span
                      className="text-[11px] rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 px-2 py-0.5 flex items-center gap-1"
                      title="Real-time mode active"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  )}
                  <span
                    className={
                      'text-[11px] rounded-full border px-2 py-0.5 ' +
                      (apiKeyPresent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')
                    }
                    title={apiKeyPresent ? 'API key configured' : 'Missing VITE_API_KEY'}
                  >
                    {apiKeyPresent ? 'Key OK' : 'Key missing'}
                  </span>
                  <span
                    className="text-[11px] rounded-full border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5 min-w-0 basis-full sm:basis-auto truncate"
                    title={apiUrl}
                  >
                    API: {apiUrl.replace(/^https?:\/\//, '')}
                  </span>
                </div>
              }
            >
              <EventsChart data={daily} loading={displayLoading} />
            </Card>

            {/* Recent activity */}
            <Card title="Recent activity" subtitle="Latest events observed on the backend">
              {displayLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : recentEvents.length ? (
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                  {recentEvents.map((e) => (
                    <li key={`${e.created_at}-${e.event_name}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <p className="min-w-0 truncate text-sm font-medium text-gray-900">{e.event_name}</p>
                      <p className="shrink-0 text-xs text-gray-600">{new Date(e.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">No events for this range yet. Track one with the button in the bottom-right.</p>
              )}
            </Card>
          </div>

          {/* Right rail */}
          <div className="space-y-6">
            <Card title="Top events" subtitle="Most frequent">
              <TopEvents data={displayTop} loading={displayLoading} />
            </Card>

            <Card title="Today" subtitle="Quick snapshot">
              {displayLoading ? (
                <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
              ) : (
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{todayCount} events</p>
                    <p className="mt-1 text-xs text-gray-600">{todayIso}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Active days</p>
                    <p className="text-sm font-semibold text-gray-900">{activeDays}</p>
                  </div>
                </div>
              )}
            </Card>

            <Card title="Integrate" subtitle="Copy/paste tracking examples">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSnippetTab('curl')}
                  className={
                    'rounded-lg px-2.5 py-1 text-xs font-medium border ' +
                    (snippetTab === 'curl'
                      ? 'bg-gray-900 text-white border-gray-900 cursor-pointer'
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50 cursor-pointer')
                  }
                >
                  curl
                </button>
                <button
                  type="button"
                  onClick={() => setSnippetTab('js')}
                  className={
                    'rounded-lg px-2.5 py-1 text-xs font-medium border ' +
                    (snippetTab === 'js'
                      ? 'bg-gray-900 text-white border-gray-900 cursor-pointer'
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50 cursor-pointer')
                  }
                >
                  JS
                </button>

                <div className="ml-auto">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 cursor-pointer"
                    onClick={async () => {
                      const text =
                        snippetTab === 'curl'
                          ? `curl -X POST "${apiUrl}/track" \\\n  -H "x-api-key: <YOUR_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"event":"signup_completed","queued":false}'`
                          : `await fetch("${apiUrl}/track", {\n  method: "POST",\n  headers: {\n    "x-api-key": "<YOUR_API_KEY>",\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({ event: "signup_completed", queued: false }),\n});`;
                      try {
                        await navigator.clipboard.writeText(text);
                        setToast({ kind: 'success', message: 'Copied snippet' });
                      } catch {
                        setToast({ kind: 'error', message: 'Copy failed (clipboard blocked)' });
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <pre className="mt-3 overflow-auto rounded-xl border border-gray-100 bg-gray-50 p-3 text-[12px] leading-5 text-gray-900">
                {snippetTab === 'curl'
                  ? `curl -X POST "${apiUrl}/track" \\\n  -H "x-api-key: <YOUR_API_KEY>" \\\n  -H "Content-Type: application/json" \\\n  -d '{"event":"signup_completed","queued":false}'`
                  : `await fetch("${apiUrl}/track", {\n  method: "POST",\n  headers: {\n    "x-api-key": "<YOUR_API_KEY>",\n    "Content-Type": "application/json",\n  },\n  body: JSON.stringify({ event: "signup_completed", queued: false }),\n});`}
              </pre>

              {!apiKeyPresent ? (
                <p className="mt-2 text-xs text-amber-700">
                  Set <span className="font-semibold">VITE_API_KEY</span> to enable requests from the dashboard.
                </p>
              ) : null}
            </Card>
          </div>
        </div>
      ) : page === 'Events' ? (
        <EventsView events={displayEvents} loading={displayEventsLoading} selectedEventName={selectedEventName} onClearSelected={() => {}} />
      ) : (
        <IntegrationView apiUrl={apiUrl} apiKeyPresent={apiKeyPresent} />
      )}
    </AppShell>
  );
}

export default App;
