import { useEffect, useState } from 'react';
import { Plus, X } from '@phosphor-icons/react';
import { ConvexError } from 'convex/values';
import { trackEvent } from '../api/analytics';
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
  const [queued, setQueued] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

      await trackEvent(normalized, queued, parsed.value);
      setIsTracking(false);
      setIsOpen(false);
      setEventName('');
      setPropertiesText('');
      setPropertiesError(null);
      onTracked?.();
    } catch (error) {
      console.error('Failed to track event:', error);
      const data = error instanceof ConvexError ? (error.data as { kind?: string; retryAfter?: number }) : null;
      if (data?.kind === 'RateLimited') {
        const seconds = Math.max(1, Math.ceil((data.retryAfter ?? 0) / 1000));
        setError(`Rate limit reached. Try again in ${seconds}s.`);
      } else {
        setError('Failed to track event. Please try again.');
      }
      setIsTracking(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isTracking) setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isTracking]);

  const fieldClass =
    'w-full rounded-lg border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-2 disabled:opacity-60 ';

  return (
    <>
      {/* Floating button bottom-right */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Track custom event"
          className="group flex items-center gap-2 rounded-full bg-accent py-2.5 pl-3 pr-3 text-sm font-medium text-accent-ink shadow-pop transition hover:bg-accent-hover hover:pr-4 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/30 cursor-pointer"
        >
          <Plus size={18} weight="bold" className="transition-transform duration-300 group-hover:rotate-90" />
          <span className="hidden whitespace-nowrap group-hover:inline group-focus-visible:inline">Track event</span>
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in"
          onClick={() => !isTracking && setIsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="track-event-title"
        >
          <div
            className="w-full max-w-lg rounded-xl border border-line bg-surface shadow-pop animate-pop-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line">
              <h2 id="track-event-title" className="text-base font-semibold tracking-tight text-ink">
                Track event
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isTracking}
                className="-mr-1.5 cursor-pointer rounded-lg p-1.5 text-ink-2 hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
              className="px-5 py-5 space-y-5"
            >
              <div className="flex flex-col gap-2">
                <label htmlFor="event-name" className="text-sm font-medium text-ink">
                  Event name
                </label>
                <input
                  id="event-name"
                  type="text"
                  autoFocus
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="signup_completed"
                  aria-describedby="event-name-help"
                  className={fieldClass + 'font-mono border-line-strong focus:border-accent focus:ring-accent/20'}
                  disabled={isTracking}
                />
                <p id="event-name-help" className="text-xs text-ink-3">
                  Letters, numbers and underscores only.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="event-props" className="text-sm font-medium text-ink">
                  Properties <span className="font-normal text-ink-3">(JSON, optional)</span>
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
                  aria-invalid={Boolean(propertiesError)}
                  className={
                    fieldClass +
                    'font-mono text-[13px] min-h-[96px] ' +
                    (propertiesError ? 'border-bad focus:border-bad focus:ring-bad/20' : 'border-line-strong focus:border-accent focus:ring-accent/20')
                  }
                  disabled={isTracking}
                />
                {propertiesError ? <p className="text-xs text-bad">{propertiesError}</p> : null}
              </div>

              <label
                className={
                  'flex items-start justify-between gap-4 rounded-lg border border-line bg-subtle px-3 py-2.5 ' +
                  (isTracking ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')
                }
              >
                <span>
                  <span className="block text-sm font-medium text-ink">Queue (async)</span>
                  <span className="block text-xs text-ink-3">Write via the Convex scheduler instead of inline.</span>
                </span>
                <span className="relative mt-0.5 inline-flex shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={queued}
                    onChange={(e) => setQueued(e.target.checked)}
                    disabled={isTracking}
                    className="sr-only peer"
                  />
                  <span className="h-5 w-9 rounded-full bg-line-strong transition peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-surface after:shadow-sm after:transition-transform after:content-[''] peer-checked:after:translate-x-4" />
                </span>
              </label>

              {error ? (
                <div role="alert" className="rounded-lg border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink-2 hover:bg-subtle hover:text-ink cursor-pointer"
                  onClick={() => setIsOpen(false)}
                  disabled={isTracking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!eventName.trim() || isTracking}
                  className={
                    'rounded-lg px-4 py-2 text-sm font-medium transition active:scale-[0.98] ' +
                    (eventName.trim() && !isTracking
                      ? 'bg-accent text-accent-ink hover:bg-accent-hover cursor-pointer'
                      : 'bg-subtle text-ink-3 cursor-not-allowed')
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
