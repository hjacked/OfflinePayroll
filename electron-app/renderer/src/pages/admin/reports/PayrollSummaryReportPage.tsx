import { useCallback, useEffect, useState } from 'react';
import type { PayrollSummaryReport, ReportFilters } from '../../../models/Reports';
import {
  downloadCsv,
  emptyReportFilters,
  formatCurrency,
  formatDate,
  formatStatus,
  ReportEmpty,
  ReportError,
  ReportFiltersBar,
  ReportHeading,
  ReportNotice,
  saveCurrentReportPdf,
  useReportOptions,
} from './reports-utils';

export default function PayrollSummaryReportPage() {
  const { options, error: optionsError } = useReportOptions();
  const [filters, setFilters] = useState<ReportFilters>({ ...emptyReportFilters });
  const [report, setReport] = useState<PayrollSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await window.api.report.payrollSummary(filters));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load payroll summary report.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, []);

  const exportCsv = () => {
    if (!report) return;
    const periodRows = report.periods.map((row) => [
      'Period', row.period_name, row.payment_date, row.workflow_status, row.employee_count,
      row.gross_income, row.total_deductions, row.employer_contributions, row.net_pay,
    ]);
    const departmentRows = report.departments.map((row) => [
      'Department', row.department, '', '', row.employee_count,
      row.gross_income, row.total_deductions, row.employer_contributions, row.net_pay,
    ]);
    downloadCsv('payroll-summary', [
      'Section', 'Name', 'Payment Date', 'Status', 'Employees', 'Gross Income',
      'Total Deductions', 'Employer Contributions', 'Net Pay',
    ], [...periodRows, ...departmentRows]);
  };

  return (
    <section className="reports-page reports-print-area">
      <ReportHeading
        eyebrow="Payroll report"
        title="Payroll Summary"
        description="Summary of payroll cost by payroll period and department."
        onCsv={exportCsv}
        onPdf={async () => setNotice(await saveCurrentReportPdf('payroll-summary'))}
      />
      <ReportError message={error || optionsError} />
      <ReportNotice message={notice} />
      <ReportFiltersBar filters={filters} onChange={setFilters} options={options} onRefresh={() => void load()} showEmployee={false} showQuery={false} />

      {loading ? <ReportEmpty>Loading payroll summary…</ReportEmpty> : report && (
        <>
          <div className="reports-summary-grid">
            <article><span>Employee records</span><strong>{report.totals.employee_records}</strong></article>
            <article><span>Gross payroll</span><strong>{formatCurrency(report.totals.gross_income)}</strong></article>
            <article><span>Total deductions</span><strong>{formatCurrency(report.totals.total_deductions)}</strong></article>
            <article><span>Net payroll</span><strong>{formatCurrency(report.totals.net_pay)}</strong></article>
          </div>

          <div className="reports-panel">
            <div className="reports-section-heading"><div><h3>Summary by payroll period</h3><p>Totals for every payroll period matching the selected filters.</p></div></div>
            {report.periods.length === 0 ? <ReportEmpty /> : (
              <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Payroll period</th><th>Payment date</th><th>Employees</th><th>Gross</th><th>Deductions</th><th>Employer share</th><th>Net pay</th><th>Status</th></tr></thead><tbody>{report.periods.map((row) => (
                <tr key={row.period_id}><td><strong>{row.period_name}</strong><span>{formatDate(row.start_date)} – {formatDate(row.end_date)}</span></td><td>{formatDate(row.payment_date)}</td><td>{row.employee_count}</td><td>{formatCurrency(row.gross_income)}</td><td>{formatCurrency(row.total_deductions)}</td><td>{formatCurrency(row.employer_contributions)}</td><td><strong>{formatCurrency(row.net_pay)}</strong></td><td><span className={`reports-status reports-status--${row.workflow_status}`}>{formatStatus(row.workflow_status)}</span></td></tr>
              ))}</tbody></table></div>
            )}
          </div>

          <div className="reports-panel">
            <div className="reports-section-heading"><div><h3>Summary by department</h3><p>Consolidated payroll cost across the selected periods.</p></div></div>
            {report.departments.length === 0 ? <ReportEmpty /> : (
              <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Department</th><th>Employees</th><th>Periods</th><th>Gross</th><th>Deductions</th><th>Employer share</th><th>Net pay</th></tr></thead><tbody>{report.departments.map((row) => (
                <tr key={row.department}><td><strong>{row.department}</strong></td><td>{row.employee_count}</td><td>{row.period_count}</td><td>{formatCurrency(row.gross_income)}</td><td>{formatCurrency(row.total_deductions)}</td><td>{formatCurrency(row.employer_contributions)}</td><td><strong>{formatCurrency(row.net_pay)}</strong></td></tr>
              ))}</tbody></table></div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
