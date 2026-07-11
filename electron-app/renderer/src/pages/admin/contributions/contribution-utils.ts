export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export function formatDate(value: string): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric', month: 'short', day: '2-digit',
  }).format(new Date(`${value}T00:00:00`));
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export function statusLabel(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}
