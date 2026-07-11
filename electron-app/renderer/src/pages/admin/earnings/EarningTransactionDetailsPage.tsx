import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { EarningTransaction } from '../../../models/Earnings';
import {
  categoryLabel,
  formatCurrency,
  formatDate,
  statusLabel,
} from './earnings-utils';

export default function EarningTransactionDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<EarningTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const record = await window.api.earningTransaction.get(id);
      if (!record) throw new Error('Earning transaction was not found.');
      setTransaction(record);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the earning transaction.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(status: 'approved' | 'cancelled') {
    if (!window.confirm(status === 'approved' ? 'Approve this transaction?' : 'Cancel this transaction?')) return;
    try {
      await window.api.earningTransaction.setStatus(id, status);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update status.');
    }
  }

  async function remove() {
    if (!transaction) return;
    if (!window.confirm(transaction.status === 'approved' ? 'Approved entries are cancelled instead of deleted. Continue?' : 'Delete this earning transaction?')) return;
    try {
      const result = await window.api.earningTransaction.delete(id);
      if (result.cancelled) {
        await load();
      } else {
        navigate('/admin/earnings');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to remove the transaction.');
    }
  }

  if (loading) return <div className="earnings-empty-state">Loading earning transaction…</div>;
  if (!transaction) return <div className="earnings-alert earnings-alert--error">{error || 'Earning transaction was not found.'}</div>;

  return (
    <section className="earnings-page">
      <div className="earnings-heading">
        <div>
          <span>{transaction.earning_code} · {categoryLabel(transaction.category)}</span>
          <h2>{transaction.earning_name}</h2>
          <p>{transaction.employee_name} · {formatDate(transaction.transaction_date)}</p>
        </div>
        <div className="earnings-heading__actions">
          <Link className="earnings-secondary-link" to="/admin/earnings">Back</Link>
          {transaction.status !== 'cancelled' && <Link className="earnings-secondary-link" to={`/admin/earnings/${transaction.id}/edit`}>Edit</Link>}
          {transaction.status === 'draft' && <button className="earnings-primary-button" type="button" onClick={() => void setStatus('approved')}>Approve</button>}
        </div>
      </div>

      {error && <div className="earnings-alert earnings-alert--error">{error}</div>}

      <div className="earnings-detail-grid">
        <article className="earnings-detail-card"><span>Amount</span><strong>{formatCurrency(transaction.amount)}</strong></article>
        <article className="earnings-detail-card"><span>Status</span><strong><span className={`earnings-status earnings-status--${transaction.status}`}>{statusLabel(transaction.status)}</span></strong></article>
        <article className="earnings-detail-card"><span>Taxability</span><strong>{transaction.taxability === 'taxable' ? 'Taxable' : 'Non-taxable'}</strong></article>
        <article className="earnings-detail-card"><span>Contribution basis</span><strong>{transaction.include_in_contribution_basis ? 'Included' : 'Excluded'}</strong></article>
      </div>

      <div className="earnings-detail-section">
        <h3>Employee and earning information</h3>
        <dl className="earnings-definition-grid">
          <div><dt>Employee</dt><dd>{transaction.employee_name}</dd></div>
          <div><dt>Employee number</dt><dd>{transaction.employee_number}</dd></div>
          <div><dt>Department</dt><dd>{transaction.department || '—'}</dd></div>
          <div><dt>Position</dt><dd>{transaction.role_title || '—'}</dd></div>
          <div><dt>Earning type</dt><dd>{transaction.earning_code} — {transaction.earning_name}</dd></div>
          <div><dt>Category</dt><dd>{categoryLabel(transaction.category)}</dd></div>
          <div><dt>Transaction date</dt><dd>{formatDate(transaction.transaction_date)}</dd></div>
          <div><dt>Payroll period</dt><dd>{transaction.payroll_period_name || transaction.payroll_period_id || 'Not assigned'}</dd></div>
          <div><dt>Reference</dt><dd>{transaction.reference || '—'}</dd></div>
          <div><dt>Assignment</dt><dd>{transaction.assignment_id || 'Not linked'}</dd></div>
          <div className="earnings-definition-grid__wide"><dt>Notes</dt><dd>{transaction.notes || '—'}</dd></div>
        </dl>
      </div>

      <div className="earnings-danger-zone">
        <div><h3>{transaction.status === 'approved' ? 'Cancel transaction' : 'Delete transaction'}</h3><p>Approved transactions remain in the audit history and are cancelled instead of removed.</p></div>
        <button className="earnings-danger-button" type="button" disabled={transaction.status === 'cancelled'} onClick={() => void remove()}>{transaction.status === 'approved' ? 'Cancel transaction' : 'Delete transaction'}</button>
      </div>
    </section>
  );
}
