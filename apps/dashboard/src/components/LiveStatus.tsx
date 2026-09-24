import { useConvexConnectionState } from 'convex/react';

export type LiveStatusProblem = 'missing_config' | 'invalid_key' | null;

// Sidebar card showing the state of the dashboard's live Convex connection.
export default function LiveStatus({ problem, className }: { problem: LiveStatusProblem; className: string }) {
  const { isWebSocketConnected, hasEverConnected } = useConvexConnectionState();

  const state =
    problem === 'missing_config'
      ? { dot: 'bg-amber-500', text: 'text-amber-700', label: 'Missing Convex env', pulse: false }
      : problem === 'invalid_key'
        ? { dot: 'bg-red-500', text: 'text-red-700', label: 'Invalid API key', pulse: false }
        : isWebSocketConnected
          ? { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Live', pulse: true }
          : { dot: 'bg-amber-500', text: 'text-amber-700', label: hasEverConnected ? 'Reconnecting…' : 'Connecting…', pulse: true };

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gray-900">Live updates</p>
          <p className="mt-1 text-xs text-gray-600">New events appear automatically</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5" role="status" aria-live="polite">
          <div className={`h-2 w-2 rounded-full ${state.dot}${state.pulse ? ' animate-pulse' : ''}`} />
          <span className={`text-[11px] font-medium ${state.text}`}>{state.label}</span>
        </div>
      </div>
    </div>
  );
}
