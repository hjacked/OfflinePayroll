import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DeductionTransaction } from '../../../models/Deductions';
import { categoryLabel, formatCurrency, formatDate, statusLabel } from './deductions-utils';

export default function DeductionTransactionDetailsPage() {
  const { id = '' } = useParams();
  const [transaction, setTransaction] = useState<DeductionTransaction | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const value = await window.api.deductionTransaction.get(id);
      if (!value) throw new Error('Deduction transaction not found.');
      setTransaction(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load deduction.');
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function changeStatus(status: 'approved' | 'cancelled') {
    if (!window.confirm(status === 'approved' ? 'Approve this deduction?' : 'Cancel this deduction?')) return;
    try {
      await window.api.deductionTransaction.setStatus(id, status);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update deduction.');
    }
  }

  if (!transaction) return <div className="deductions-empty-state">{error || 'Loading deduction…'}</div>;

  return (
    <section className="deductions-page">
      <div className="deductions-heading">
        <div><span>Transaction details</span><h2>{transaction.deduction_name}</h2><p>{transaction.employee_name} · {formatDate(transaction.transaction_date)}</p></div>
        <div className="deductions-heading__actions"><Link className="deductions-secondary-link" to="/admin/deductions">Back to deductions</Link>{transaction.status === 'draft' && <Link className="deductions-secondary-link" to={`/admin/deductions/${transaction.id}/edit`}>Edit</Link>}</div>
      </div>
      {error && <div className="deductions-alert deductions-alert--error">{error}</div>}
      <div className="deductions-detail-card">
        <div className="deductions-detail-card__header"><div><h3>{transaction.reference || transaction.id}</h3><p>Payroll deduction record.</p></div><span className={`deductions-status deductions-status--${transaction.status}`}>{statusLabel(transaction.status)}</span></div>
        <div className="deductions-detail-grid">
          <div className="deductions-detail-item"><span>Employee</span><strong>{transaction.employee_number} — {transaction.employee_name}</strong></div>
          <div className="deductions-detail-item"><span>Deduction type</span><strong>{transaction.deduction_code} — {transaction.deduction_name}</strong></div>
          <div className="deductions-detail-item"><span>Category</span><strong>{categoryLabel(transaction.category)}</strong></div>
          <div className="deductions-detail-item"><span>Date</span><strong>{formatDate(transaction.transaction_date)}</strong></div>
          <div className="deductions-detail-item"><span>Amount</span><strong>{formatCurrency(transaction.amount)}</strong></div>
          <div className="deductions-detail-item"><span>Loan</span><strong>{transaction.loan_number || 'Not linked'}</strong></div>
          <div className="deductions-detail-item" style={{ gridColumn: '1 / -1' }}><span>Notes</span><strong>{transaction.notes || '—'}</strong></div>
        </div>
      </div>
      <div className="deductions-heading__actions">{transaction.status === 'draft' && <button className="deductions-button deductions-button--primary" type="button" onClick={() => void changeStatus('approved')}>Approve deduction</button>}{transaction.status === 'approved' && <button className="deductions-button" type="button" onClick={() => void changeStatus('cancelled')}>Cancel deduction</button>}</div>
    </section>
  );
}
