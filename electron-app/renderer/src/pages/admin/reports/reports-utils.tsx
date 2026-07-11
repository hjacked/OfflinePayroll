import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type {
  ReportFilters,
  ReportOptions,
} from '../../../models/Reports';

export const emptyReportFilters: ReportFilters = {
  period_id: '',
  date_from: '',
  date_to: '',
  employee_id: '',
  department: '',
  status: 'all',
  query: '',
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatDate(value: string): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

export function formatStatus(value: string): string {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function fileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'payroll-report';
}

export function downloadCsv(
  name: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
): void {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${fileName(name)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function saveCurrentReportPdf(name: string): Promise<string> {
  const result = await window.api.report.exportPdf(fileName(name));
  return result.saved
    ? `PDF saved${result.filePath ? ` to ${result.filePath}` : ''}.`
    : 'PDF export was cancelled.';
}

export function useReportOptions(): {
  options: ReportOptions;
  loading: boolean;
  error: string;
} {
  const [options, setOptions] = useState<ReportOptions>({
    periods: [],
    employees: [],
    departments: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.api.report.options()
      .then(setOptions)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : 'Unable to load report filter options.');
      })
      .finally(() => setLoading(false));
  }, []);

  return { options, loading, error };
}

interface ReportHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  backTo?: string;
  onCsv?: () => void;
  onPdf?: () => Promise<void> | void;
  extraActions?: ReactNode;
}

export function ReportHeading({
  eyebrow,
  title,
  description,
  backTo = '/admin/reports',
  onCsv,
  onPdf,
  extraActions,
}: ReportHeadingProps) {
  return (
    <div className="reports-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="reports-actions reports-no-print">
        {extraActions}
        {onCsv && <button type="button" className="reports-button" onClick={onCsv}>Export CSV</button>}
        {onPdf && <button type="button" className="reports-button reports-button--primary" onClick={() => void onPdf()}>Save PDF</button>}
        {backTo && <Link className="reports-button" to={backTo}>Back</Link>}
      </div>
    </div>
  );
}

interface ReportFiltersBarProps {
  filters: ReportFilters;
  onChange: (filters: ReportFilters) => void;
  options: ReportOptions;
  onRefresh: () => void;
  showPeriod?: boolean;
  showEmployee?: boolean;
  showDepartment?: boolean;
  showStatus?: boolean;
  showDates?: boolean;
  showQuery?: boolean;
}

export function ReportFiltersBar({
  filters,
  onChange,
  options,
  onRefresh,
  showPeriod = true,
  showEmployee = true,
  showDepartment = true,
  showStatus = true,
  showDates = true,
  showQuery = true,
}: ReportFiltersBarProps) {
  const update = (key: keyof ReportFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="reports-toolbar reports-no-print">
      {showQuery && (
        <label>
          Search
          <input
            value={filters.query ?? ''}
            onChange={(event) => update('query', event.target.value)}
            placeholder="Employee, number, department, or period"
          />
        </label>
      )}
      {showPeriod && (
        <label>
          Payroll period
          <select value={filters.period_id ?? ''} onChange={(event) => update('period_id', event.target.value)}>
            <option value="">All periods</option>
            {options.periods.map((period) => (
              <option key={period.id} value={period.id}>{period.name} · {formatDate(period.payment_date)}</option>
            ))}
          </select>
        </label>
      )}
      {showEmployee && (
        <label>
          Employee
          <select value={filters.employee_id ?? ''} onChange={(event) => update('employee_id', event.target.value)}>
            <option value="">All employees</option>
            {options.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.name} · {employee.employee_number}</option>
            ))}
          </select>
        </label>
      )}
      {showDepartment && (
        <label>
          Department
          <select value={filters.department ?? ''} onChange={(event) => update('department', event.target.value)}>
            <option value="">All departments</option>
            {options.departments.map((department) => <option key={department} value={department}>{department}</option>)}
          </select>
        </label>
      )}
      {showStatus && (
        <label>
          Payroll status
          <select value={filters.status ?? 'all'} onChange={(event) => update('status', event.target.value)}>
            <option value="all">All statuses</option>
            <option value="calculated">Calculated</option>
            <option value="approved">Approved</option>
            <option value="finalized">Finalized</option>
            <option value="locked">Locked</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      )}
      {showDates && (
        <>
          <label>
            Payment date from
            <input type="date" value={filters.date_from ?? ''} onChange={(event) => update('date_from', event.target.value)} />
          </label>
          <label>
            Payment date to
            <input type="date" value={filters.date_to ?? ''} onChange={(event) => update('date_to', event.target.value)} />
          </label>
        </>
      )}
      <button type="button" className="reports-button reports-button--primary" onClick={onRefresh}>Apply filters</button>
      <button type="button" className="reports-button" onClick={() => onChange({ ...emptyReportFilters })}>Reset</button>
    </div>
  );
}

export function ReportError({ message }: { message: string }) {
  return message ? <div className="reports-alert reports-alert--error">{message}</div> : null;
}

export function ReportNotice({ message }: { message: string }) {
  return message ? <div className="reports-alert reports-alert--success">{message}</div> : null;
}

export function ReportEmpty({ children = 'No report records match the selected filters.' }: { children?: ReactNode }) {
  return <div className="reports-empty">{children}</div>;
}
