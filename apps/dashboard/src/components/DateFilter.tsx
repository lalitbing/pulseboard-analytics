type RangeKey = 'from' | 'to';

export type DatePreset = 'all' | '7d' | 'custom';

type DateFilterProps = {
  range: {
    from: string;
    to: string;
  };
  onChange: (key: RangeKey, value: string) => void;
  onApply: () => void;
  hasChanges: boolean;
  activePreset: DatePreset;
  customOpen: boolean;
  onPresetClick: (next: Exclude<DatePreset, 'custom'>) => void;
  onCustomOpen: () => void;
  right?: import('react').ReactNode;
};

export default function DateFilter({
  range,
  onChange,
  onApply,
  hasChanges,
  activePreset,
  customOpen,
  onPresetClick,
  onCustomOpen,
  right,
}: DateFilterProps) {
  const pillClass = (active: boolean) =>
    'cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold border transition focus:outline-none focus:ring-2 focus:ring-gray-900/10 ' +
    (active
      ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
      : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50');

  return (
    <div className="flex flex-col items-stretch gap-2">
      <div className="flex flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={pillClass(activePreset === 'all')} onClick={() => onPresetClick('all')}>
            All
          </button>
          <button type="button" className={pillClass(activePreset === '7d')} onClick={() => onPresetClick('7d')}>
            7D
          </button>
          <button type="button" className={pillClass(activePreset === 'custom')} onClick={onCustomOpen}>
            Custom
          </button>
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {customOpen ? (
        <div className="flex flex-wrap items-end gap-2">
          <input
            type="date"
            className="cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            value={range.from}
            onChange={(e) => onChange('from', e.target.value)}
          />

          <input
            type="date"
            className="cursor-pointer rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
            value={range.to}
            onChange={(e) => onChange('to', e.target.value)}
          />

          <button
            type="button"
            className={
              'rounded-xl px-3 py-2 text-sm font-medium shadow-sm transition ' +
              (hasChanges
                ? 'bg-gray-900 text-white hover:bg-gray-800 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed')
            }
            disabled={!hasChanges}
            onClick={() => {
              if (hasChanges) onApply();
            }}
          >
            Apply
          </button>
        </div>
      ) : null}
    </div>
  );
}
