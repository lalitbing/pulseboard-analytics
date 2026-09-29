import { useConvexConnectionState } from 'convex/react';

export type LiveStatusProblem = 'missing_config' | 'invalid_key' | null;

// Sidebar card showing the state of the dashboard's live Convex connection.
export default function LiveStatus({ problem, className }: { problem: LiveStatusProblem; className: string }) {
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();

  const state =
    problem === 'missing_config'
      ? { dot: 'bg-warn', text: 'text-warn', label: 'Missing Convex env', pulse: false }
      : problem === 'invalid_key'
        ? { dot: 'bg-bad', text: 'text-bad', label: 'Invalid API key', pulse: false }
        : isWebSocketConnected
          ? { dot: 'bg-ok', text: 'text-ok', label: 'Live', pulse: true }
          : { dot: 'bg-warn', text: 'text-warn', label: hasEverConnected ? 'Reconnecting…' : 'Connecting…', pulse: true };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink">Live updates</p>
          <p className="mt-0.5 text-xs text-ink-3">New events appear automatically</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" role="status" aria-live="polite">
          <span className="relative flex h-2 w-2">
            {state.pulse ? <span className={`absolute inset-0 rounded-full ${state.dot} opacity-60 animate-ping`} /> : null}
            <span className={`relative h-2 w-2 rounded-full ${state.dot}`} />
          </span>
          <span className={`text-[11px] font-medium ${state.text}`}>{state.label}</span>
        </div>
      </div>
    </div>
  );
}
