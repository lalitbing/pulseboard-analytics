import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const API_KEY = import.meta.env.VITE_API_KEY;

export const getEventStats = async (range: any) => {
  const q = new URLSearchParams(range).toString();

  const { data } = await axios.get(`${API}/stats/events?${q}`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });

  return data;
};

export const getTopEvents = async (range: any) => {
  const q = new URLSearchParams(range).toString();

  const { data } = await axios.get(`${API}/stats/top-events?${q}`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });

  return data;
};

export const trackEvent = async (eventName: string, useRedis: boolean = false) => {
  const { data } = await axios.post(
    `${API}/track`,
    { event: eventName, useRedis },
    {
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  return data;
};

export const getWorkerStatus = async () => {
  const { data } = await axios.get(`${API}/worker-status`, {
    headers: {
      'x-api-key': API_KEY,
    },
  });

  return data as { active: boolean; ttlSeconds: number | null; lastSeenMs: number | null };
};
