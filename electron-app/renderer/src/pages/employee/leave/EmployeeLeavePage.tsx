import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LeaveBalance, LeaveRequest } from '../../../models/Leave';
import {
  formatDate,
  formatDays,
  getErrorMessage,
  getLeaveDurationLabel,
  getLeaveStatusLabel,
} from '../../admin/leave/utils';

export default function EmployeeLeavePage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const year = new Date().getFullYear();
      const [balanceResult, requestResult] = await Promise.all([
        window.api.selfService.leaveBalances({ year }),
        window.api.selfService.leaveRequests(),
      ]);
      setBalances(balanceResult.data);
      setRequests(requestResult.data);
    } catch (reason) {
      setError(getErrorMessage(reason, 'Unable to load your leave information.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="employee-leave-page" aria-labelledby="employee-leave-title">
      <div className="employee-leave-heading">
        <div><span>Employee self-service</span><h1 id="employee-leave-title">My Leave</h1><p>View balances, submit applications, and monitor approval status.</p></div>
        <Link className="leave-primary-link" to="/employee/leave/new">File leave request</Link>
      </div>
      {error && <div className="leave-alert leave-alert--error">{error}</div>}
      <div className="employee-leave-balance-grid">
        {balances.length === 0 && !loading ? <div className="leave-empty-state">No tracked leave balances are available.</div> : balances.map((balance) => <article className="employee-leave-balance-card" key={balance.id}><span>{balance.leave_code}</span><h2>{balance.leave_name}</h2><strong>{formatDays(balance.available)}</strong><small>day(s) available</small><div><span>Used {formatDays(balance.used)}</span><span>Pending {formatDays(balance.pending)}</span></div></article>)}
      </div>
      <div className="leave-table-card"><div className="leave-table-card__header"><div><h3>Leave history</h3><p>{requests.length} request{requests.length === 1 ? '' : 's'}.</p></div></div>{loading ? <div className="leave-empty-state">Loading leave information…</div> : requests.length === 0 ? <div className="leave-empty-state">No leave requests have been filed.</div> : <div className="leave-table-wrap"><table className="leave-table leave-table--compact"><thead><tr><th>Leave type</th><th>Dates</th><th>Duration</th><th>Days</th><th>Status</th><th>Action</th></tr></thead><tbody>{requests.map((request) => <tr key={request.id}><td><div className="leave-type-cell"><strong>{request.leave_name}</strong><span>{request.leave_code}</span></div></td><td>{formatDate(request.start_date)}{request.end_date !== request.start_date ? ` — ${formatDate(request.end_date)}` : ''}</td><td>{getLeaveDurationLabel(request.duration_type)}</td><td>{formatDays(request.total_days)}</td><td><span className={`leave-status leave-status--${request.status}`}>{getLeaveStatusLabel(request.status)}</span></td><td><Link to={`/employee/leave/${request.id}`}>View</Link></td></tr>)}</tbody></table></div>}</div>
    </section>
  );
}
