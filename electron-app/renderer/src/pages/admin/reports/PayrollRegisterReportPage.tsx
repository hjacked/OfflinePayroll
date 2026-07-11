import { useCallback, useEffect, useState } from 'react';
import type { PayrollRegisterReport, ReportFilters } from '../../../models/Reports';
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

export default function PayrollRegisterReportPage() {
  const { options, error: optionsError } = useReportOptions();
  const [filters, setFilters] = useState<ReportFilters>({ ...emptyReportFilters });
  const [report, setReport] = useState<PayrollRegisterReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await window.api.report.payrollRegister(filters));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load payroll register report.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, []);

  const exportCsv = () => {
    if (!report) return;
    downloadCsv('payroll-register', [
      'Period', 'Payment Date', 'Status', 'Employee Number', 'Employee Name', 'Department',
      'Basic Pay', 'Overtime', 'Night Differential', 'Other Earnings', 'Gross Income',
      'Attendance Deductions', 'Other Deductions', 'Government Deductions',
      'Employer Contributions', 'Total Deductions', 'Net Pay', 'Validation',
    ], report.rows.map((row) => [
      row.period_name, row.payment_date, row.workflow_status, row.employee_number,
      row.employee_name, row.department, row.period_basic_pay, row.overtime_pay,
      row.night_differential_pay, row.other_earnings, row.gross_income,
      row.attendance_deductions, row.other_deductions, row.government_deductions,
      row.employer_contributions, row.total_deductions, row.net_pay, row.validation_status,
    ]));
  };

  return (
    <section className="reports-page reports-print-area">
      <ReportHeading
        eyebrow="Payroll report"
        title="Payroll Register"
        description="Detailed employee payroll results across one or more payroll periods."
        onCsv={exportCsv}
        onPdf={async () => setNotice(await saveCurrentReportPdf('payroll-register'))}
      />
      <ReportError message={error || optionsError} />
      <ReportNotice message={notice} />
      <ReportFiltersBar filters={filters} onChange={setFilters} options={options} onRefresh={() => void load()} />

      {loading ? <ReportEmpty>Loading payroll register…</ReportEmpty> : report && (
        <>
          <div className="reports-summary-grid">
            <article><span>Basic pay</span><strong>{formatCurrency(report.totals.period_basic_pay)}</strong></article>
            <article><span>Gross payroll</span><strong>{formatCurrency(report.totals.gross_income)}</strong></article>
            <article><span>Total deductions</span><strong>{formatCurrency(report.totals.total_deductions)}</strong></article>
            <article><span>Net payroll</span><strong>{formatCurrency(report.totals.net_pay)}</strong></article>
          </div>
          <div className="reports-panel">
            {report.rows.length === 0 ? <ReportEmpty /> : (
              <div className="reports-table-wrap"><table className="reports-table reports-table--wide"><thead><tr><th>Period</th><th>Employee</th><th>Department</th><th>Basic</th><th>OT / ND</th><th>Other earnings</th><th>Gross</th><th>Attendance</th><th>Other deductions</th><th>Government</th><th>Total deductions</th><th>Employer share</th><th>Net pay</th><th>Status</th></tr></thead><tbody>{report.rows.map((row) => (
                <tr key={`${row.period_id}-${row.employee_id}`}><td><strong>{row.period_name}</strong><span>{formatDate(row.payment_date)}</span></td><td><strong>{row.employee_name}</strong><span>{row.employee_number}</span></td><td>{row.department || 'Unassigned'}</td><td>{formatCurrency(row.period_basic_pay)}</td><td>{formatCurrency(row.overtime_pay + row.night_differential_pay)}</td><td>{formatCurrency(row.other_earnings)}</td><td>{formatCurrency(row.gross_income)}</td><td>{formatCurrency(row.attendance_deductions)}</td><td>{formatCurrency(row.other_deductions)}</td><td>{formatCurrency(row.government_deductions)}</td><td>{formatCurrency(row.total_deductions)}</td><td>{formatCurrency(row.employer_contributions)}</td><td><strong>{formatCurrency(row.net_pay)}</strong></td><td><span className={`reports-status reports-status--${row.workflow_status}`}>{formatStatus(row.workflow_status)}</span><span>{formatStatus(row.validation_status)}</span></td></tr>
              ))}</tbody><tfoot><tr><th colSpan={3}>Totals</th><th>{formatCurrency(report.totals.period_basic_pay)}</th><th>{formatCurrency(report.totals.overtime_pay + report.totals.night_differential_pay)}</th><th>{formatCurrency(report.totals.other_earnings)}</th><th>{formatCurrency(report.totals.gross_income)}</th><th>{formatCurrency(report.totals.attendance_deductions)}</th><th>{formatCurrency(report.totals.other_deductions)}</th><th>{formatCurrency(report.totals.government_deductions)}</th><th>{formatCurrency(report.totals.total_deductions)}</th><th>{formatCurrency(report.totals.employer_contributions)}</th><th>{formatCurrency(report.totals.net_pay)}</th><th /></tr></tfoot></table></div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
