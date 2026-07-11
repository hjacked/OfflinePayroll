import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  DeductionSummary,
  DeductionTransaction,
  DeductionTransactionFilters,
  DeductionType,
} from '../../../models/Deductions';
import {
  categoryLabel,
  deductionCategories,
  formatCurrency,
  formatDate,
  monthStart,
  statusLabel,
  today,
} from './deductions-utils';

const initialSummary: DeductionSummary = {
  total: 0,
  draft: 0,
  approved: 0,
  cancelled: 0,
  loan_payments: 0,
  recurring_assignments: 0,
  active_loans: 0,
  outstanding_loans: 0,
};

export default function DeductionsPage() {
  const [transactions, setTransactions] = useState<DeductionTransaction[]>([]);
  const [types, setTypes] = useState<DeductionType[]>([]);
  const [summary, setSummary] = useState<DeductionSummary>(initialSummary);
  const [filters, setFilters] = useState<DeductionTransactionFilters>({
    query: '',
    category: 'all',
    status: 'all',
    deduction_type_id: '',
    date_from: monthStart(),
    date_to: today(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [transactionResult, typeResult, summaryResult] = await Promise.all([
        window.api.deductionTransaction.list(filters),
        window.api.deductionType.list({ include_inactive: true }),
        window.api.deductionTransaction.summary(filters),
      ]);
      setTransactions(transactionResult.data);
      setTypes(typeResult.data);
      setSummary(summaryResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load deductions.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(id: string, status: 'approved' | 'cancelled') {
    if (!window.confirm(status === 'approved' ? 'Approve this deduction?' : 'Cancel this deduction?')) return;
    try {
      await window.api.deductionTransaction.setStatus(id, status);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update deduction.');
    }
  }

  async function remove(transaction: DeductionTransaction) {
    const message = transaction.status === 'approved'
      ? 'Approved deductions are cancelled instead of deleted. Continue?'
      : 'Delete this draft deduction?';
    if (!window.confirm(message)) return;
    try {
      await window.api.deductionTransaction.delete(transaction.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to remove deduction.');
    }
  }

  function updateFilter<K extends keyof DeductionTransactionFilters>(key: K, value: DeductionTransactionFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="deductions-page">
      <div className="deductions-heading">
        <div>
          <span>Payroll deductions</span>
          <h2>Loans and Other Deductions</h2>
          <p>Manage employee loans, recurring deductions, and one-time authorized deductions.</p>
        </div>
        <div className="deductions-heading__actions">
          <Link className="deductions-secondary-link" to="/admin/deductions/types">Deduction types</Link>
          <Link className="deductions-secondary-link" to="/admin/deductions/assignments">Assignments</Link>
          <Link className="deductions-secondary-link" to="/admin/deductions/loans">Employee loans</Link>
          <Link className="deductions-primary-link" to="/admin/deductions/new">Add deduction</Link>
        </div>
      </div>

      {error && <div className="deductions-alert deductions-alert--error">{error}</div>}

      <div className="deductions-summary-grid">
        <article className="deductions-summary-card"><span>Approved</span><strong>{formatCurrency(summary.approved)}</strong><small>ready for payroll</small></article>
        <article className="deductions-summary-card"><span>Draft</span><strong>{formatCurrency(summary.draft)}</strong><small>awaiting approval</small></article>
        <article className="deductions-summary-card"><span>Outstanding loans</span><strong>{formatCurrency(summary.outstanding_loans)}</strong><small>{summary.active_loans} active or suspended</small></article>
        <article className="deductions-summary-card"><span>Recurring deductions</span><strong>{summary.recurring_assignments}</strong><small>active assignments</small></article>
      </div>

      <div className="deductions-toolbar">
        <label className="deductions-field"><span>Search</span><input value={filters.query ?? ''} onChange={(event) => updateFilter('query', event.target.value)} placeholder="Employee, type, loan, or reference" /></label>
        <label className="deductions-field"><span>Category</span><select value={filters.category ?? 'all'} onChange={(event) => updateFilter('category', event.target.value as DeductionTransactionFilters['category'])}><option value="all">All categories</option>{deductionCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="deductions-field"><span>Deduction type</span><select value={filters.deduction_type_id ?? ''} onChange={(event) => updateFilter('deduction_type_id', event.target.value)}><option value="">All types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.code} — {type.name}</option>)}</select></label>
        <label className="deductions-field"><span>Status</span><select value={filters.status ?? 'all'} onChange={(event) => updateFilter('status', event.target.value as DeductionTransactionFilters['status'])}><option value="all">All statuses</option><option value="draft">Draft</option><option value="approved">Approved</option><option value="cancelled">Cancelled</option></select></label>
        <label className="deductions-field"><span>From</span><input type="date" value={filters.date_from ?? ''} onChange={(event) => updateFilter('date_from', event.target.value)} /></label>
        <label className="deductions-field"><span>To</span><input type="date" value={filters.date_to ?? ''} onChange={(event) => updateFilter('date_to', event.target.value)} /></label>
      </div>

      <div className="deductions-table-card">
        <div className="deductions-table-card__header">
          <div><h3>Deduction transactions</h3><p>{transactions.length} record{transactions.length === 1 ? '' : 's'} for the selected filters.</p></div>
          <span>{formatCurrency(summary.total)} active total</span>
        </div>
        {loading ? <div className="deductions-empty-state">Loading deductions…</div> : transactions.length === 0 ? <div className="deductions-empty-state">No deductions match the selected filters.</div> : (
          <div className="deductions-table-wrap"><table className="deductions-table">
            <thead><tr><th>Date</th><th>Employee</th><th>Deduction</th><th>Amount</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{transactions.map((transaction) => <tr key={transaction.id}>
              <td>{formatDate(transaction.transaction_date)}</td>
              <td><div className="deductions-person-cell"><strong>{transaction.employee_name}</strong><span>{transaction.employee_number} · {transaction.department || 'No department'}</span></div></td>
              <td><div className="deductions-type-cell"><strong>{transaction.deduction_name}</strong><span>{transaction.deduction_code} · {categoryLabel(transaction.category)}{transaction.loan_number ? ` · ${transaction.loan_number}` : ''}</span></div></td>
              <td className="deductions-amount">{formatCurrency(transaction.amount)}</td>
              <td>{transaction.reference || '—'}</td>
              <td><span className={`deductions-status deductions-status--${transaction.status}`}>{statusLabel(transaction.status)}</span></td>
              <td><div className="deductions-row-actions">
                <Link to={`/admin/deductions/${transaction.id}`}>View</Link>
                {transaction.status === 'draft' && <Link to={`/admin/deductions/${transaction.id}/edit`}>Edit</Link>}
                {transaction.status === 'draft' && <button type="button" onClick={() => void changeStatus(transaction.id, 'approved')}>Approve</button>}
                {transaction.status !== 'cancelled' && <button type="button" onClick={() => void remove(transaction)}>{transaction.status === 'approved' ? 'Cancel' : 'Delete'}</button>}
              </div></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </div>
    </section>
  );
}
