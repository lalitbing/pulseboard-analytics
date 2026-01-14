export default function Card({ title, children }: { title: string; children: any }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 sm:p-5">
      <h3 className="text-sm text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}
