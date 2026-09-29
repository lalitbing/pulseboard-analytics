import { Desktop, Moon, Sun, type Icon } from '@phosphor-icons/react';
import type { ThemePreference } from '../lib/theme';

const OPTIONS: { value: ThemePreference; label: string; icon: Icon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Desktop },
];

export default function ThemeToggle({
  preference,
  onChange,
  className = '',
}: {
  preference: ThemePreference;
  onChange: (next: ThemePreference) => void;
  className?: string;
}) {
  return (
    <div className={'flex items-center justify-between gap-3 ' + className}>
      <p className="text-xs font-medium text-ink">Theme</p>
      <div role="radiogroup" aria-label="Theme" className="inline-flex items-center gap-0.5 rounded-lg bg-subtle p-0.5">
        {OPTIONS.map(({ value, label, icon: IconCmp }) => {
          const active = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={label}
              title={label}
              onClick={() => onChange(value)}
              className={
                'cursor-pointer rounded-md p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ' +
                (active ? 'bg-surface text-ink ring-1 ring-line' : 'text-ink-3 hover:text-ink')
              }
            >
              <IconCmp size={14} weight={active ? 'fill' : 'regular'} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
