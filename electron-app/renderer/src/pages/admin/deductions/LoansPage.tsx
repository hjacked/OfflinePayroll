import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EmployeeLoan, EmployeeLoanFilters, LoanSummary } from '../../../models/Deductions';
import { formatCurrency, formatDate, statusLabel } from './deductions-utils';

const emptySummary: LoanSummary = { total_principal: 0, total_payable: 0, outstanding: 0, active_count: 0, suspended_count: 0, paid_count: 0 };

export default function LoansPage() {
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [summary, setSummary] = useState<LoanSummary>(emptySummary);
  const [filters, setFilters] = useState<EmployeeLoanFilters>({ query: '', status: 'all' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [loanResult, summaryResult] = await Promise.all([
        window.api.loan.list(filters),
        window.api.loan.summary(filters),
      ]);
      setLoans(loanResult.data); setSummary(summaryResult);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load employee loans.'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(loan: EmployeeLoan, status: EmployeeLoan['status']) {
    if (!window.confirm(`Change ${loan.loan_number} to ${status}?`)) return;
    try { await window.api.loan.setStatus(loan.id, status); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update loan status.'); }
  }

  async function remove(loan: EmployeeLoan) {
    if (!window.confirm('Delete this loan? Loans with approved payments will be cancelled instead.')) return;
    try { await window.api.loan.delete(loan.id); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to remove loan.'); }
  }

  return <section className="deductions-page">
    <div className="deductions-heading"><div><span>Loan ledger</span><h2>Employee Loans</h2><p>Track principal, interest, installments, payments, and outstanding balances.</p></div><div className="deductions-heading__actions"><Link className="deductions-secondary-link" to="/admin/deductions">Back to deductions</Link><Link className="deductions-primary-link" to="/admin/deductions/loans/new">Add loan</Link></div></div>
    {error && <div className="deductions-alert deductions-alert--error">{error}</div>}
    <div className="deductions-summary-grid">
      <article className="deductions-summary-card"><span>Outstanding</span><strong>{formatCurrency(summary.outstanding)}</strong><small>remaining loan balance</small></article>
      <article className="deductions-summary-card"><span>Active</span><strong>{summary.active_count}</strong><small>currently deducting</small></article>
      <article className="deductions-summary-card"><span>Suspended</span><strong>{summary.suspended_count}</strong><small>temporarily paused</small></article>
      <article className="deductions-summary-card"><span>Paid</span><strong>{summary.paid_count}</strong><small>completed loans</small></article>
    </div>
    <div className="deductions-toolbar"><label className="deductions-field"><span>Search</span><input value={filters.query ?? ''} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Employee or loan number" /></label><label className="deductions-field"><span>Status</span><select value={filters.status ?? 'all'} onChange={(e) => setFilters({ ...filters, status: e.target.value as EmployeeLoanFilters['status'] })}><option value="all">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></label></div>
    <div className="deductions-table-card">{loading ? <div className="deductions-empty-state">Loading loans…</div> : loans.length === 0 ? <div className="deductions-empty-state">No employee loans match the selected filters.</div> : <div className="deductions-table-wrap"><table className="deductions-table"><thead><tr><th>Loan</th><th>Employee</th><th>Principal</th><th>Installment</th><th>Outstanding</th><th>First deduction</th><th>Status</th><th>Actions</th></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td><div className="deductions-type-cell"><strong>{loan.loan_number}</strong><span>{loan.deduction_name}</span></div></td><td><div className="deductions-person-cell"><strong>{loan.employee_name}</strong><span>{loan.employee_number} · {loan.department || 'No department'}</span></div></td><td>{formatCurrency(loan.principal_amount)}</td><td>{formatCurrency(loan.installment_amount)} · {loan.deduction_frequency}</td><td className="deductions-amount">{formatCurrency(loan.outstanding_balance)}</td><td>{formatDate(loan.first_deduction_date)}</td><td><span className={`deductions-status deductions-status--${loan.status}`}>{statusLabel(loan.status)}</span></td><td><div className="deductions-row-actions"><Link to={`/admin/deductions/loans/${loan.id}`}>View</Link>{loan.status === 'draft' && <Link to={`/admin/deductions/loans/${loan.id}/edit`}>Edit</Link>}{loan.status === 'draft' && <button type="button" onClick={() => void changeStatus(loan, 'active')}>Activate</button>}{loan.status === 'active' && <button type="button" onClick={() => void changeStatus(loan, 'suspended')}>Suspend</button>}{loan.status === 'suspended' && <button type="button" onClick={() => void changeStatus(loan, 'active')}>Resume</button>}{loan.status !== 'paid' && loan.status !== 'cancelled' && <button type="button" onClick={() => void remove(loan)}>Delete</button>}</div></td></tr>)}</tbody></table></div>}</div>
  </section>;
}
