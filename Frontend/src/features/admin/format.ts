/** Date helpers for the admin screens (times shown in the staff member's own time zone). */

const dateTime = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const calendar = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
/** "2026-12-01" → "1 Dec 2026", never shifted by time zone. */
export const formatCalendarDate = (isoDate: string) =>
  calendar.format(new Date(`${isoDate}T00:00:00Z`));

/** Date → value (with seconds) for <input type="datetime-local" step="1"> in the browser's time zone. */
export function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** <input type="datetime-local"> value (local time) → ISO 8601 in UTC. */
export function fromLocalInputValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export const placeText = (p: { city: string; countryCode: string }) =>
  `${p.city}, ${p.countryCode}`;
