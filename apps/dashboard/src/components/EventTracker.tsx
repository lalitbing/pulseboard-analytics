import { useEffect, useState } from 'react';
import { getWorkerStatus, trackEvent } from '../api/analytics';
import type { ToastInput } from '../lib/toastBus';

const parseProperties = (
  raw: string
): { ok: true; value: Record<string, unknown> | undefined } | { ok: false; error: string } => {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: undefined };

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
      return { ok: false, error: 'Properties must be a JSON object (e.g. {"plan":"pro"}).' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'Invalid JSON in Properties.' };
  }
};

export default function EventTracker({
  onTracked,
  onToast,
}: {
  onTracked?: () => void;
  onToast?: (toast: ToastInput) => void;
}) {
  const [eventName, setEventName] = useState('');
  const [propertiesText, setPropertiesText] = useState('');
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [useRedis, setUseRedis] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workerActive, setWorkerActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let disposed = false;
    let inFlight: AbortController | null = null;
    let seq = 0;

    // Show a "checking" state the moment the popup opens.
    setWorkerActive(null);

    const check = async () => {
      if (disposed) return;
      const requestId = ++seq;
      // Abort any prior request to avoid race-y updates.
      if (inFlight) inFlight.abort();
      const ac = new AbortController();
      inFlight = ac;

      try {
        const status = await getWorkerStatus(ac.signal);
        if (disposed || ac.signal.aborted || requestId !== seq) return;
        // If status is null (e.g. 304/no-body), keep prior UI state.
        if (status && typeof status.active === 'boolean') {
          setWorkerActive(status.active);
          if (!status.active) {
            // Prevent sending Redis ingestion when worker isn't consuming.
            setUseRedis(false);
          }
        }
      } catch {
        if (disposed || ac.signal.aborted || requestId !== seq) return;
        // Network/API errors during polling shouldn't flip to "inactive" and disable Redis.
        // Keep the last known state and let the next poll recover.
        setWorkerActive((prev) => prev);
      }
    };

    void check();
    const t = window.setInterval(() => {
      void check();
    }, 10000);

    return () => {
      disposed = true;
      if (inFlight) inFlight.abort();
      window.clearInterval(t);
    };
  }, [isOpen]);

  const submit = async () => {
    const normalized = eventName.replace(/[^a-zA-Z0-9_]/g, '').trim();
    if (!normalized) {
      return;
    }

    setIsTracking(true);
    setError(null);
    try {
      const parsed = parseProperties(propertiesText);
      if (!parsed.ok) {
        setPropertiesError(parsed.error);
        onToast?.(parsed.error);
        setIsTracking(false);
        return;
      }

      await trackEvent(normalized, useRedis, parsed.value);
      setIsTracking(false);
      setIsOpen(false);
      setEventName('');
      setPropertiesText('');
      setPropertiesError(null);
      onTracked?.();
    } catch (error) {
      console.error('Failed to track event:', error);
      setError('Failed to track event. Please try again.');
      setIsTracking(false);
    }
  };

  return (
    <>
      {/* Floating button bottom-right */}
      <div className="fixed bottom-4 right-4 z-40 group">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center px-4 py-2.5 rounded-full shadow-lg bg-blue-600 text-white text-sm sm:text-base font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          {/* Text appears on hover (doesn't affect base padding) */}
          <span className="hidden group-hover:inline-block mr-2 whitespace-nowrap text-sm sm:text-base">
            Track custom event
          </span>
          {/* Plus icon with spin animation */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 transition-transform duration-300 group-hover:rotate-180"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setIsOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with title + toggle */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Track Event
              </h2>
              <div
                className={
                  'rounded-lg border px-2 py-1 ' +
                  (isTracking || workerActive !== true
                    ? 'border-gray-200 bg-gray-50/80 text-gray-500 opacity-50'
                    : 'border-transparent')
                }
              >
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm text-gray-600">Use Redis</span>
                    <label
                      className={
                        'relative inline-flex items-center ' +
                        (isTracking || workerActive !== true ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')
                      }
                    >
                      <input
                        type="checkbox"
                        checked={useRedis}
                        onChange={(e) => setUseRedis(e.target.checked)}
                        disabled={isTracking || workerActive !== true}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>

                  {workerActive === false ? (
                    <p className="mt-1 text-[11px] leading-3 text-gray-500 text-center w-full">Redis worker inactive</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Body with input + button */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="px-4 py-4 sm:px-6 sm:py-5 space-y-4"
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="event-name" className="text-sm font-medium text-gray-700">
                  Event name
                </label>
                <input
                  id="event-name"
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="Enter event name"
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                  disabled={isTracking}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="event-props" className="text-sm font-medium text-gray-700">
                  Properties (JSON)
                </label>
                <textarea
                  id="event-props"
                  value={propertiesText}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPropertiesText(next);
                    const parsed = parseProperties(next);
                    setPropertiesError(parsed.ok ? null : parsed.error);
                  }}
                  onBlur={() => {
                    if (propertiesError) onToast?.(propertiesError);
                  }}
                  placeholder='{"plan":"pro","source":"cta"}'
                  className={
                    'border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 font-mono min-h-[92px] ' +
                    (propertiesError ? 'border-red-300' : 'border-gray-300')
                  }
                  disabled={isTracking}
                />
                {propertiesError ? (
                  <p className="text-xs text-red-700">{propertiesError}</p>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                  onClick={() => setIsOpen(false)}
                  disabled={isTracking}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!eventName.trim() || isTracking}
                  className={
                    'px-4 py-2 rounded-md text-sm font-medium transition ' +
                    (eventName.trim() && !isTracking
                      ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                  }
                >
                  {isTracking ? 'Tracking…' : 'Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
