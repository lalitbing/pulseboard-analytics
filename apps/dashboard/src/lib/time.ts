// All reporting (day buckets, "today", date ranges, timestamps) uses Indian Standard Time,
// matching the backend's day boundaries in convex/lib.ts.
export const REPORT_TIME_ZONE = 'Asia/Kolkata';

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: REPORT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// YYYY-MM-DD of the IST calendar day containing `d`.
export const istDate = (d: Date) => dayFormatter.format(d);

// Formats a timestamp in IST.
export const formatIstDateTime = (d: Date, opts: Intl.DateTimeFormatOptions = {}) =>
  d.toLocaleString(undefined, { ...opts, timeZone: REPORT_TIME_ZONE });

// Formats a bare `YYYY-MM-DD` day label. The string is already an IST day, so format it as-is
// (parsing gives UTC midnight; formatting in UTC avoids shifting it to another day).
export const formatDayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
};

// ISO-8601 timestamp written in IST, e.g. 2026-09-25T01:18:47.763+05:30.
export const toIstIso = (iso: string) => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms + (5 * 60 + 30) * 60 * 1000).toISOString().replace('Z', '+05:30');
};
