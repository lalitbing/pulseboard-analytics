export default function KPI({
  label,
  value,
  loading,
}: {
  label: string;
  value: any;
  loading?: boolean;
}) {
  return (
    <div className="bg-white p-5 rounded-xl shadow">
      <p className="text-sm text-gray-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 w-16 bg-gray-200 rounded animate-pulse" />
      ) : (
        <h2 className="text-2xl font-bold mt-1">{value}</h2>
      )}
    </div>
  );
}
