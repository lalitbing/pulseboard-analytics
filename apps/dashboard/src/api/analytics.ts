import axios from 'axios';
import { emitToast } from '../lib/toastBus';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const API_KEY = import.meta.env.VITE_API_KEY;

const SLOW_API_MS = 10_000;
const SLOW_TOAST_THROTTLE_MS = 60_000;
let lastSlowToastAt = 0;

function maybeEmitSlowApiToast() {
  if (!import.meta.env.PROD) return;
  const now = Date.now();
  if (now - lastSlowToastAt < SLOW_TOAST_THROTTLE_MS) return;
  lastSlowToastAt = now;
  emitToast({
    kind: 'error',
    title: 'Server waking up…',
    message: 'Our API may be asleep due to inactivity (onRender). It usually cold starts ~1min. Please wait.',
    ttlMs: 8000,
  });
}

type AxiosConfigWithMeta = Parameters<(typeof axios)['get']>[1] & {
  __pulseboardSlowTimer?: number;
};

const client = axios.create();

client.interceptors.request.use((config) => {
  if (!import.meta.env.PROD) return config;
  const cfg = config as typeof config & AxiosConfigWithMeta;
  cfg.__pulseboardSlowTimer = globalThis.setTimeout(() => {
    maybeEmitSlowApiToast();
  }, SLOW_API_MS) as unknown as number;
  return cfg;
});

client.interceptors.response.use(
  (res) => {
    const cfg = res.config as typeof res.config & AxiosConfigWithMeta;
    if (cfg.__pulseboardSlowTimer) globalThis.clearTimeout(cfg.__pulseboardSlowTimer);
    return res;
  },
  (err) => {
    const cfg = (err?.config ?? null) as (typeof err.config & AxiosConfigWithMeta) | null;
    if (cfg?.__pulseboardSlowTimer) globalThis.clearTimeout(cfg.__pulseboardSlowTimer);
    return Promise.reject(err);
  }
);

export const getEventStats = async (range: any) => {
  const q = new URLSearchParams(range).toString();

  const { data } = await client.get(`${API}/stats/events?${q}`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });

  return data;
};

export const getTopEvents = async (range: any) => {
  const q = new URLSearchParams(range).toString();

  const { data } = await client.get(`${API}/stats/top-events?${q}`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });

  return data;
};

export const trackEvent = async (
  eventName: string,
  useRedis: boolean = false,
  properties?: Record<string, unknown>
) => {
  const { data } = await client.post(
    `${API}/track`,
    { event: eventName, useRedis, properties },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  return data;
};

export const getWorkerStatus = async (signal?: AbortSignal) => {
  // Cache-bust to avoid browser 304s for this dynamic endpoint.
  const url = `${API}/worker-status?_=${Date.now()}`;
  const res = await client.get(url, {
    headers: {
      'x-api-key': API_KEY,
    },
    signal,
    // Treat 304 as a "no update" response (some environments may still return it).
    validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
  });

  if (res.status === 304) return null;
  return res.data as { active: boolean; ttlSeconds: number | null; lastSeenMs: number | null };
};
