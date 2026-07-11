import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Employee } from '../../../models/Employee';
import type {
  LeaveBalance,
  LeaveBalanceFilters,
  LeaveType,
} from '../../../models/Leave';
import { formatDays, getErrorMessage } from './utils';

const currentYear = new Date().getFullYear();

export default function LeaveBalancesPage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [filters, setFilters] = useState<Required<LeaveBalanceFilters>>({
    query: '',
    employee_id: '',
    leave_type_id: '',
    year: currentYear,
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [selected, setSelected] = useState<LeaveBalance | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceResult, employeeResult, typeResult] = await Promise.all([
        window.api.leaveBalance.list(appliedFilters),
        window.api.employee.list({ status: 'active' }),
        window.api.leaveType.list(),
      ]);
      setBalances(balanceResult.data);
      setEmployees(employeeResult.data);
      setLeaveTypes(typeResult.data.filter((item) => item.track_balance === 1));
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load leave balances.'));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedFilters({ ...filters });
    setSelected(null);
  }

  function resetFilters(): void {
    const next: Required<LeaveBalanceFilters> = {
      query: '',
      employee_id: '',
      leave_type_id: '',
      year: currentYear,
    };
    setFilters(next);
    setAppliedFilters(next);
    setSelected(null);
  }

  function selectBalance(balance: LeaveBalance): void {
    setSelected(balance);
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setError(null);
    setSuccess(null);
  }

  async function submitAdjustment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await window.api.leaveBalance.adjust({
        employee_id: selected.employee_id,
        leave_type_id: selected.leave_type_id,
        year: selected.balance_year,
        amount: Number(adjustmentAmount),
        reason: adjustmentReason,
      });
      setSuccess('Leave balance adjustment saved.');
      setSelected(null);
      setAdjustmentAmount('');
      setAdjustmentReason('');
      await loadData();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to adjust the leave balance.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-page leave-page" aria-labelledby="leave-balances-title">
      <div className="admin-page-heading leave-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Employee leave credits</span>
          <h2 id="leave-balances-title">Leave Balances</h2>
          <p>Review yearly allocations, approved use, pending requests, and authorized adjustments.</p>
        </div>
        <div className="leave-heading__actions">
          <Link className="leave-secondary-link" to="/admin/leave-management/types">Leave types</Link>
          <Link className="leave-secondary-link" to="/admin/leave-management">Back to requests</Link>
        </div>
      </div>

      {error && <div className="leave-alert leave-alert--error">{error}</div>}
      {success && <div className="leave-alert leave-alert--success">{success}</div>}

      <form className="leave-balance-toolbar" onSubmit={applyFilters}>
        <label className="leave-field leave-field--search">
          <span>Search</span>
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Employee, department, or leave type"
          />
        </label>
        <label className="leave-field">
          <span>Employee</span>
          <select value={filters.employee_id} onChange={(event) => setFilters((current) => ({ ...current, employee_id: event.target.value }))}>
            <option value="">All employees</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}
          </select>
        </label>
        <label className="leave-field">
          <span>Leave type</span>
          <select value={filters.leave_type_id} onChange={(event) => setFilters((current) => ({ ...current, leave_type_id: event.target.value }))}>
            <option value="">All tracked types</option>
            {leaveTypes.map((leaveType) => <option key={leaveType.id} value={leaveType.id}>{leaveType.code} — {leaveType.name}</option>)}
          </select>
        </label>
        <label className="leave-field">
          <span>Year</span>
          <input type="number" min="2000" max="2200" value={filters.year} onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) }))} />
        </label>
        <div className="leave-toolbar__actions">
          <button className="leave-primary-button" type="submit">Apply</button>
          <button className="leave-secondary-button" type="button" onClick={resetFilters}>Reset</button>
        </div>
      </form>

      {selected && (
        <form className="leave-adjustment-card" onSubmit={(event) => void submitAdjustment(event)}>
          <div>
            <h3>Adjust {selected.employee_name} — {selected.leave_name}</h3>
            <p>Available before adjustment: {formatDays(selected.available)} day(s). Use a negative amount to reduce credits.</p>
          </div>
          <label className="leave-field">
            <span>Adjustment amount</span>
            <input type="number" step="0.5" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} required />
          </label>
          <label className="leave-field leave-field--wide">
            <span>Reason</span>
            <textarea rows={3} value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} required />
          </label>
          <div className="leave-form-actions">
            <button className="leave-secondary-button" type="button" onClick={() => setSelected(null)}>Cancel</button>
            <button className="leave-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save adjustment'}</button>
          </div>
        </form>
      )}

      <div className="leave-table-card">
        <div className="leave-table-card__header">
          <div><h3>Employee balances</h3><p>{balances.length} balance record{balances.length === 1 ? '' : 's'} for {appliedFilters.year}.</p></div>
        </div>
        {loading ? (
          <div className="leave-empty-state">Loading leave balances…</div>
        ) : balances.length === 0 ? (
          <div className="leave-empty-state">No leave balances match the selected filters.</div>
        ) : (
          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead><tr><th>Employee</th><th>Leave type</th><th>Opening</th><th>Earned</th><th>Adjustments</th><th>Allocated</th><th>Used</th><th>Pending</th><th>Available</th><th>Action</th></tr></thead>
              <tbody>
                {balances.map((balance) => (
                  <tr key={balance.id}>
                    <td><div className="leave-employee-cell"><strong>{balance.employee_name}</strong><span>{balance.employee_number} · {balance.department || 'No department'}</span></div></td>
                    <td><div className="leave-type-cell"><strong>{balance.leave_name}</strong><span>{balance.leave_code}</span></div></td>
                    <td>{formatDays(balance.opening_balance)}</td>
                    <td>{formatDays(balance.earned)}</td>
                    <td>{formatDays(balance.adjustments)}</td>
                    <td>{formatDays(balance.allocated)}</td>
                    <td>{formatDays(balance.used)}</td>
                    <td>{formatDays(balance.pending)}</td>
                    <td><strong className={balance.available < 0 ? 'leave-negative' : ''}>{formatDays(balance.available)}</strong></td>
                    <td><button className="leave-link-button" type="button" onClick={() => selectBalance(balance)}>Adjust</button></td>
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
