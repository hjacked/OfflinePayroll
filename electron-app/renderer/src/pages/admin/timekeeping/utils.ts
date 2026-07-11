import type { AttendanceStatus } from '../../../models/Attendance';

export const attendanceStatusOptions: Array<{
  value: AttendanceStatus;
  label: string;
}> = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'leave', label: 'On leave' },
  { value: 'rest-day', label: 'Rest day' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'official-business', label: 'Official business' },
  { value: 'work-from-home', label: 'Work from home' },
  { value: 'incomplete', label: 'Incomplete' },
];

export function getAttendanceStatusLabel(status: string): string {
  return attendanceStatusOptions.find((option) => option.value === status)?.label
    ?? status
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
}

export function formatDate(value: string): string {
  if (!value) return '—';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsed);
}

export function formatHours(value: number): string {
  return Number(value || 0).toFixed(2);
}

export function getErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}

export function todayDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function currentMonthRange(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toLocalIso = (date: Date) => {
    const offset = date.getTimezoneOffset();
    return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
  };
  return { dateFrom: toLocalIso(first), dateTo: toLocalIso(last) };
}
