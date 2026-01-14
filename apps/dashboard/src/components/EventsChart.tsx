import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function EventsChart({ data, loading }: { data: any[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="w-full h-[240px] sm:h-[300px]">
        <div className="w-full h-full rounded-md bg-gray-100 animate-pulse" />
      </div>
    );
  }

  const daily = data.reduce((acc: any, e: any) => {
    const d = e.created_at.split('T')[0];
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(daily).map(([date, count]) => ({ date, count }));

  return (
    <div className="w-full h-[240px] sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" strokeWidth={2} dot={false} animationDuration={800} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
