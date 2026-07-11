import type {
  LeaveDurationType,
  LeaveRequestStatus,
} from '../../../models/Leave';

export const leaveStatusOptions: Array<{
  value: LeaveRequestStatus;
  label: string;
}> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const leaveDurationOptions: Array<{
  value: LeaveDurationType;
  label: string;
}> = [
  { value: 'full-day', label: 'Full day' },
  { value: 'half-day-am', label: 'Half day — morning' },
  { value: 'half-day-pm', label: 'Half day — afternoon' },
];

export function currentYearRange(): { dateFrom: string; dateTo: string } {
  const year = new Date().getFullYear();
  return {
    dateFrom: `${year}-01-01`,
    dateTo: `${year}-12-31`,
  };
}

export function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string): string {
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatDays(value: number): string {
  const rounded = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function getLeaveStatusLabel(status: LeaveRequestStatus): string {
  return leaveStatusOptions.find((item) => item.value === status)?.label ?? status;
}

export function getLeaveDurationLabel(duration: LeaveDurationType): string {
  return leaveDurationOptions.find((item) => item.value === duration)?.label ?? duration;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}
