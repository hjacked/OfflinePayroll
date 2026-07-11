import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Employee } from '../../../models/Employee';
import type {
  EarningAssignment,
  EarningTransaction,
} from '../../../models/Earnings';
import {
  categoryLabel,
  formatCurrency,
  formatDate,
  monthStart,
  today,
} from '../../admin/earnings/earnings-utils';

export default function EmployeeEarningsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [assignments, setAssignments] = useState<EarningAssignment[]>([]);
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const result = await window.api.employee.list({ status: 'active' });
        setEmployees(result.data);
        if (result.data[0]) setEmployeeId(result.data[0].id);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load employees.');
        setLoading(false);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError('');
    try {
      const [assignmentResult, transactionResult] = await Promise.all([
        window.api.earningAssignment.list({
          employee_id: employeeId,
          as_of: today(),
          include_inactive: false,
        }),
        window.api.earningTransaction.list({
          employee_id: employeeId,
          status: 'approved',
          date_from: monthStart(),
          date_to: today(),
        }),
      ]);
      setAssignments(assignmentResult.data);
      setTransactions(transactionResult.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load employee earnings.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const employee = useMemo(
    () => employees.find((item) => item.id === employeeId),
    [employeeId, employees],
  );
  const approvedTotal = transactions.reduce((sum, item) => sum + item.amount, 0);
  const recurringTotal = assignments.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="employee-earnings-page">
      <div className="employee-earnings-heading">
        <div>
          <span>Employee self-service</span>
          <h1>My Earnings</h1>
          <p>Review active allowances and approved other-income records.</p>
        </div>
      </div>

      <label className="earnings-field employee-earnings-selector">
        <span>Employee profile</span>
        <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
          {employees.map((item) => <option key={item.id} value={item.id}>{item.employee_number} — {item.name}</option>)}
        </select>
      </label>

      {employee && (
        <div className="employee-earnings-identity">
          <strong>{employee.name}</strong>
          <span>{employee.department || 'No department'} · {employee.role_title || 'No position'}</span>
        </div>
      )}

      {error && <div className="earnings-alert earnings-alert--error">{error}</div>}

      <div className="earnings-summary-grid earnings-summary-grid--employee">
        <article className="earnings-summary-card"><span>Active recurring</span><strong>{formatCurrency(recurringTotal)}</strong><small>scheduled assignment total</small></article>
        <article className="earnings-summary-card"><span>Approved this month</span><strong>{formatCurrency(approvedTotal)}</strong><small>posted other income</small></article>
        <article className="earnings-summary-card"><span>Active assignments</span><strong>{assignments.length}</strong><small>allowances and recurring income</small></article>
        <article className="earnings-summary-card"><span>Approved records</span><strong>{transactions.length}</strong><small>within the current month</small></article>
      </div>

      <div className="earnings-table-card">
        <div className="earnings-table-card__header"><div><h3>Active allowances and recurring income</h3><p>Current assignments as of {formatDate(today())}.</p></div></div>
        {loading ? <div className="earnings-empty-state">Loading earnings…</div> : assignments.length === 0 ? <div className="earnings-empty-state">No active recurring earnings are assigned.</div> : (
          <div className="earnings-table-wrap">
            <table className="earnings-table earnings-table--employee">
              <thead><tr><th>Earning</th><th>Category</th><th>Amount</th><th>Taxability</th><th>Effective period</th></tr></thead>
              <tbody>{assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td><div className="earnings-type-cell"><strong>{assignment.earning_name}</strong><span>{assignment.earning_code}</span></div></td>
                  <td>{categoryLabel(assignment.category)}</td>
                  <td className="earnings-amount">{formatCurrency(assignment.amount)}</td>
                  <td><span className={`earnings-chip earnings-chip--${assignment.taxability}`}>{assignment.taxability === 'taxable' ? 'Taxable' : 'Non-taxable'}</span></td>
                  <td>{formatDate(assignment.effective_from)} — {assignment.effective_to ? formatDate(assignment.effective_to) : 'No end date'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="earnings-table-card">
        <div className="earnings-table-card__header"><div><h3>Approved earnings history</h3><p>Approved bonuses, incentives, commissions, reimbursements, and adjustments this month.</p></div></div>
        {loading ? <div className="earnings-empty-state">Loading earnings…</div> : transactions.length === 0 ? <div className="earnings-empty-state">No approved earning transactions were posted this month.</div> : (
          <div className="earnings-table-wrap">
            <table className="earnings-table earnings-table--employee">
              <thead><tr><th>Date</th><th>Earning</th><th>Category</th><th>Reference</th><th>Amount</th></tr></thead>
              <tbody>{transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDate(transaction.transaction_date)}</td>
                  <td><div className="earnings-type-cell"><strong>{transaction.earning_name}</strong><span>{transaction.earning_code}</span></div></td>
                  <td>{categoryLabel(transaction.category)}</td>
                  <td>{transaction.reference || '—'}</td>
                  <td className="earnings-amount">{formatCurrency(transaction.amount)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
