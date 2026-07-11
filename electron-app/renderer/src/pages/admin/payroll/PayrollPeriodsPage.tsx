import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PayrollPeriod, PayrollWorkflowStatus } from '../../../models/PayrollPeriod';
import { formatCurrency, formatDate, statusLabel } from './payroll-utils';

export default function PayrollPeriodsPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PayrollWorkflowStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await window.api.payroll.list({ query, status });
      setPeriods(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load payroll periods.');
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => periods.reduce((current, period) => ({
    periods: current.periods + 1,
    employees: current.employees + period.employee_count,
    gross: current.gross + period.gross_total,
    net: current.net + period.net_total,
  }), { periods: 0, employees: 0, gross: 0, net: 0 }), [periods]);

  return (
    <section className="payroll-page">
      <div className="payroll-heading">
        <div>
          <span>Payroll workspace</span>
          <h2>Payroll Processing</h2>
          <p>Create payroll periods, calculate employee results, validate exceptions, approve, finalize, and lock payroll.</p>
        </div>
        <Link className="payroll-button payroll-button--primary" to="/admin/payroll/new">New payroll period</Link>
      </div>

      {error && <div className="payroll-alert payroll-alert--error">{error}</div>}

      <div className="payroll-summary-grid">
        <article><span>Periods shown</span><strong>{summary.periods}</strong><small>matching current filters</small></article>
        <article><span>Employees</span><strong>{summary.employees}</strong><small>calculated employee results</small></article>
        <article><span>Gross payroll</span><strong>{formatCurrency(summary.gross)}</strong><small>calculated periods</small></article>
        <article><span>Net payroll</span><strong>{formatCurrency(summary.net)}</strong><small>after deductions</small></article>
      </div>

      <div className="payroll-panel">
        <div className="payroll-toolbar payroll-toolbar--wrap">
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Period name or frequency" />
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as PayrollWorkflowStatus | 'all')}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="calculated">Calculated</option>
              <option value="approved">Approved</option>
              <option value="finalized">Finalized</option>
              <option value="locked">Locked</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
          <button type="button" className="payroll-button" onClick={() => void load()}>Refresh</button>
        </div>

        {loading ? (
          <div className="payroll-empty">Loading payroll periods…</div>
        ) : periods.length === 0 ? (
          <div className="payroll-empty">No payroll periods match the selected filters.</div>
        ) : (
          <div className="payroll-table-wrap">
            <table className="payroll-table">
              <thead><tr><th>Period</th><th>Dates</th><th>Payment date</th><th>Employees</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Validation</th><th>Status</th></tr></thead>
              <tbody>{periods.map((period) => (
                <tr key={period.id}>
                  <td><Link to={`/admin/payroll/${period.id}`}><strong>{period.name}</strong></Link><span>{period.frequency}</span></td>
                  <td>{formatDate(period.start_date)}<span>to {formatDate(period.end_date)}</span></td>
                  <td>{formatDate(period.payment_date)}</td>
                  <td>{period.employee_count}</td>
                  <td>{formatCurrency(period.gross_total)}</td>
                  <td>{formatCurrency(period.deduction_total)}</td>
                  <td><strong>{formatCurrency(period.net_total)}</strong></td>
                  <td><span className={period.validation_error_count ? 'payroll-validation payroll-validation--error' : period.validation_warning_count ? 'payroll-validation payroll-validation--warning' : 'payroll-validation payroll-validation--ok'}>{period.validation_error_count} errors · {period.validation_warning_count} warnings</span></td>
                  <td><span className={`payroll-status payroll-status--${period.workflow_status}`}>{statusLabel(period.workflow_status)}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
