import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  Payslip,
  PayslipFilters,
  PayslipOptions,
  PayslipSummary,
} from '../../../models/Payslip';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  statusLabel,
} from './payslip-utils';

const emptySummary: PayslipSummary = {
  total: 0,
  draft: 0,
  published: 0,
  downloaded: 0,
  gross_income: 0,
  total_deductions: 0,
  net_pay: 0,
};

export default function PayslipsPage() {
  const navigate = useNavigate();
  const [options, setOptions] = useState<PayslipOptions>({ periods: [], employees: [] });
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [summary, setSummary] = useState<PayslipSummary>(emptySummary);
  const [filters, setFilters] = useState<PayslipFilters>({ status: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [optionResult, listResult, summaryResult] = await Promise.all([
        window.api.payslip.options(),
        window.api.payslip.list(filters),
        window.api.payslip.summary(filters),
      ]);
      setOptions(optionResult);
      setPayslips(listResult.data);
      setSummary(summaryResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load payslips.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="payslip-page">
      <div className="payslip-heading">
        <div>
          <span>Payroll documents</span>
          <h1>Payslips</h1>
          <p>Generate, review, publish, print, and download employee payslips.</p>
        </div>
        <div className="payslip-heading__actions">
          <Link className="payslip-button payslip-button--secondary" to="/admin/payslips/publish">
            Publication queue
          </Link>
          <Link className="payslip-button" to="/admin/payslips/generate">
            Generate payslips
          </Link>
        </div>
      </div>

      {error && <div className="payslip-alert payslip-alert--error">{error}</div>}

      <div className="payslip-summary-grid">
        <article><span>Total payslips</span><strong>{summary.total}</strong><small>generated records</small></article>
        <article><span>Published</span><strong>{summary.published}</strong><small>available to employees</small></article>
        <article><span>Draft</span><strong>{summary.draft}</strong><small>awaiting publication</small></article>
        <article><span>Downloaded</span><strong>{summary.downloaded}</strong><small>payslips with download history</small></article>
        <article><span>Net pay total</span><strong>{formatCurrency(summary.net_pay)}</strong><small>within current filters</small></article>
      </div>

      <div className="payslip-panel payslip-filter-panel">
        <label>
          <span>Search</span>
          <input
            value={filters.query || ''}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Reference, employee, or period"
          />
        </label>
        <label>
          <span>Payroll period</span>
          <select
            value={filters.period_id || ''}
            onChange={(event) => setFilters((current) => ({ ...current, period_id: event.target.value }))}
          >
            <option value="">All periods</option>
            {options.periods.map((period) => (
              <option key={period.id} value={period.id}>{period.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Employee</span>
          <select
            value={filters.employee_id || ''}
            onChange={(event) => setFilters((current) => ({ ...current, employee_id: event.target.value }))}
          >
            <option value="">All employees</option>
            {options.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_number} — {employee.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={filters.status || 'all'}
            onChange={(event) => setFilters((current) => ({
              ...current,
              status: event.target.value as PayslipFilters['status'],
            }))}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <button
          type="button"
          className="payslip-button payslip-button--ghost"
          onClick={() => setFilters({ status: 'all' })}
        >
          Reset
        </button>
      </div>

      <div className="payslip-panel">
        <div className="payslip-panel__header">
          <div>
            <h2>Payslip directory</h2>
            <p>{payslips.length} record{payslips.length === 1 ? '' : 's'} shown.</p>
          </div>
        </div>
        {loading ? (
          <div className="payslip-empty">Loading payslips…</div>
        ) : payslips.length === 0 ? (
          <div className="payslip-empty">
            No payslips match the selected filters. Generate payslips from a finalized payroll period.
          </div>
        ) : (
          <div className="payslip-table-wrap">
            <table className="payslip-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Payroll period</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Net pay</th>
                  <th>Downloads</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {payslips.map((payslip) => (
                  <tr key={payslip.id}>
                    <td>
                      <strong>{payslip.employee_name}</strong>
                      <span>{payslip.employee_number} · {payslip.department || 'No department'}</span>
                    </td>
                    <td>
                      <strong>{payslip.period_name}</strong>
                      <span>Paid {formatDate(payslip.payment_date)}</span>
                    </td>
                    <td><code>{payslip.reference_number}</code></td>
                    <td>
                      <span className={`payslip-status payslip-status--${payslip.status}`}>
                        {statusLabel(payslip.status)}
                      </span>
                    </td>
                    <td><strong>{formatCurrency(payslip.net_pay)}</strong></td>
                    <td>
                      <strong>{payslip.download_count}</strong>
                      <span>{payslip.last_downloaded_at ? formatDateTime(payslip.last_downloaded_at) : 'Never'}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="payslip-link-button"
                        onClick={() => navigate(`/admin/payslips/${payslip.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
