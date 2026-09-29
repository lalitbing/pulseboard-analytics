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
  const segmentClass = (active: boolean) =>
    'cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ' +
    (active ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-line' : 'text-ink-2 hover:text-ink');

  const inputClass =
    'cursor-pointer rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-xs text-ink focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';

  return (
    <div className="flex flex-col items-stretch gap-2">
      <div className="flex flex-row items-center justify-between gap-2">
        <div role="group" aria-label="Date range" className="inline-flex items-center gap-0.5 rounded-lg bg-subtle p-0.5">
          <button type="button" aria-pressed={activePreset === 'all'} className={segmentClass(activePreset === 'all')} onClick={() => onPresetClick('all')}>
            All
          </button>
          <button type="button" aria-pressed={activePreset === '7d'} className={segmentClass(activePreset === '7d')} onClick={() => onPresetClick('7d')}>
            7D
          </button>
          <button type="button" aria-pressed={activePreset === 'custom'} className={segmentClass(activePreset === 'custom')} onClick={onCustomOpen}>
            Custom
          </button>
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {customOpen ? (
        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
          <label className="sr-only" htmlFor="range-from">From</label>
          <input id="range-from" type="date" className={inputClass} value={range.from} onChange={(e) => onChange('from', e.target.value)} />
          <span className="text-xs text-ink-3">to</span>
          <label className="sr-only" htmlFor="range-to">To</label>
          <input id="range-to" type="date" className={inputClass} value={range.to} onChange={(e) => onChange('to', e.target.value)} />

          <button
            type="button"
            className={
              'rounded-lg px-3 py-1.5 text-xs font-medium transition active:scale-[0.98] ' +
              (hasChanges ? 'bg-ink text-surface hover:opacity-90 cursor-pointer' : 'bg-subtle text-ink-3 cursor-not-allowed')
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
