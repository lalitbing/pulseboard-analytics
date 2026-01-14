export default function TopEvents({ data, loading }: { data: any[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="flex justify-between bg-gray-50 p-3 rounded animate-pulse"
          >
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-4 w-10 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return <p>No top events yet</p>;
  }

  return (
    <div>
      <ul className="space-y-2">
        {data.map((e) => (
          <li className="flex justify-between bg-gray-50 p-3 rounded text-sm sm:text-base">
            <span>{e.event_name}</span>
            <span className="font-bold">{e.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
