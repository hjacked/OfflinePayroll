import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { LeaveRequest } from '../../../models/Leave';
import {
  formatDate,
  formatDateTime,
  formatDays,
  getErrorMessage,
  getLeaveDurationLabel,
  getLeaveStatusLabel,
} from '../../admin/leave/utils';

export default function EmployeeLeaveDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!id) return;
    setLoading(true);
    try {
      const result = await window.api.leaveRequest.get(id);
      if (!result) throw new Error('Leave request was not found.');
      setRequest(result);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load the leave request.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function cancelRequest(): Promise<void> {
    if (!id || !request) return;
    const reason = window.prompt('Cancellation reason (optional):', '');
    if (reason === null) return;
    if (!window.confirm('Cancel this leave request?')) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await window.api.leaveRequest.cancel(id, { reason });
      setRequest(updated);
    } catch (reasonValue: unknown) {
      setError(getErrorMessage(reasonValue, 'Unable to cancel the leave request.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="leave-empty-state">Loading leave request…</div>;
  if (!request) return <div className="leave-alert leave-alert--error">{error ?? 'Leave request was not found.'}</div>;

  return (
    <section className="employee-leave-page" aria-labelledby="employee-leave-details-title">
      <div className="employee-leave-heading">
        <div>
          <span>Employee self-service</span>
          <h1 id="employee-leave-details-title">Leave Request</h1>
          <p>{request.leave_name} · {formatDate(request.start_date)} to {formatDate(request.end_date)}</p>
        </div>
        <Link className="leave-secondary-link" to="/employee/leave">Back to My Leave</Link>
      </div>

      {error && <div className="leave-alert leave-alert--error">{error}</div>}

      <div className="leave-profile-grid">
        <article className="leave-profile-card"><span>Status</span><strong><span className={`leave-status leave-status--${request.status}`}>{getLeaveStatusLabel(request.status)}</span></strong></article>
        <article className="leave-profile-card"><span>Requested days</span><strong>{formatDays(request.total_days)}</strong></article>
        <article className="leave-profile-card"><span>Duration</span><strong>{getLeaveDurationLabel(request.duration_type)}</strong></article>
        <article className="leave-profile-card"><span>Paid status</span><strong>{request.is_paid ? 'Paid' : 'Unpaid'}</strong></article>
      </div>

      <article className="leave-detail-section">
        <h3>Request information</h3>
        <dl className="leave-details-list">
          <div><dt>Employee</dt><dd>{request.employee_name} ({request.employee_number})</dd></div>
          <div><dt>Leave type</dt><dd>{request.leave_name}</dd></div>
          <div><dt>Dates</dt><dd>{formatDate(request.start_date)} — {formatDate(request.end_date)}</dd></div>
          <div><dt>Reason</dt><dd>{request.reason}</dd></div>
          <div><dt>Supporting reference</dt><dd>{request.attachment_reference || 'None'}</dd></div>
          <div><dt>Submitted</dt><dd>{formatDateTime(request.created_at)}</dd></div>
          <div><dt>Reviewer notes</dt><dd>{request.reviewer_notes || 'None'}</dd></div>
        </dl>
      </article>

      {(request.status === 'pending' || request.status === 'approved') && (
        <div className="leave-form-actions">
          <button className="leave-danger-button" type="button" disabled={busy} onClick={() => void cancelRequest()}>{busy ? 'Cancelling…' : 'Cancel request'}</button>
        </div>
      )}
    </section>
  );
}
