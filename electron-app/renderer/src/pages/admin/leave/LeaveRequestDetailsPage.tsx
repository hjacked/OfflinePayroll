import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { LeaveBalance, LeaveRequest } from '../../../models/Leave';
import {
  formatDate,
  formatDateTime,
  formatDays,
  getErrorMessage,
  getLeaveDurationLabel,
  getLeaveStatusLabel,
} from './utils';

export default function LeaveRequestDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load(): Promise<void> {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.leaveRequest.get(id);
      if (!result) throw new Error('Leave request was not found.');
      setRequest(result);
      const year = Number(result.start_date.slice(0, 4));
      const balanceResult = await window.api.leaveBalance.list({
        employee_id: result.employee_id,
        leave_type_id: result.leave_type_id,
        year,
      });
      setBalances(balanceResult.data);
      setReviewerNotes(result.reviewer_notes);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load the leave request.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const balance = useMemo(() => balances[0] ?? null, [balances]);

  async function handleReview(decision: 'approved' | 'rejected'): Promise<void> {
    if (!id || !request) return;
    const confirmed = window.confirm(
      `${decision === 'approved' ? 'Approve' : 'Reject'} this leave request for ${request.employee_name}?`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await window.api.leaveRequest.review(id, {
        decision,
        reviewer_notes: reviewerNotes,
      });
      setRequest(updated);
      setSuccess(`Leave request ${decision}.`);
      await load();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to review the leave request.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(): Promise<void> {
    if (!id || !request) return;
    const reason = window.prompt(
      'Reason for cancellation (optional):',
      '',
    );
    if (reason === null) return;
    const confirmed = window.confirm(
      request.status === 'approved'
        ? 'Cancel this approved leave? Linked leave attendance records will be restored.'
        : 'Cancel this pending leave request?',
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await window.api.leaveRequest.cancel(id, { reason });
      setRequest(updated);
      setSuccess('Leave request cancelled.');
      await load();
    } catch (reasonValue: unknown) {
      setError(getErrorMessage(reasonValue, 'Unable to cancel the leave request.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="leave-empty-state">Loading leave request…</div>;
  }

  if (!request) {
    return (
      <section className="admin-page leave-page">
        <div className="leave-alert leave-alert--error">{error ?? 'Leave request was not found.'}</div>
        <Link className="leave-secondary-link" to="/admin/leave-management">Back to leave management</Link>
      </section>
    );
  }

  return (
    <section className="admin-page leave-page" aria-labelledby="leave-details-title">
      <div className="admin-page-heading leave-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Leave request details</span>
          <h2 id="leave-details-title">{request.employee_name}</h2>
          <p>{request.leave_name} · {formatDate(request.start_date)} to {formatDate(request.end_date)}</p>
        </div>
        <div className="leave-heading__actions">
          <Link className="leave-secondary-link" to="/admin/leave-management">Back</Link>
          {request.status === 'pending' && (
            <Link className="leave-secondary-link" to={`/admin/leave-management/${request.id}/edit`}>
              Edit request
            </Link>
          )}
        </div>
      </div>

      {error && <div className="leave-alert leave-alert--error">{error}</div>}
      {success && <div className="leave-alert leave-alert--success">{success}</div>}

      <div className="leave-profile-grid">
        <article className="leave-profile-card">
          <span>Status</span>
          <strong>
            <span className={`leave-status leave-status--${request.status}`}>
              {getLeaveStatusLabel(request.status)}
            </span>
          </strong>
        </article>
        <article className="leave-profile-card">
          <span>Requested days</span>
          <strong>{formatDays(request.total_days)}</strong>
        </article>
        <article className="leave-profile-card">
          <span>Leave type</span>
          <strong>{request.leave_code}</strong>
          <small>{request.is_paid ? 'Paid' : 'Unpaid'}</small>
        </article>
        <article className="leave-profile-card">
          <span>Available balance</span>
          <strong>{request.track_balance && balance ? formatDays(balance.available) : 'Not tracked'}</strong>
        </article>
      </div>

      <div className="leave-detail-grid">
        <article className="leave-detail-section">
          <h3>Employee</h3>
          <dl className="leave-details-list">
            <div><dt>Employee number</dt><dd>{request.employee_number}</dd></div>
            <div><dt>Name</dt><dd>{request.employee_name}</dd></div>
            <div><dt>Department</dt><dd>{request.department || '—'}</dd></div>
          </dl>
        </article>

        <article className="leave-detail-section">
          <h3>Leave schedule</h3>
          <dl className="leave-details-list">
            <div><dt>Leave type</dt><dd>{request.leave_name}</dd></div>
            <div><dt>Start date</dt><dd>{formatDate(request.start_date)}</dd></div>
            <div><dt>End date</dt><dd>{formatDate(request.end_date)}</dd></div>
            <div><dt>Duration</dt><dd>{getLeaveDurationLabel(request.duration_type)}</dd></div>
            <div><dt>Total days</dt><dd>{formatDays(request.total_days)}</dd></div>
          </dl>
        </article>

        <article className="leave-detail-section leave-detail-section--wide">
          <h3>Request information</h3>
          <dl className="leave-details-list">
            <div><dt>Reason</dt><dd>{request.reason}</dd></div>
            <div><dt>Supporting reference</dt><dd>{request.attachment_reference || 'None'}</dd></div>
            <div><dt>Submitted</dt><dd>{formatDateTime(request.created_at)}</dd></div>
            <div><dt>Reviewed</dt><dd>{formatDateTime(request.reviewed_at)}</dd></div>
            <div><dt>Cancelled</dt><dd>{formatDateTime(request.cancelled_at)}</dd></div>
          </dl>
        </article>
      </div>

      {request.status === 'pending' && (
        <section className="leave-review-card">
          <div>
            <h3>Approval decision</h3>
            <p>
              Approval validates the current balance and writes leave entries to Timekeeping.
              Existing worked attendance blocks approval until the conflict is resolved.
            </p>
          </div>
          <label className="leave-field leave-field--wide">
            <span>Reviewer notes</span>
            <textarea
              rows={4}
              value={reviewerNotes}
              onChange={(event) => setReviewerNotes(event.target.value)}
              placeholder="Optional approval or rejection notes"
            />
          </label>
          <div className="leave-review-actions">
            <button
              className="leave-danger-button"
              type="button"
              disabled={busy}
              onClick={() => void handleReview('rejected')}
            >
              Reject
            </button>
            <button
              className="leave-primary-button"
              type="button"
              disabled={busy}
              onClick={() => void handleReview('approved')}
            >
              Approve
            </button>
          </div>
        </section>
      )}

      {(request.status === 'pending' || request.status === 'approved') && (
        <section className="leave-danger-zone">
          <div>
            <h3>Cancel leave request</h3>
            <p>
              Cancelling an approved request restores attendance records that were replaced by leave.
            </p>
          </div>
          <button className="leave-danger-button" type="button" disabled={busy} onClick={() => void handleCancel()}>
            Cancel request
          </button>
        </section>
      )}

      <div className="leave-form-actions">
        <button className="leave-secondary-button" type="button" onClick={() => navigate('/admin/leave-management')}>
          Done
        </button>
      </div>
    </section>
  );
}
