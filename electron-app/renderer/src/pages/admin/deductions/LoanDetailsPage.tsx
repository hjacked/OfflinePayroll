import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { EmployeeLoan } from '../../../models/Deductions';
import { formatCurrency, formatDate, statusLabel, today } from './deductions-utils';

export default function LoanDetailsPage() {
  const { id = '' } = useParams();
  const [loan, setLoan] = useState<EmployeeLoan | null>(null);
  const [payment, setPayment] = useState({ amount: 0, transaction_date: today(), reference: '', notes: '', payroll_period_id: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function load() {
    try {
      const value = await window.api.loan.get(id);
      if (!value) throw new Error('Loan not found.');
      setLoan(value);
      setPayment((current) => ({ ...current, amount: Math.min(value.installment_amount, value.outstanding_balance) }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load loan.'); }
  }

  useEffect(() => { void load(); }, [id]);

  const paid = useMemo(() => loan ? loan.total_payable - loan.outstanding_balance : 0, [loan]);
  const progress = useMemo(() => loan && loan.total_payable > 0 ? Math.min(100, (paid / loan.total_payable) * 100) : 0, [loan, paid]);

  async function submitPayment(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('');
    try {
      await window.api.loan.recordPayment(id, payment);
      setSuccess('Loan payment recorded and allocated to the installment schedule.');
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to record payment.'); }
  }

  async function changeStatus(status: EmployeeLoan['status']) {
    try { await window.api.loan.setStatus(id, status); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update loan status.'); }
  }

  if (!loan) return <div className="deductions-empty-state">{error || 'Loading loan…'}</div>;

  return <section className="deductions-page">
    <div className="deductions-heading"><div><span>Loan details</span><h2>{loan.loan_number}</h2><p>{loan.employee_name} · {loan.deduction_name}</p></div><div className="deductions-heading__actions"><Link className="deductions-secondary-link" to="/admin/deductions/loans">Back to loans</Link>{loan.status === 'draft' && <Link className="deductions-secondary-link" to={`/admin/deductions/loans/${loan.id}/edit`}>Edit</Link>}</div></div>
    {error && <div className="deductions-alert deductions-alert--error">{error}</div>}
    {success && <div className="deductions-alert deductions-alert--success">{success}</div>}
    <div className="deductions-summary-grid">
      <article className="deductions-summary-card"><span>Principal</span><strong>{formatCurrency(loan.principal_amount)}</strong><small>{loan.interest_rate}% interest</small></article>
      <article className="deductions-summary-card"><span>Total payable</span><strong>{formatCurrency(loan.total_payable)}</strong><small>{loan.number_of_installments} installments</small></article>
      <article className="deductions-summary-card"><span>Paid</span><strong>{formatCurrency(paid)}</strong><small>{progress.toFixed(1)}% complete</small></article>
      <article className="deductions-summary-card"><span>Outstanding</span><strong>{formatCurrency(loan.outstanding_balance)}</strong><small>{statusLabel(loan.status)}</small></article>
    </div>
    <div className="deductions-detail-card"><div className="deductions-detail-card__header"><div><h3>Loan information</h3><p>Schedule and current repayment status.</p></div><span className={`deductions-status deductions-status--${loan.status}`}>{statusLabel(loan.status)}</span></div><div className="deductions-detail-grid">
      <div className="deductions-detail-item"><span>Employee</span><strong>{loan.employee_number} — {loan.employee_name}</strong></div>
      <div className="deductions-detail-item"><span>Loan type</span><strong>{loan.deduction_code} — {loan.deduction_name}</strong></div>
      <div className="deductions-detail-item"><span>Loan date</span><strong>{formatDate(loan.loan_date)}</strong></div>
      <div className="deductions-detail-item"><span>First deduction</span><strong>{formatDate(loan.first_deduction_date)}</strong></div>
      <div className="deductions-detail-item"><span>Frequency</span><strong>{loan.deduction_frequency}</strong></div>
      <div className="deductions-detail-item"><span>Installment amount</span><strong>{formatCurrency(loan.installment_amount)}</strong></div>
      <div className="deductions-detail-item" style={{ gridColumn: '1 / -1' }}><span>Progress</span><div className="deductions-progress"><span style={{ width: `${progress}%` }} /></div></div>
    </div></div>
    {(loan.status === 'active' || loan.status === 'suspended') && loan.outstanding_balance > 0 && <div className="deductions-form-card"><div className="deductions-form-card__header"><div><h3>Record payment</h3><p>Create an approved deduction and reduce the outstanding balance.</p></div></div><form className="deductions-form" onSubmit={submitPayment}><div className="deductions-form-grid deductions-form-grid--three">
      <label className="deductions-field"><span>Amount *</span><input type="number" min="0.01" max={loan.outstanding_balance} step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: Number(e.target.value) })} /></label>
      <label className="deductions-field"><span>Payment date *</span><input type="date" value={payment.transaction_date} onChange={(e) => setPayment({ ...payment, transaction_date: e.target.value })} /></label>
      <label className="deductions-field"><span>Reference</span><input value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} /></label>
    </div><label className="deductions-field"><span>Notes</span><textarea value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} /></label><div className="deductions-form-actions"><button className="deductions-button deductions-button--primary" type="submit">Record payment</button></div></form></div>}
    <div className="deductions-heading__actions">{loan.status === 'draft' && <button className="deductions-button deductions-button--primary" type="button" onClick={() => void changeStatus('active')}>Activate loan</button>}{loan.status === 'active' && <button className="deductions-button" type="button" onClick={() => void changeStatus('suspended')}>Suspend deductions</button>}{loan.status === 'suspended' && <button className="deductions-button deductions-button--primary" type="button" onClick={() => void changeStatus('active')}>Resume deductions</button>}</div>
    <div className="deductions-table-card"><div className="deductions-table-card__header"><div><h3>Installment schedule</h3><p>{loan.installments?.length ?? 0} scheduled installments.</p></div></div><div className="deductions-table-wrap"><table className="deductions-table"><thead><tr><th>No.</th><th>Due date</th><th>Amount due</th><th>Amount paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{(loan.installments ?? []).map((item) => <tr key={item.id}><td>{item.installment_number}</td><td>{formatDate(item.due_date)}</td><td>{formatCurrency(item.amount_due)}</td><td>{formatCurrency(item.amount_paid)}</td><td>{formatCurrency(Math.max(0, item.amount_due - item.amount_paid))}</td><td><span className={`deductions-status deductions-status--${item.status}`}>{statusLabel(item.status)}</span></td></tr>)}</tbody></table></div></div>
  </section>;
}
