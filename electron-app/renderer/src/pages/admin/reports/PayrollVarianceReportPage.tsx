import { useEffect, useState } from 'react';
import type { PayrollVarianceInput, PayrollVarianceReport } from '../../../models/Reports';
import {
  downloadCsv,
  formatCurrency,
  formatDate,
  ReportEmpty,
  ReportError,
  ReportHeading,
  ReportNotice,
  saveCurrentReportPdf,
  useReportOptions,
} from './reports-utils';

function varianceClass(value: number): string {
  if (value > 0) return 'reports-variance reports-variance--positive';
  if (value < 0) return 'reports-variance reports-variance--negative';
  return 'reports-variance';
}

export default function PayrollVarianceReportPage() {
  const { options, error: optionsError } = useReportOptions();
  const [input, setInput] = useState<PayrollVarianceInput>({
    current_period_id: '',
    comparison_period_id: '',
    department: '',
    query: '',
  });
  const [report, setReport] = useState<PayrollVarianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!input.current_period_id && options.periods.length >= 2) {
      setInput((current) => ({
        ...current,
        current_period_id: options.periods[0].id,
        comparison_period_id: options.periods[1].id,
      }));
    }
  }, [input.current_period_id, options.periods]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await window.api.report.variance(input));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to compare payroll periods.');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    downloadCsv('payroll-variance-report', [
      'Employee Number', 'Employee Name', 'Department',
      `${report.comparison_period.name} Gross`, `${report.current_period.name} Gross`, 'Gross Variance',
      `${report.comparison_period.name} Deductions`, `${report.current_period.name} Deductions`, 'Deduction Variance',
      `${report.comparison_period.name} Net`, `${report.current_period.name} Net`, 'Net Variance',
    ], report.rows.map((row) => [
      row.employee_number, row.employee_name, row.department,
      row.comparison_gross, row.current_gross, row.gross_variance,
      row.comparison_deductions, row.current_deductions, row.deduction_variance,
      row.comparison_net, row.current_net, row.net_variance,
    ]));
  };

  return (
    <section className="reports-page reports-print-area">
      <ReportHeading
        eyebrow="Payroll analysis"
        title="Payroll Variance Report"
        description="Compare gross income, deductions, and net pay between two payroll periods."
        onCsv={report ? exportCsv : undefined}
        onPdf={report ? async () => setNotice(await saveCurrentReportPdf('payroll-variance-report')) : undefined}
      />
      <ReportError message={error || optionsError} />
      <ReportNotice message={notice} />

      <div className="reports-toolbar reports-no-print">
        <label>Current period<select value={input.current_period_id} onChange={(event) => setInput({ ...input, current_period_id: event.target.value })}><option value="">Select current period</option>{options.periods.map((period) => <option key={period.id} value={period.id}>{period.name} · {formatDate(period.payment_date)}</option>)}</select></label>
        <label>Comparison period<select value={input.comparison_period_id} onChange={(event) => setInput({ ...input, comparison_period_id: event.target.value })}><option value="">Select comparison period</option>{options.periods.map((period) => <option key={period.id} value={period.id}>{period.name} · {formatDate(period.payment_date)}</option>)}</select></label>
        <label>Department<select value={input.department ?? ''} onChange={(event) => setInput({ ...input, department: event.target.value })}><option value="">All departments</option>{options.departments.map((department) => <option key={department} value={department}>{department}</option>)}</select></label>
        <label>Search<input value={input.query ?? ''} onChange={(event) => setInput({ ...input, query: event.target.value })} placeholder="Employee name or number" /></label>
        <button type="button" className="reports-button reports-button--primary" onClick={() => void load()} disabled={loading}>Compare periods</button>
      </div>

      {loading ? <ReportEmpty>Comparing payroll periods…</ReportEmpty> : !report ? (
        <ReportEmpty>Select two payroll periods, then choose Compare periods.</ReportEmpty>
      ) : (
        <>
          <div className="reports-compare-heading">
            <article><span>Comparison period</span><strong>{report.comparison_period.name}</strong><small>{formatDate(report.comparison_period.payment_date)}</small></article>
            <span>versus</span>
            <article><span>Current period</span><strong>{report.current_period.name}</strong><small>{formatDate(report.current_period.payment_date)}</small></article>
          </div>
          <div className="reports-summary-grid reports-summary-grid--compact">
            <article><span>Gross variance</span><strong className={varianceClass(report.totals.gross_variance)}>{formatCurrency(report.totals.gross_variance)}</strong></article>
            <article><span>Deduction variance</span><strong className={varianceClass(report.totals.deduction_variance)}>{formatCurrency(report.totals.deduction_variance)}</strong></article>
            <article><span>Net-pay variance</span><strong className={varianceClass(report.totals.net_variance)}>{formatCurrency(report.totals.net_variance)}</strong></article>
          </div>
          <div className="reports-panel">
            {report.rows.length === 0 ? <ReportEmpty /> : (
              <div className="reports-table-wrap"><table className="reports-table reports-table--wide"><thead><tr><th>Employee</th><th>Department</th><th>Previous gross</th><th>Current gross</th><th>Gross change</th><th>Previous deductions</th><th>Current deductions</th><th>Deduction change</th><th>Previous net</th><th>Current net</th><th>Net change</th></tr></thead><tbody>{report.rows.map((row) => (
                <tr key={row.employee_id}><td><strong>{row.employee_name}</strong><span>{row.employee_number}</span></td><td>{row.department || 'Unassigned'}</td><td>{formatCurrency(row.comparison_gross)}</td><td>{formatCurrency(row.current_gross)}</td><td className={varianceClass(row.gross_variance)}>{formatCurrency(row.gross_variance)}</td><td>{formatCurrency(row.comparison_deductions)}</td><td>{formatCurrency(row.current_deductions)}</td><td className={varianceClass(row.deduction_variance)}>{formatCurrency(row.deduction_variance)}</td><td>{formatCurrency(row.comparison_net)}</td><td>{formatCurrency(row.current_net)}</td><td className={varianceClass(row.net_variance)}>{formatCurrency(row.net_variance)}</td></tr>
              ))}</tbody><tfoot><tr><th colSpan={2}>Totals</th><th>{formatCurrency(report.totals.comparison_gross)}</th><th>{formatCurrency(report.totals.current_gross)}</th><th className={varianceClass(report.totals.gross_variance)}>{formatCurrency(report.totals.gross_variance)}</th><th>{formatCurrency(report.totals.comparison_deductions)}</th><th>{formatCurrency(report.totals.current_deductions)}</th><th className={varianceClass(report.totals.deduction_variance)}>{formatCurrency(report.totals.deduction_variance)}</th><th>{formatCurrency(report.totals.comparison_net)}</th><th>{formatCurrency(report.totals.current_net)}</th><th className={varianceClass(report.totals.net_variance)}>{formatCurrency(report.totals.net_variance)}</th></tr></tfoot></table></div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
