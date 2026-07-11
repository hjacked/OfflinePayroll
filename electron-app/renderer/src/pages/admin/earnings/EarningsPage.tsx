import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  EarningSummary,
  EarningTransaction,
  EarningTransactionFilters,
  EarningType,
} from '../../../models/Earnings';
import {
  categoryLabel,
  earningCategories,
  formatCurrency,
  formatDate,
  monthStart,
  statusLabel,
  today,
} from './earnings-utils';

const initialSummary: EarningSummary = {
  total: 0,
  draft: 0,
  approved: 0,
  cancelled: 0,
  taxable: 0,
  non_taxable: 0,
  recurring_assignments: 0,
};

export default function EarningsPage() {
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [types, setTypes] = useState<EarningType[]>([]);
  const [summary, setSummary] = useState<EarningSummary>(initialSummary);
  const [filters, setFilters] = useState<EarningTransactionFilters>({
    query: '',
    category: 'all',
    status: 'all',
    earning_type_id: '',
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
        window.api.earningTransaction.list(filters),
        window.api.earningType.list({ include_inactive: true }),
        window.api.earningTransaction.summary(filters),
      ]);
      setTransactions(transactionResult.data);
      setTypes(typeResult.data);
      setSummary(summaryResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load earnings.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(id: string, status: 'approved' | 'cancelled') {
    const message = status === 'approved'
      ? 'Approve this earning transaction?'
      : 'Cancel this earning transaction?';
    if (!window.confirm(message)) return;
    try {
      await window.api.earningTransaction.setStatus(id, status);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update the transaction.');
    }
  }

  async function removeTransaction(transaction: EarningTransaction) {
    if (!window.confirm(
      transaction.status === 'approved'
        ? 'Approved entries are cancelled instead of deleted. Continue?'
        : 'Delete this draft earning transaction?',
    )) return;
    try {
      await window.api.earningTransaction.delete(transaction.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to remove the transaction.');
    }
  }

  function updateFilter<K extends keyof EarningTransactionFilters>(
    key: K,
    value: EarningTransactionFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="earnings-page">
      <div className="earnings-heading">
        <div>
          <span>Compensation inputs</span>
          <h2>Allowances and Other Income</h2>
          <p>Manage recurring allowances and one-time earnings before payroll processing.</p>
        </div>
        <div className="earnings-heading__actions">
          <Link className="earnings-secondary-link" to="/admin/earnings/types">Earning types</Link>
          <Link className="earnings-secondary-link" to="/admin/earnings/assignments">Assignments</Link>
          <Link className="earnings-primary-link" to="/admin/earnings/new">Add transaction</Link>
        </div>
      </div>

      {error && <div className="earnings-alert earnings-alert--error">{error}</div>}

      <div className="earnings-summary-grid">
        <article className="earnings-summary-card"><span>Approved</span><strong>{formatCurrency(summary.approved)}</strong><small>ready for payroll</small></article>
        <article className="earnings-summary-card"><span>Draft</span><strong>{formatCurrency(summary.draft)}</strong><small>awaiting approval</small></article>
        <article className="earnings-summary-card"><span>Taxable approved</span><strong>{formatCurrency(summary.taxable)}</strong><small>subject to tax rules</small></article>
        <article className="earnings-summary-card"><span>Active recurring</span><strong>{summary.recurring_assignments}</strong><small>employee assignments</small></article>
      </div>

      <div className="earnings-toolbar">
        <label className="earnings-field earnings-field--search">
          <span>Search</span>
          <input
            value={filters.query ?? ''}
            onChange={(event) => updateFilter('query', event.target.value)}
            placeholder="Employee, earning type, or reference"
          />
        </label>
        <label className="earnings-field">
          <span>Category</span>
          <select value={filters.category ?? 'all'} onChange={(event) => updateFilter('category', event.target.value as EarningTransactionFilters['category'])}>
            <option value="all">All categories</option>
            {earningCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
        <label className="earnings-field">
          <span>Earning type</span>
          <select value={filters.earning_type_id ?? ''} onChange={(event) => updateFilter('earning_type_id', event.target.value)}>
            <option value="">All earning types</option>
            {types.map((type) => <option key={type.id} value={type.id}>{type.code} — {type.name}</option>)}
          </select>
        </label>
        <label className="earnings-field">
          <span>Status</span>
          <select value={filters.status ?? 'all'} onChange={(event) => updateFilter('status', event.target.value as EarningTransactionFilters['status'])}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="approved">Approved</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="earnings-field"><span>From</span><input type="date" value={filters.date_from ?? ''} onChange={(event) => updateFilter('date_from', event.target.value)} /></label>
        <label className="earnings-field"><span>To</span><input type="date" value={filters.date_to ?? ''} onChange={(event) => updateFilter('date_to', event.target.value)} /></label>
      </div>

      <div className="earnings-table-card">
        <div className="earnings-table-card__header">
          <div><h3>Earning transactions</h3><p>{transactions.length} record{transactions.length === 1 ? '' : 's'} for the selected filters.</p></div>
          <span>{formatCurrency(summary.total)} active total</span>
        </div>
        {loading ? (
          <div className="earnings-empty-state">Loading earning transactions…</div>
        ) : transactions.length === 0 ? (
          <div className="earnings-empty-state">No earning transactions match the selected filters.</div>
        ) : (
          <div className="earnings-table-wrap">
            <table className="earnings-table">
              <thead><tr><th>Date</th><th>Employee</th><th>Earning</th><th>Taxability</th><th>Amount</th><th>Reference</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.transaction_date)}</td>
                    <td><div className="earnings-person-cell"><strong>{transaction.employee_name}</strong><span>{transaction.employee_number} · {transaction.department || 'No department'}</span></div></td>
                    <td><div className="earnings-type-cell"><strong>{transaction.earning_name}</strong><span>{transaction.earning_code} · {categoryLabel(transaction.category)}</span></div></td>
                    <td><span className={`earnings-chip earnings-chip--${transaction.taxability}`}>{transaction.taxability === 'taxable' ? 'Taxable' : 'Non-taxable'}</span></td>
                    <td className="earnings-amount">{formatCurrency(transaction.amount)}</td>
                    <td>{transaction.reference || '—'}</td>
                    <td><span className={`earnings-status earnings-status--${transaction.status}`}>{statusLabel(transaction.status)}</span></td>
                    <td>
                      <div className="earnings-row-actions">
                        <Link to={`/admin/earnings/${transaction.id}`}>View</Link>
                        {transaction.status !== 'cancelled' && <Link to={`/admin/earnings/${transaction.id}/edit`}>Edit</Link>}
                        {transaction.status === 'draft' && <button type="button" onClick={() => void changeStatus(transaction.id, 'approved')}>Approve</button>}
                        {transaction.status !== 'cancelled' && <button type="button" onClick={() => void removeTransaction(transaction)}>{transaction.status === 'approved' ? 'Cancel' : 'Delete'}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
