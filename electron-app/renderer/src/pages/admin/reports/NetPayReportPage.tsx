import { useCallback, useEffect, useState } from 'react';
import type { NetPayReport, ReportFilters } from '../../../models/Reports';
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

export default function NetPayReportPage() {
  const { options, error: optionsError } = useReportOptions();
  const [filters, setFilters] = useState<ReportFilters>({ ...emptyReportFilters });
  const [report, setReport] = useState<NetPayReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await window.api.report.netPay(filters));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load net-pay report.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, []);

  const exportCsv = () => {
    if (!report) return;
    downloadCsv('net-pay-report', [
      'Period', 'Payment Date', 'Status', 'Employee Number', 'Employee Name',
      'Department', 'Gross Income', 'Total Deductions', 'Net Pay', 'Validation',
    ], report.rows.map((row) => [
      row.period_name, row.payment_date, row.workflow_status, row.employee_number,
      row.employee_name, row.department, row.gross_income, row.total_deductions,
      row.net_pay, row.validation_status,
    ]));
  };

  return (
    <section className="reports-page reports-print-area">
      <ReportHeading
        eyebrow="Payroll report"
        title="Net Pay Report"
        description="Employee gross income, total deductions, and final net-pay amounts."
        onCsv={exportCsv}
        onPdf={async () => setNotice(await saveCurrentReportPdf('net-pay-report'))}
      />
      <ReportError message={error || optionsError} />
      <ReportNotice message={notice} />
      <ReportFiltersBar filters={filters} onChange={setFilters} options={options} onRefresh={() => void load()} />

      {loading ? <ReportEmpty>Loading net-pay report…</ReportEmpty> : report && (
        <>
          <div className="reports-summary-grid reports-summary-grid--compact">
            <article><span>Employee records</span><strong>{report.totals.employees}</strong></article>
            <article><span>Gross payroll</span><strong>{formatCurrency(report.totals.gross_income)}</strong></article>
            <article><span>Total deductions</span><strong>{formatCurrency(report.totals.total_deductions)}</strong></article>
            <article><span>Net payroll</span><strong>{formatCurrency(report.totals.net_pay)}</strong></article>
          </div>
          <div className="reports-panel">
            {report.rows.length === 0 ? <ReportEmpty /> : (
              <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Period</th><th>Employee</th><th>Department</th><th>Gross income</th><th>Total deductions</th><th>Net pay</th><th>Payroll status</th><th>Validation</th></tr></thead><tbody>{report.rows.map((row) => (
                <tr key={`${row.period_id}-${row.employee_id}`}><td><strong>{row.period_name}</strong><span>{formatDate(row.payment_date)}</span></td><td><strong>{row.employee_name}</strong><span>{row.employee_number}</span></td><td>{row.department || 'Unassigned'}</td><td>{formatCurrency(row.gross_income)}</td><td>{formatCurrency(row.total_deductions)}</td><td><strong>{formatCurrency(row.net_pay)}</strong></td><td><span className={`reports-status reports-status--${row.workflow_status}`}>{formatStatus(row.workflow_status)}</span></td><td><span className={`reports-validation reports-validation--${row.validation_status}`}>{formatStatus(row.validation_status)}</span></td></tr>
              ))}</tbody></table></div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
