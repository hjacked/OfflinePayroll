import { useEffect, useMemo, useState } from 'react';
import type { BankTransferReport } from '../../../models/Reports';
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

export default function BankTransferReportPage() {
  const { options, error: optionsError } = useReportOptions();
  const eligiblePeriods = useMemo(
    () => options.periods.filter((period) => period.workflow_status === 'finalized' || period.workflow_status === 'locked'),
    [options.periods],
  );
  const [periodId, setPeriodId] = useState('');
  const [report, setReport] = useState<BankTransferReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!periodId && eligiblePeriods.length) setPeriodId(eligiblePeriods[0].id);
  }, [eligiblePeriods, periodId]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await window.api.report.bankTransfer({ period_id: periodId }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load bank-transfer report.');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (!report) return;
    downloadCsv(`${report.period.name}-bank-transfer`, [
      'Employee Number', 'Employee Name', 'Department', 'Bank Name',
      'Bank Account', 'Net Pay', 'Ready',
    ], report.rows.map((row) => [
      row.employee_number, row.employee_name, row.department, row.bank_name,
      row.bank_account, row.net_pay, row.ready ? 'Yes' : 'No',
    ]));
  };

  return (
    <section className="reports-page reports-print-area">
      <ReportHeading
        eyebrow="Payment report"
        title="Bank Transfer Report"
        description="Prepare employee net-pay data and identify missing bank-account information before payment."
        onCsv={report ? exportCsv : undefined}
        onPdf={report ? async () => setNotice(await saveCurrentReportPdf('bank-transfer-report')) : undefined}
      />
      <ReportError message={error || optionsError} />
      <ReportNotice message={notice} />
      <div className="reports-toolbar reports-no-print">
        <label>Finalized payroll period<select value={periodId} onChange={(event) => { setPeriodId(event.target.value); setReport(null); }}><option value="">Select payroll period</option>{eligiblePeriods.map((period) => <option key={period.id} value={period.id}>{period.name} · {formatDate(period.payment_date)}</option>)}</select></label>
        <button type="button" className="reports-button reports-button--primary" onClick={() => void load()} disabled={!periodId || loading}>Generate report</button>
      </div>

      {loading ? <ReportEmpty>Preparing bank-transfer report…</ReportEmpty> : !report ? (
        <ReportEmpty>{eligiblePeriods.length ? 'Select a finalized or locked payroll period, then generate the report.' : 'No finalized or locked payroll periods are available.'}</ReportEmpty>
      ) : (
        <>
          <div className="reports-print-title"><strong>{report.period.name}</strong><span>Payment date: {formatDate(report.period.payment_date)}</span></div>
          <div className="reports-summary-grid reports-summary-grid--compact">
            <article><span>Employees</span><strong>{report.totals.employees}</strong></article>
            <article><span>Ready for transfer</span><strong>{report.totals.ready}</strong></article>
            <article><span>Missing accounts</span><strong className={report.totals.missing_accounts ? 'reports-danger' : ''}>{report.totals.missing_accounts}</strong></article>
            <article><span>Total net pay</span><strong>{formatCurrency(report.totals.net_pay)}</strong></article>
          </div>
          {report.totals.missing_accounts > 0 && <div className="reports-alert reports-alert--warning">Complete the missing bank-account information before using this report as a payment instruction.</div>}
          <div className="reports-panel">
            <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Employee</th><th>Department</th><th>Bank</th><th>Account number</th><th>Net pay</th><th>Readiness</th></tr></thead><tbody>{report.rows.map((row) => (
              <tr key={row.employee_id}><td><strong>{row.employee_name}</strong><span>{row.employee_number}</span></td><td>{row.department || 'Unassigned'}</td><td>{row.bank_name || '—'}</td><td>{row.bank_account || 'Missing'}</td><td><strong>{formatCurrency(row.net_pay)}</strong></td><td><span className={row.ready ? 'reports-validation reports-validation--ok' : 'reports-validation reports-validation--error'}>{row.ready ? 'Ready' : 'Missing account'}</span></td></tr>
            ))}</tbody><tfoot><tr><th colSpan={4}>Total transfer amount</th><th>{formatCurrency(report.totals.net_pay)}</th><th /></tr></tfoot></table></div>
          </div>
        </>
      )}
    </section>
  );
}
