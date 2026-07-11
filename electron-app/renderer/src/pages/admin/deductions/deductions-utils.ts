import type {
  DeductionCategory,
  DeductionTransactionStatus,
  LoanStatus,
} from '../../../models/Deductions';

export const deductionCategories: Array<{ value: DeductionCategory; label: string }> = [
  { value: 'loan', label: 'Loan' },
  { value: 'statutory', label: 'Statutory' },
  { value: 'company', label: 'Company Deduction' },
  { value: 'advance', label: 'Cash Advance' },
  { value: 'penalty', label: 'Penalty or Recovery' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'other', label: 'Other Deduction' },
];

export function categoryLabel(value: DeductionCategory): string {
  return deductionCategories.find((item) => item.value === value)?.label ?? value;
}

export function statusLabel(value: DeductionTransactionStatus | LoanStatus): string {
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
