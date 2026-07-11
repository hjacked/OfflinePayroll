import { useEffect, useMemo, useState } from 'react';
import type {
  DeductionAssignment,
  DeductionTransaction,
  EmployeeLoan,
} from '../../../models/Deductions';
import type { Employee } from '../../../models/Employee';
import { formatCurrency, formatDate, statusLabel } from '../../admin/deductions/deductions-utils';

export default function EmployeeDeductionsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [assignments, setAssignments] = useState<DeductionAssignment[]>([]);
  const [transactions, setTransactions] = useState<DeductionTransaction[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const result = await window.api.employee.list({ status: 'active' });
        setEmployees(result.data);
        if (result.data[0]) setEmployeeId(result.data[0].id);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load employees.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    void (async () => {
      try {
        const [loanResult, assignmentResult, transactionResult] = await Promise.all([
          window.api.loan.list({ employee_id: employeeId, status: 'all' }),
          window.api.deductionAssignment.list({ employee_id: employeeId, include_inactive: false }),
          window.api.deductionTransaction.list({ employee_id: employeeId, status: 'all' }),
        ]);
        setLoans(loanResult.data);
        setAssignments(assignmentResult.data);
        setTransactions(transactionResult.data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load deductions.');
      }
    })();
  }, [employeeId]);

  const outstanding = useMemo(() => loans
    .filter((loan) => loan.status === 'active' || loan.status === 'suspended' || loan.status === 'draft')
    .reduce((total, loan) => total + loan.outstanding_balance, 0), [loans]);

  return (
    <section className="deductions-page">
      <div className="deductions-heading">
        <div><span>Employee self-service</span><h2>My Loans and Deductions</h2><p>Review recurring deductions, loan balances, and deduction history.</p></div>
        <label className="deductions-field"><span>Employee</span><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}</select></label>
      </div>
      {error && <div className="deductions-alert deductions-alert--error">{error}</div>}
      <div className="deductions-summary-grid">
        <article className="deductions-summary-card"><span>Outstanding loans</span><strong>{formatCurrency(outstanding)}</strong><small>{loans.filter((loan) => loan.status === 'active').length} active loans</small></article>
        <article className="deductions-summary-card"><span>Recurring deductions</span><strong>{assignments.length}</strong><small>active assignments</small></article>
        <article className="deductions-summary-card"><span>Approved history</span><strong>{formatCurrency(transactions.filter((item) => item.status === 'approved').reduce((sum, item) => sum + item.amount, 0))}</strong><small>recorded deductions</small></article>
      </div>
      <div className="deductions-table-card">
        <div className="deductions-table-card__header"><div><h3>Employee loans</h3><p>Current and historical loan accounts.</p></div></div>
        {loans.length === 0 ? <div className="deductions-empty-state">No employee loans found.</div> : <div className="deductions-table-wrap"><table className="deductions-table"><thead><tr><th>Loan</th><th>Total payable</th><th>Installment</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td><div className="deductions-type-cell"><strong>{loan.loan_number}</strong><span>{loan.deduction_name}</span></div></td><td>{formatCurrency(loan.total_payable)}</td><td>{formatCurrency(loan.installment_amount)}</td><td className="deductions-amount">{formatCurrency(loan.outstanding_balance)}</td><td><span className={`deductions-status deductions-status--${loan.status}`}>{statusLabel(loan.status)}</span></td></tr>)}</tbody></table></div>}
      </div>
      <div className="deductions-table-card">
        <div className="deductions-table-card__header"><div><h3>Recurring deductions</h3><p>Active employee deduction assignments.</p></div></div>
        {assignments.length === 0 ? <div className="deductions-empty-state">No recurring deductions assigned.</div> : <div className="deductions-table-wrap"><table className="deductions-table"><thead><tr><th>Deduction</th><th>Value</th><th>Effective from</th><th>Notes</th></tr></thead><tbody>{assignments.map((item) => <tr key={item.id}><td>{item.deduction_name}</td><td>{item.calculation_type === 'percentage' ? `${item.percentage}%` : formatCurrency(item.amount)}</td><td>{formatDate(item.effective_from)}</td><td>{item.notes || '—'}</td></tr>)}</tbody></table></div>}
      </div>
      <div className="deductions-table-card">
        <div className="deductions-table-card__header"><div><h3>Deduction history</h3><p>Latest payroll deduction records.</p></div></div>
        {transactions.length === 0 ? <div className="deductions-empty-state">No deduction history found.</div> : <div className="deductions-table-wrap"><table className="deductions-table"><thead><tr><th>Date</th><th>Deduction</th><th>Reference</th><th>Amount</th><th>Status</th></tr></thead><tbody>{transactions.map((item) => <tr key={item.id}><td>{formatDate(item.transaction_date)}</td><td>{item.deduction_name}</td><td>{item.reference || item.loan_number || '—'}</td><td>{formatCurrency(item.amount)}</td><td><span className={`deductions-status deductions-status--${item.status}`}>{statusLabel(item.status)}</span></td></tr>)}</tbody></table></div>}
      </div>
    </section>
  );
}
