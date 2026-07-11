import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReportFilters, ReportsDashboardData } from '../../../models/Reports';
import {
  emptyReportFilters,
  formatCurrency,
  formatDate,
  ReportEmpty,
  ReportError,
} from './reports-utils';

const reports = [
  { code: 'REG', title: 'Payroll Register', path: '/admin/reports/payroll-register', description: 'Employee-level gross income, deductions, employer contributions, and net pay.' },
  { code: 'SUM', title: 'Payroll Summary', path: '/admin/reports/payroll-summary', description: 'Payroll totals summarized by period and department.' },
  { code: 'ERN', title: 'Earnings Report', path: '/admin/reports/earnings', description: 'Basic pay, overtime, allowances, bonuses, commissions, and adjustments.' },
  { code: 'DED', title: 'Deductions Report', path: '/admin/reports/deductions', description: 'Attendance deductions, loans, recurring deductions, and employee contributions.' },
  { code: 'CON', title: 'Contribution Report', path: '/admin/reports/contributions', description: 'Employee and employer government contribution shares.' },
  { code: 'NET', title: 'Net Pay Report', path: '/admin/reports/net-pay', description: 'Employee net-pay listing with payroll status and validation results.' },
  { code: 'VAR', title: 'Payroll Variance', path: '/admin/reports/variance', description: 'Compare gross pay, deductions, and net pay across two payroll periods.' },
  { code: 'BNK', title: 'Bank Transfer Report', path: '/admin/reports/bank-transfer', description: 'Finalized payroll payment file with bank-account readiness checks.' },
];

export default function ReportsDashboardPage() {
  const [filters, setFilters] = useState<ReportFilters>({ ...emptyReportFilters });
  const [data, setData] = useState<ReportsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await window.api.report.dashboard(filters));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load payroll report summary.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, []); // Initial dashboard only; Apply button controls later refreshes.

  return (
    <section className="reports-page">
      <div className="reports-heading">
        <div>
          <span>Reporting workspace</span>
          <h2>Payroll Reports</h2>
          <p>Review payroll results, analyze movements, validate payment data, and export report-ready views.</p>
        </div>
      </div>

      <ReportError message={error} />

      <div className="reports-toolbar reports-no-print">
        <label>Payment date from<input type="date" value={filters.date_from ?? ''} onChange={(event) => setFilters({ ...filters, date_from: event.target.value })} /></label>
        <label>Payment date to<input type="date" value={filters.date_to ?? ''} onChange={(event) => setFilters({ ...filters, date_to: event.target.value })} /></label>
        <button type="button" className="reports-button reports-button--primary" onClick={() => void load()}>Apply dates</button>
        <button type="button" className="reports-button" onClick={() => setFilters({ ...emptyReportFilters })}>Reset</button>
      </div>

      {loading ? <ReportEmpty>Loading payroll-report summary…</ReportEmpty> : data && (
        <>
          <div className="reports-summary-grid">
            <article><span>Payroll periods</span><strong>{data.totals.periods}</strong><small>{data.totals.employee_records} employee records</small></article>
            <article><span>Gross payroll</span><strong>{formatCurrency(data.totals.gross_income)}</strong><small>before payroll deductions</small></article>
            <article><span>Total deductions</span><strong>{formatCurrency(data.totals.total_deductions)}</strong><small>employee deductions</small></article>
            <article><span>Net payroll</span><strong>{formatCurrency(data.totals.net_pay)}</strong><small>{data.totals.employees} unique employees</small></article>
          </div>

          <div className="reports-card-grid reports-no-print">
            {reports.map((report) => (
              <Link className="reports-card" key={report.path} to={report.path}>
                <span>{report.code}</span>
                <h3>{report.title}</h3>
                <p>{report.description}</p>
                <strong>Open report →</strong>
              </Link>
            ))}
          </div>

          <div className="reports-panel">
            <div className="reports-section-heading"><div><h3>Recent payroll periods</h3><p>Latest calculated periods included in the reporting database.</p></div></div>
            {data.recent_periods.length === 0 ? <ReportEmpty>No calculated payroll periods are available yet.</ReportEmpty> : (
              <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Payroll period</th><th>Payment date</th><th>Employees</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Status</th></tr></thead><tbody>{data.recent_periods.map((period) => (
                <tr key={period.id}><td><Link to={`/admin/payroll/${period.id}`}><strong>{period.name}</strong></Link><span>{formatDate(period.start_date)} – {formatDate(period.end_date)}</span></td><td>{formatDate(period.payment_date)}</td><td>{period.employee_count}</td><td>{formatCurrency(period.gross_total)}</td><td>{formatCurrency(period.deduction_total)}</td><td><strong>{formatCurrency(period.net_total)}</strong></td><td><span className={`reports-status reports-status--${period.workflow_status}`}>{period.workflow_status}</span></td></tr>
              ))}</tbody></table></div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
