import type { EarningCategory, EarningTransactionStatus } from '../../../models/Earnings';

export const earningCategories: Array<{ value: EarningCategory; label: string }> = [
  { value: 'allowance', label: 'Allowance' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'incentive', label: 'Incentive' },
  { value: 'commission', label: 'Commission' },
  { value: 'reimbursement', label: 'Reimbursement' },
  { value: 'adjustment', label: 'Salary Adjustment' },
  { value: 'other', label: 'Other Income' },
];

export function categoryLabel(value: EarningCategory): string {
  return earningCategories.find((item) => item.value === value)?.label ?? value;
}

export function statusLabel(value: EarningTransactionStatus): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthStart(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}
