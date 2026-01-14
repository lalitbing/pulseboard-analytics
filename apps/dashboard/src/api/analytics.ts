import axios from 'axios';

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const API_KEY = import.meta.env.VITE_API_KEY;

export const getEventStats = async (range: any) => {
  const q = new URLSearchParams(range).toString();

  const { data } = await axios.get(
    `${API}/stats/events?${q}`,
    {
      headers: {
        "x-api-key": API_KEY,
      },
    }
  );

  return data;
};

export const getTopEvents = async (range: any) => {
  const q = new URLSearchParams(range).toString();

  const { data } = await axios.get(
    `${API}/stats/top-events?${q}`,
    {
      headers: {
        "x-api-key": API_KEY,
      },
    }
  );

  return data;
};
