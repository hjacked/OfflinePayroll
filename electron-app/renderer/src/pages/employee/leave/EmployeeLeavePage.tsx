import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Employee } from '../../../models/Employee';
import type { LeaveBalance, LeaveRequest } from '../../../models/Leave';
import {
  formatDate,
  formatDays,
  getErrorMessage,
  getLeaveDurationLabel,
  getLeaveStatusLabel,
} from '../../admin/leave/utils';

const storageKey = 'payroll.selectedEmployeeId';

export default function EmployeeLeavePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState(() => localStorage.getItem(storageKey) ?? '');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    const result = await window.api.employee.list({ status: 'active' });
    setEmployees(result.data);
    if (!employeeId && result.data[0]) {
      setEmployeeId(result.data[0].id);
      localStorage.setItem(storageKey, result.data[0].id);
    }
  }, [employeeId]);

  const loadLeaveData = useCallback(async () => {
    if (!employeeId) {
      setBalances([]);
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const year = new Date().getFullYear();
      const [balanceResult, requestResult] = await Promise.all([
        window.api.leaveBalance.list({ employee_id: employeeId, year }),
        window.api.leaveRequest.list({ employee_id: employeeId }),
      ]);
      setBalances(balanceResult.data);
      setRequests(requestResult.data);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load leave information.'));
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void loadEmployees().catch((reason: unknown) => {
      setError(getErrorMessage(reason, 'Unable to load employees.'));
      setLoading(false);
    });
  }, [loadEmployees]);

  useEffect(() => {
    void loadLeaveData();
  }, [loadLeaveData]);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === employeeId) ?? null,
    [employees, employeeId],
  );

  function changeEmployee(nextId: string): void {
    setEmployeeId(nextId);
    localStorage.setItem(storageKey, nextId);
  }

  return (
    <section className="employee-leave-page" aria-labelledby="employee-leave-title">
      <div className="employee-leave-heading">
        <div>
          <span>Employee self-service</span>
          <h1 id="employee-leave-title">My Leave</h1>
          <p>View balances, submit applications, and monitor approval status.</p>
        </div>
        {employeeId && (
          <Link className="leave-primary-link" to={`/employee/leave/new?employee=${employeeId}`}>
            File leave request
          </Link>
        )}
      </div>

      <label className="leave-field employee-selector">
        <span>Employee profile</span>
        <select value={employeeId} onChange={(event) => changeEmployee(event.target.value)}>
          <option value="">Select employee</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.employee_number} — {employee.name}
            </option>
          ))}
        </select>
      </label>

      {selectedEmployee && (
        <div className="employee-leave-identity">
          <strong>{selectedEmployee.name}</strong>
          <span>{selectedEmployee.department || 'No department'} · {selectedEmployee.role_title || 'No position'}</span>
        </div>
      )}

      {error && <div className="leave-alert leave-alert--error">{error}</div>}

      <div className="employee-leave-balance-grid">
        {balances.length === 0 && !loading ? (
          <div className="leave-empty-state">No tracked leave balances are available for this employee.</div>
        ) : balances.map((balance) => (
          <article className="employee-leave-balance-card" key={balance.id}>
            <span>{balance.leave_code}</span>
            <h2>{balance.leave_name}</h2>
            <strong>{formatDays(balance.available)}</strong>
            <small>day(s) available</small>
            <div>
              <span>Used {formatDays(balance.used)}</span>
              <span>Pending {formatDays(balance.pending)}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="leave-table-card">
        <div className="leave-table-card__header">
          <div><h3>Leave history</h3><p>{requests.length} request{requests.length === 1 ? '' : 's'}.</p></div>
        </div>
        {loading ? (
          <div className="leave-empty-state">Loading leave information…</div>
        ) : requests.length === 0 ? (
          <div className="leave-empty-state">No leave requests have been filed.</div>
        ) : (
          <div className="leave-table-wrap">
            <table className="leave-table leave-table--compact">
              <thead><tr><th>Leave type</th><th>Dates</th><th>Duration</th><th>Days</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td><div className="leave-type-cell"><strong>{request.leave_name}</strong><span>{request.leave_code}</span></div></td>
                    <td>{formatDate(request.start_date)}{request.end_date !== request.start_date ? ` — ${formatDate(request.end_date)}` : ''}</td>
                    <td>{getLeaveDurationLabel(request.duration_type)}</td>
                    <td>{formatDays(request.total_days)}</td>
                    <td><span className={`leave-status leave-status--${request.status}`}>{getLeaveStatusLabel(request.status)}</span></td>
                    <td><Link to={`/employee/leave/${request.id}`}>View</Link></td>
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
