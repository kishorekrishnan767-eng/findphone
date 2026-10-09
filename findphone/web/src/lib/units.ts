export type Units = 'metric' | 'imperial';

/** "± 18 m" / "± 59 ft"; kilometres or miles past 1 000. */
export function formatDistance(m: number, units: Units): string {
  if (units === 'imperial') {
    const ft = m * 3.28084;
    return ft < 1000 ? `${Math.round(ft)} ft` : `${(m / 1609.344).toFixed(1)} mi`;
  }
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export function formatTemperature(c: number, units: Units): string {
  return units === 'imperial' ? `${Math.round((c * 9) / 5 + 32)}°F` : `${Math.round(c)}°C`;
}

const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const day = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZoneName: 'short' });

/** "07:49:16" */
export const formatClock = (t: Date) => time.format(t);

/** "09 Oct, GMT+5:30" */
export const formatDayZone = (t: Date) => day.format(t);

/** Accuracy → 1–4 signal bars (4 = within 20 m). */
export function accuracyBars(m: number): number {
  if (m <= 20) return 4;
  if (m <= 50) return 3;
  if (m <= 200) return 2;
  return 1;
}
