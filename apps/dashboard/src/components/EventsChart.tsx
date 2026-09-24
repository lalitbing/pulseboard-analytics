import { useEffect, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDayLabel } from '../lib/time';

export default function EventsChart({ data, loading }: { data: { date: string; count: number }[]; loading?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setContainerSize({ width: rect.width, height: rect.height });
        }
      }
    };

    // Initial size check
    const timer = setTimeout(updateSize, 10);

    // Listen for resize
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // Re-measure when loading changes
    if (!loading && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    }
  }, [loading]);
  if (loading || !containerSize) {
    return (
      <div ref={containerRef} className="w-full min-w-0 h-[240px] sm:h-[300px]">
        <div className="w-full h-full rounded-md bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div ref={containerRef} className="w-full min-w-0 h-[240px] sm:h-[300px] grid place-items-center rounded-xl border border-gray-100 bg-white">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-900">No data for this range</p>
          <p className="mt-1 text-xs text-gray-600">Try widening the date range or tracking a new event.</p>
        </div>
      </div>
    );
  }

  // Already bucketed per UTC day by the backend
  const chartData = data;

  const fmt = (iso: string) => formatDayLabel(iso, { month: 'short', day: 'numeric' });

  return (
    <div ref={containerRef} className="w-full min-w-0 h-[240px] sm:h-[300px]">
      {containerSize && (
        <ResponsiveContainer width={containerSize.width} height={containerSize.height}>
          <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="eventsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#111827" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#111827" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
            <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} width={28} />
            <Tooltip
              labelFormatter={(v) => fmt(String(v))}
              formatter={(value) => [value, 'Events']}
              contentStyle={{ borderRadius: 12, borderColor: '#e5e7eb' }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#111827"
              strokeWidth={2}
              fill="url(#eventsFill)"
              animationDuration={650}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
