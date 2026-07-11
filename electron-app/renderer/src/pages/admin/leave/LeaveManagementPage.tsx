import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Employee } from '../../../models/Employee';
import type {
  LeaveRequest,
  LeaveRequestFilters,
  LeaveRequestStatus,
  LeaveSummary,
  LeaveType,
} from '../../../models/Leave';
import {
  currentYearRange,
  formatDate,
  formatDays,
  getErrorMessage,
  getLeaveDurationLabel,
  getLeaveStatusLabel,
  leaveStatusOptions,
} from './utils';

const yearRange = currentYearRange();

const emptySummary: LeaveSummary = {
  total_requests: 0,
  pending_requests: 0,
  approved_requests: 0,
  rejected_requests: 0,
  cancelled_requests: 0,
  pending_days: 0,
  approved_days: 0,
  employees_on_leave_today: 0,
};

export default function LeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [summary, setSummary] = useState<LeaveSummary>(emptySummary);
  const [filters, setFilters] = useState<Required<LeaveRequestFilters>>({
    query: '',
    employee_id: '',
    leave_type_id: '',
    status: 'all',
    date_from: yearRange.dateFrom,
    date_to: yearRange.dateTo,
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [requestResult, summaryResult, employeeResult, typeResult] = await Promise.all([
        window.api.leaveRequest.list(appliedFilters),
        window.api.leaveRequest.summary(appliedFilters),
        window.api.employee.list({ status: 'active' }),
        window.api.leaveType.list(),
      ]);
      setRequests(requestResult.data);
      setSummary(summaryResult);
      setEmployees(employeeResult.data);
      setLeaveTypes(typeResult.data);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load leave requests.'));
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
  }

  function resetFilters(): void {
    const next: Required<LeaveRequestFilters> = {
      query: '',
      employee_id: '',
      leave_type_id: '',
      status: 'all',
      date_from: yearRange.dateFrom,
      date_to: yearRange.dateTo,
    };
    setFilters(next);
    setAppliedFilters(next);
  }

  return (
    <section className="admin-page leave-page" aria-labelledby="leave-management-title">
      <div className="admin-page-heading leave-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Absence administration</span>
          <h2 id="leave-management-title">Leave Management</h2>
          <p>
            Review applications, maintain leave types and credits, approve requests,
            and keep approved leave synchronized with Timekeeping.
          </p>
        </div>
        <div className="leave-heading__actions">
          <Link className="leave-secondary-link" to="/admin/leave-management/types">
            Leave types
          </Link>
          <Link className="leave-secondary-link" to="/admin/leave-management/balances">
            Leave balances
          </Link>
          <Link className="leave-primary-link" to="/admin/leave-management/new">
            File leave request
          </Link>
        </div>
      </div>

      {error && <div className="leave-alert leave-alert--error">{error}</div>}

      <div className="leave-summary-grid">
        <SummaryCard label="All requests" value={summary.total_requests} />
        <SummaryCard label="Pending" value={summary.pending_requests} />
        <SummaryCard label="Approved" value={summary.approved_requests} />
        <SummaryCard label="Rejected" value={summary.rejected_requests} />
        <SummaryCard label="Cancelled" value={summary.cancelled_requests} />
        <SummaryCard label="Pending days" value={formatDays(summary.pending_days)} />
        <SummaryCard label="Approved days" value={formatDays(summary.approved_days)} />
        <SummaryCard label="On leave today" value={summary.employees_on_leave_today} />
      </div>

      <form className="leave-toolbar" onSubmit={applyFilters}>
        <label className="leave-field leave-field--search">
          <span>Search</span>
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({
              ...current,
              query: event.target.value,
            }))}
            placeholder="Employee, department, leave type, or reason"
          />
        </label>
        <label className="leave-field">
          <span>Employee</span>
          <select
            value={filters.employee_id}
            onChange={(event) => setFilters((current) => ({
              ...current,
              employee_id: event.target.value,
            }))}
          >
            <option value="">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_number} — {employee.name}
              </option>
            ))}
          </select>
        </label>
        <label className="leave-field">
          <span>Leave type</span>
          <select
            value={filters.leave_type_id}
            onChange={(event) => setFilters((current) => ({
              ...current,
              leave_type_id: event.target.value,
            }))}
          >
            <option value="">All leave types</option>
            {leaveTypes.map((leaveType) => (
              <option key={leaveType.id} value={leaveType.id}>
                {leaveType.code} — {leaveType.name}
              </option>
            ))}
          </select>
        </label>
        <label className="leave-field">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({
              ...current,
              status: event.target.value as 'all' | LeaveRequestStatus,
            }))}
          >
            <option value="all">All statuses</option>
            {leaveStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="leave-field">
          <span>From</span>
          <input
            type="date"
            value={filters.date_from}
            onChange={(event) => setFilters((current) => ({
              ...current,
              date_from: event.target.value,
            }))}
          />
        </label>
        <label className="leave-field">
          <span>To</span>
          <input
            type="date"
            value={filters.date_to}
            onChange={(event) => setFilters((current) => ({
              ...current,
              date_to: event.target.value,
            }))}
          />
        </label>
        <div className="leave-toolbar__actions">
          <button className="leave-primary-button" type="submit">Apply</button>
          <button className="leave-secondary-button" type="button" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </form>

      <div className="leave-table-card">
        <div className="leave-table-card__header">
          <div>
            <h3>Leave applications</h3>
            <p>{requests.length} request{requests.length === 1 ? '' : 's'} match the selected filters.</p>
          </div>
        </div>

        {loading ? (
          <div className="leave-empty-state">Loading leave requests…</div>
        ) : requests.length === 0 ? (
          <div className="leave-empty-state">No leave requests match the selected filters.</div>
        ) : (
          <div className="leave-table-wrap">
            <table className="leave-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave type</th>
                  <th>Dates</th>
                  <th>Duration</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="leave-employee-cell">
                        <strong>{request.employee_name}</strong>
                        <span>{request.employee_number} · {request.department || 'No department'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="leave-type-cell">
                        <strong>{request.leave_name}</strong>
                        <span>{request.leave_code} · {request.is_paid ? 'Paid' : 'Unpaid'}</span>
                      </div>
                    </td>
                    <td>
                      {formatDate(request.start_date)}
                      {request.end_date !== request.start_date && (
                        <> — {formatDate(request.end_date)}</>
                      )}
                    </td>
                    <td>{getLeaveDurationLabel(request.duration_type)}</td>
                    <td>{formatDays(request.total_days)}</td>
                    <td>
                      <span className={`leave-status leave-status--${request.status}`}>
                        {getLeaveStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="leave-reason-cell">{request.reason}</td>
                    <td>
                      <div className="leave-row-actions">
                        <Link to={`/admin/leave-management/${request.id}`}>View</Link>
                        {request.status === 'pending' && (
                          <Link to={`/admin/leave-management/${request.id}/edit`}>Edit</Link>
                        )}
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

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <article className="leave-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
