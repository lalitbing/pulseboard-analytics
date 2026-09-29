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
        <div className="w-full h-full rounded-lg bg-subtle animate-pulse" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div ref={containerRef} className="w-full min-w-0 h-[240px] sm:h-[300px] grid place-items-center rounded-lg border border-dashed border-line">
        <div className="text-center">
          <p className="text-sm font-medium text-ink">No data for this range</p>
          <p className="mt-1 text-xs text-ink-3">Try widening the date range or tracking a new event.</p>
        </div>
      </div>
    );
  }

  // Already bucketed per UTC day by the backend
  const chartData = data;

  const fmt = (iso: string) => formatDayLabel(iso, { month: 'short', day: 'numeric' });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    // Chart marks use currentColor, so the accent token (and its dark variant) drives them.
    <div ref={containerRef} className="w-full min-w-0 h-[240px] sm:h-[300px] text-accent">
      {containerSize && (
        <ResponsiveContainer width={containerSize.width} height={containerSize.height}>
          <AreaChart data={chartData} margin={{ top: 8, right: 20, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="eventsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.22} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmt} axisLine={false} tickLine={false} tickMargin={8} minTickGap={24} />
            <YAxis axisLine={false} tickLine={false} width={32} allowDecimals={false} />
            <Tooltip
              labelFormatter={(v) => fmt(String(v))}
              formatter={(value) => [value, 'Events']}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--color-line)',
                background: 'var(--color-surface)',
                boxShadow: 'var(--shadow-pop)',
                fontSize: 12,
                padding: '6px 10px',
              }}
              labelStyle={{ color: 'var(--color-ink-3)', marginBottom: 2 }}
              itemStyle={{ color: 'var(--color-ink)', fontFamily: 'var(--font-mono)', padding: 0 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="currentColor"
              strokeWidth={1.75}
              fill="url(#eventsFill)"
              isAnimationActive={!reduceMotion}
              animationDuration={650}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: 'currentColor' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
