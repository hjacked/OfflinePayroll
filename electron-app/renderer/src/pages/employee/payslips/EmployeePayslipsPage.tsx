import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Payslip } from '../../../models/Payslip';
import { formatCurrency, formatDate } from '../../admin/payslips/payslip-utils';

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.api.selfService.payslips().then((result) => setPayslips(result.data)).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load published payslips.');
    }).finally(() => setLoading(false));
  }, []);

  return <section className="payslip-page employee-payslip-page"><div className="payslip-heading"><div><span>Employee self-service</span><h1>My Payslips</h1><p>View, print, and download your published payroll documents.</p></div></div>{error && <div className="payslip-alert payslip-alert--error">{error}</div>}<div className="payslip-panel">{loading ? <div className="payslip-empty">Loading published payslips…</div> : payslips.length === 0 ? <div className="payslip-empty">No published payslips are available.</div> : <div className="employee-payslip-grid">{payslips.map((payslip) => <article className="employee-payslip-card" key={payslip.id}><div><span>{payslip.period_name}</span><strong>{formatCurrency(payslip.net_pay)}</strong><small>Net pay</small></div><dl><div><dt>Payment date</dt><dd>{formatDate(payslip.payment_date)}</dd></div><div><dt>Gross income</dt><dd>{formatCurrency(payslip.gross_income)}</dd></div><div><dt>Deductions</dt><dd>{formatCurrency(payslip.total_deductions)}</dd></div><div><dt>Reference</dt><dd>{payslip.reference_number}</dd></div></dl><Link className="payslip-button payslip-button--full" to={`/employee/payslips/${payslip.id}`}>View payslip</Link></article>)}</div>}</div></section>;
}
