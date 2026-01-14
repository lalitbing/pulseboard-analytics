type RangeKey = 'from' | 'to';

type DateFilterProps = {
  range: {
    from: string;
    to: string;
  };
  onChange: (key: RangeKey, value: string) => void;
  onApply: () => void;
  hasChanges: boolean;
};

export default function DateFilter({ range, onChange, onApply, hasChanges }: DateFilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <input
        type="date"
        className="border rounded px-3 py-2"
        value={range.from}
        onChange={(e) => onChange('from', e.target.value)}
      />

      <input
        type="date"
        className="border rounded px-3 py-2"
        value={range.to}
        onChange={(e) => onChange('to', e.target.value)}
      />

      <button
        type="button"
        className={
          'px-4 py-2 rounded text-sm font-medium transition ' +
          (hasChanges
            ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
            : 'bg-blue-100 text-blue-400 cursor-not-allowed')
        }
        disabled={!hasChanges}
        onClick={() => {
          if (hasChanges) {
            onApply();
          }
        }}
      >
        Apply
      </button>
    </div>
  );
}
