import { useEffect, useState, type ReactNode } from 'react';
import { CaretLeft, CaretRight, ChartLineUp, List, ListBullets, Plugs, X, type Icon } from '@phosphor-icons/react';
import EventTracker from './EventTracker';
import LiveStatus, { type LiveStatusProblem } from './LiveStatus';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../lib/theme';
import type { ToastInput } from '../lib/toastBus';

type NavLabel = 'Overview' | 'Events' | 'Integration';

const NAV: { label: NavLabel; icon: Icon }[] = [
  { label: 'Overview', icon: ChartLineUp },
  { label: 'Events', icon: ListBullets },
  { label: 'Integration', icon: Plugs },
];

const iconButtonClass =
  'cursor-pointer rounded-lg p-1.5 text-ink-2 hover:bg-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" width={28} height={28} className="h-7 w-7 shrink-0" />
      <div className="leading-tight">
        <p className="text-sm font-semibold tracking-tight text-ink">Pulseboard</p>
        <p className="text-[11px] text-ink-3">Product analytics</p>
      </div>
    </div>
  );
}

function TipCarousel({
  tips,
  tipIndex,
  onPrev,
  onNext,
  containerClassName,
}: {
  tips: string[];
  tipIndex: number;
  onPrev: () => void;
  onNext: () => void;
  containerClassName: string;
}) {
  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-ink">Tip</p>
        {tips.length > 1 ? (
          <div className="-mr-1 flex items-center">
            <button type="button" onClick={onPrev} className={iconButtonClass} aria-label="Previous tip">
              <CaretLeft size={14} />
            </button>
            <button type="button" onClick={onNext} className={iconButtonClass} aria-label="Next tip">
              <CaretRight size={14} />
            </button>
          </div>
        ) : null}
      </div>
      <p key={tipIndex} className="mt-1.5 min-h-[4.5em] text-xs leading-relaxed text-ink-2 animate-fade-in">
        {tips[tipIndex] ?? ''}
      </p>
    </div>
  );
}

function NavItem({
  label,
  icon: IconCmp,
  active,
  onClick,
}: {
  label: string;
  icon: Icon;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={
        'group w-full cursor-pointer flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ' +
        (active ? 'bg-surface text-ink ring-1 ring-line' : 'text-ink-2 hover:bg-subtle hover:text-ink')
      }
    >
      <IconCmp size={16} weight={active ? 'fill' : 'regular'} className={active ? 'text-accent' : 'text-ink-3 group-hover:text-ink-2'} />
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default function AppShell({
  title,
  subtitle,
  right,
  sidebar,
  children,
  activeNav = 'Overview',
  onNavigate,
  onEventTracked,
  onToast,
  liveProblem = null,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  activeNav?: NavLabel;
  onNavigate?: (label: NavLabel) => void;
  onEventTracked?: () => void;
  onToast?: (toast: ToastInput) => void;
  liveProblem?: LiveStatusProblem;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const theme = useTheme();
  const tips = [
    'Use the date filter to narrow down spikes. Start with the last 7 days when debugging.',
    'Keep the dashboard open while validating instrumentation: new events show up live.',
    'Add consistent properties (e.g. userId, plan, source) to make filtering and segmentation more powerful.',
    'Queued tracking hands events to the Convex scheduler, so the request returns before the write lands.',
  ] as const;

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (tips.length <= 1) return;
    const id = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % tips.length);
    }, 8000);
    return () => window.clearInterval(id);
  }, [tips.length]);

  const handleNavClick = (label: NavLabel) => {
    onNavigate?.(label);
    setMobileMenuOpen(false);
  };

  const nextTip = () => setTipIndex((i) => (i + 1) % tips.length);
  const prevTip = () => setTipIndex((i) => (i - 1 + tips.length) % tips.length);

  const nav = (
    <nav aria-label="Primary" className="space-y-0.5">
      {NAV.map((item) => (
        <NavItem
          key={item.label}
          label={item.label}
          icon={item.icon}
          active={activeNav === item.label}
          onClick={() => handleNavClick(item.label)}
        />
      ))}
    </nav>
  );

  const railPanelClass = 'rounded-xl border border-line bg-surface p-4';

  return (
    <div className="min-h-[100dvh] flex flex-col bg-canvas">
      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <button type="button" onClick={() => setMobileMenuOpen(true)} className={iconButtonClass} aria-label="Open menu">
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-y-0 left-0 z-40 w-[280px] overflow-y-auto border-r border-line bg-canvas lg:hidden animate-slide-in-left"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-line">
              <Brand />
              <button type="button" onClick={() => setMobileMenuOpen(false)} className={iconButtonClass} aria-label="Close menu">
                <X size={18} />
              </button>
            </div>

            <div className="p-3 space-y-4">
              {nav}
              <TipCarousel tips={[...tips]} tipIndex={tipIndex} onPrev={prevTip} onNext={nextTip} containerClassName={railPanelClass} />
              <LiveStatus problem={liveProblem} className={railPanelClass} />
              <ThemeToggle preference={theme.preference} onChange={theme.setPreference} className={railPanelClass} />
            </div>
          </div>
        </>
      )}

      <div className="mx-auto max-w-[1400px] w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-[232px_1fr] gap-6 lg:gap-8 px-4 py-6 sm:px-6 lg:px-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-6">
              <div className="flex items-center justify-between px-1">
                <Brand />
                <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-medium text-ink-3">beta</span>
              </div>

              {nav}

              <div className="space-y-3">
                <TipCarousel tips={[...tips]} tipIndex={tipIndex} onPrev={prevTip} onNext={nextTip} containerClassName={railPanelClass} />
                <LiveStatus problem={liveProblem} className={railPanelClass} />
                <ThemeToggle preference={theme.preference} onChange={theme.setPreference} className={railPanelClass} />
              </div>

              {sidebar ? <div className="overflow-hidden rounded-xl border border-line bg-surface">{sidebar}</div> : null}
            </div>
          </aside>

          {/* Main */}
          <main className="min-w-0 relative">
            <header className="relative z-20 flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-ink-3">{subtitle}</p> : null}
              </div>
              {right ? <div className="shrink-0">{right}</div> : null}
            </header>

            <div className="relative">{children}</div>
          </main>
        </div>
      </div>

      <footer className="mt-auto border-t border-line">
        <div className="mx-auto max-w-[1400px] px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-xs text-ink-3">© {new Date().getFullYear()} Pulseboard. MIT Licensed.</p>
        </div>
      </footer>

      <EventTracker onTracked={onEventTracked} onToast={onToast} />
    </div>
  );
}
