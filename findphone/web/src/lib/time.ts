/** `just now`, `9 s ago`, `18 min ago`, `2 h ago`, `3 d ago` (same wording as the mobile app). */
export function formatAgo(t: Date, now: Date): string {
  const s = Math.max(0, Math.floor((now.getTime() - t.getTime()) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

const exact = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'short',
});

/** `08 Oct, 14:32:10 GMT+5:30` in the viewer's time zone. No year: records expire after 7 days. */
export function formatExact(t: Date): string {
  return exact.format(t);
}
