import { useEffect, useState } from 'react';
import type { EmployeePayrollHistoryRecord } from '../../../models/PayrollPeriod';

export default function EmployeePayrollHistoryPage() {
  const [history, setHistory] = useState<EmployeePayrollHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.api.selfService.payrollHistory().then((result) => setHistory(result.data)).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load payroll history.');
    }).finally(() => setLoading(false));
  }, []);

  return <section className="payroll-page employee-payroll-page"><div className="payroll-heading"><div><span>Employee self-service</span><h1>My Payroll History</h1><p>Review finalized payroll periods, earnings, deductions, and net pay.</p></div></div>{error && <div className="payroll-alert payroll-alert--error">{error}</div>}<div className="payroll-panel">{loading ? <div className="payroll-empty">Loading payroll history…</div> : history.length === 0 ? <div className="payroll-empty">No finalized payroll records are available.</div> : <div className="payroll-table-wrap"><table className="payroll-table"><thead><tr><th>Payroll period</th><th>Payment date</th><th>Gross income</th><th>Total deductions</th><th>Net pay</th><th>Status</th></tr></thead><tbody>{history.map((record) => <tr key={record.id}><td><strong>{record.period_name}</strong><span>{date(record.start_date)} to {date(record.end_date)}</span></td><td>{date(record.payment_date)}</td><td>{money(record.gross_income)}</td><td>{money(record.total_deductions)}</td><td><strong>{money(record.net_pay)}</strong></td><td><span className={`payroll-status payroll-status--${record.workflow_status}`}>{title(record.workflow_status)}</span></td></tr>)}</tbody></table></div>}</div></section>;
}
function money(value: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0)); }
function date(value: string) { if (!value) return '—'; return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`)); }
function title(value: string) { return value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' '); }
