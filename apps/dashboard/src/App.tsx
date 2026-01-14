import { useEffect, useState } from 'react';
import { getEventStats, getTopEvents } from './api/analytics';
import EventsChart from './components/EventsChart';
import TopEvents from './components/TopEvents';
import KPI from './components/KPI';
import Card from './components/Card';
import DateFilter from './components/DateFilter';
import EventTracker from './components/EventTracker';

function App() {
  const [events, setEvents] = useState<any[]>([]);
  const [top, setTop] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingTop, setLoadingTop] = useState(true);

  const makeDefaultRange = () => {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return { from, to };
  };

  const [appliedRange, setAppliedRange] = useState(makeDefaultRange);
  const [draftRange, setDraftRange] = useState(makeDefaultRange);

  const handleRangeChange = (key: 'from' | 'to', value: string) => {
    setDraftRange((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const loadData = async (currentRange: { from: string; to: string }) => {
    setLoadingEvents(true);
    setLoadingTop(true);

    try {
      const [eventsData, topData] = await Promise.all([getEventStats(currentRange), getTopEvents(currentRange)]);

      setEvents(eventsData);
      setTop(topData);
    } finally {
      setLoadingEvents(false);
      setLoadingTop(false);
    }
  };

  useEffect(() => {
    loadData(appliedRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyRange = () => {
    setAppliedRange(draftRange);
    loadData(draftRange);
  };

  const formatRangeLabel = (from: string, to: string) => {
    if (!from || !to) {
      return 'Stats for the selected period';
    }

    const formatDate = (iso: string) => {
      const [year, month, day] = iso.split('-').map(Number);

      const suffix = (d: number) => {
        if (d >= 11 && d <= 13) return 'th';
        switch (d % 10) {
          case 1:
            return 'st';
          case 2:
            return 'nd';
          case 3:
            return 'rd';
          default:
            return 'th';
        }
      };

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      return `${day}${suffix(day)} ${monthNames[month - 1]} ${year}`;
    };

    return `Stats from ${formatDate(from)} to ${formatDate(to)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Analytics Dashboard</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <p className="text-sm text-gray-600">{formatRangeLabel(appliedRange.from, appliedRange.to)}</p>

        {/* Filters */}
        <div className="sm:self-end flex flex-col sm:flex-row gap-3">
          <EventTracker />
          <DateFilter
            range={draftRange}
            onChange={handleRangeChange}
            onApply={handleApplyRange}
            hasChanges={
              draftRange.from !== appliedRange.from || draftRange.to !== appliedRange.to
            }
          />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI label="Total Events" value={events.length} loading={loadingEvents} />

        <KPI label="Unique Events" value={top.length} loading={loadingTop} />

        <KPI
          label="Today"
          value={events.filter((e: any) => e.created_at.startsWith(new Date().toISOString().split('T')[0])).length}
          loading={loadingEvents}
        />

        <KPI label="Active Days" value={new Set(events.map((e: any) => e.created_at.split('T')[0])).size} loading={loadingEvents} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Events Over Time">
          <EventsChart data={events} loading={loadingEvents} />
        </Card>

        <Card title="Top Events">
          <TopEvents data={top} loading={loadingTop} />
        </Card>
      </div>
    </div>
  );
}

export default App;
