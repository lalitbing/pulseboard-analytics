import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const toIsoStartUtc = (d: string) => {
  // If a full ISO timestamp is provided, respect it.
  if (d.includes('T')) return new Date(d).toISOString();
  // `YYYY-MM-DD` should be treated as UTC day boundary.
  return new Date(`${d}T00:00:00.000Z`).toISOString();
};

const toIsoEndUtc = (d: string) => {
  if (d.includes('T')) return new Date(d).toISOString();
  return new Date(`${d}T23:59:59.999Z`).toISOString();
};

type EventRow = {
  created_at: string;
  event_name: string;
};

type TopEventRow = {
  event_name: string;
  count: number;
  last_seen: string;
};

type RealTimeContextType = {
  isConfigured: boolean;
  isRealTimeEnabled: boolean;
  setRealTimeEnabled: (enabled: boolean) => void;
  status: 'disabled' | 'missing_config' | 'missing_project' | 'connecting' | 'subscribed' | 'error';
  error: string | null;
  events: EventRow[];
  topEvents: TopEventRow[];
  loading: boolean;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  dateRange: { from: string; to: string } | null;
  setDateRange: (range: { from: string; to: string } | null) => void;
};

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export function RealTimeProvider({ children }: { children: ReactNode }) {
  const [isRealTimeEnabled, setRealTimeEnabled] = useState(false);
  const [status, setStatus] = useState<RealTimeContextType['status']>('disabled');
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [topEvents, setTopEvents] = useState<TopEventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  // Calculate top events from events array
  const calculateTopEvents = (eventsData: EventRow[]): TopEventRow[] => {
    const grouped = eventsData.reduce((acc: any, e: EventRow) => {
      const key = e.event_name;
      if (!acc[key]) {
        acc[key] = { count: 0, last_seen: e.created_at };
      }

      acc[key].count += 1;
      if (e.created_at > acc[key].last_seen) {
        acc[key].last_seen = e.created_at;
      }

      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([event_name, v]: any) => ({
        event_name,
        count: v.count,
        last_seen: v.last_seen,
      }))
      .sort((a, b) => b.count - a.count);
  };

  // Load initial data when real-time is enabled
  useEffect(() => {
    if (!isRealTimeEnabled) {
      return;
    }
    if (!isSupabaseConfigured) {
      setStatus('missing_config');
      setError('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
      return;
    }
    if (!projectId) {
      setStatus('missing_project');
      setError('Missing project id (API key lookup failed)');
      return;
    }

    const loadInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('events')
          .select('event_name, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (dateRange) {
          query = query
            .gte('created_at', toIsoStartUtc(dateRange.from))
            .lte('created_at', toIsoEndUtc(dateRange.to));
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching initial data:', error);
          setStatus('error');
          setError(error.message || 'Failed to fetch initial data');
          return;
        }

        const eventsData = (data || []).filter((e: any) => e?.event_name && e?.created_at);
        setEvents(eventsData);
        setTopEvents(calculateTopEvents(eventsData));
      } catch (error) {
        console.error('Error in loadInitialData:', error);
        setStatus('error');
        setError(error instanceof Error ? error.message : 'Failed to fetch initial data');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [isRealTimeEnabled, projectId, dateRange]);

  // Set up real-time subscription
  useEffect(() => {
    if (!isRealTimeEnabled) {
      // Clean up existing subscription
      if (channel) {
        supabase.removeChannel(channel);
        setChannel(null);
      }
      setStatus('disabled');
      setError(null);
      return;
    }

    if (!isSupabaseConfigured) {
      if (channel) {
        supabase.removeChannel(channel);
        setChannel(null);
      }
      setStatus('missing_config');
      setError('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
      return;
    }

    if (!projectId) {
      if (channel) {
        supabase.removeChannel(channel);
        setChannel(null);
      }
      setStatus('missing_project');
      setError('Missing project id (API key lookup failed)');
      return;
    }

    // Create a new channel for real-time updates
    setStatus('connecting');
    setError(null);
    const newChannel = supabase
      .channel(`events:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'events',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const newEvent = payload.new as any;
          
          // Check if event matches date range filter
          if (dateRange) {
            const eventMs = new Date(newEvent.created_at).getTime();
            const fromMs = new Date(toIsoStartUtc(dateRange.from)).getTime();
            const toMs = new Date(toIsoEndUtc(dateRange.to)).getTime();

            if (eventMs < fromMs || eventMs > toMs) {
              return; // Skip events outside date range
            }
          }

          if (newEvent.event_name && newEvent.created_at) {
            setEvents((prev) => {
              const updated = [newEvent, ...prev];
              setTopEvents(calculateTopEvents(updated));
              return updated;
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscription active');
          setStatus('subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error');
          setStatus('error');
          setError('Channel error (check Realtime replication + RLS)');
        } else if (status === 'TIMED_OUT') {
          console.error('Real-time subscription timed out');
          setStatus('error');
          setError('Timed out (check network / Supabase URL)');
        }
      });

    setChannel(newChannel);

    // Cleanup on unmount or when dependencies change
    return () => {
      supabase.removeChannel(newChannel);
    };
  }, [isRealTimeEnabled, projectId, dateRange]);

  return (
    <RealTimeContext.Provider
      value={{
        isConfigured: isSupabaseConfigured,
        isRealTimeEnabled,
        setRealTimeEnabled,
        status,
        error,
        events,
        topEvents,
        loading,
        projectId,
        setProjectId,
        dateRange,
        setDateRange,
      }}
    >
      {children}
    </RealTimeContext.Provider>
  );
}

export function useRealTime() {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
}
