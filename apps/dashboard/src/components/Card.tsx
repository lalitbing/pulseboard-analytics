import type { ReactNode } from 'react';

export default function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={'relative rounded-xl border border-line bg-surface ' + className}>
      <div className="flex flex-col gap-3 px-4 pt-4 sm:px-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p> : null}
        </div>
        {actions ? <div className="min-w-0 w-full sm:w-auto sm:ml-auto">{actions}</div> : null}
      </div>

      <div className="px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div>
    </section>
  );
}
