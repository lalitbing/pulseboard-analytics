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
    <section
      className={
        'relative overflow-hidden rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-sm ' +
        className
      }
    >
      <div className="flex items-start justify-between gap-4 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-xs text-gray-600">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4">{children}</div>
    </section>
  );
}
