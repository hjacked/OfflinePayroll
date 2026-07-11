import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { LeaveRequest } from '../../../models/Leave';
import { formatDate, formatDateTime, formatDays, getErrorMessage, getLeaveDurationLabel, getLeaveStatusLabel } from '../../admin/leave/utils';

export default function EmployeeLeaveDetailsPage() {
  const { id = '' } = useParams();
  const [request, setRequest] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.api.selfService.leaveRequest(id).then(setRequest).catch((reason: unknown) => setError(getErrorMessage(reason, 'Unable to load the leave request.'))).finally(() => setLoading(false));
  }, [id]);

  async function cancelRequest() {
    if (!request || !window.confirm('Cancel this leave request?')) return;
    const reason = window.prompt('Cancellation reason (optional):', '');
    if (reason === null) return;
    setBusy(true);
    setError('');
    try { setRequest(await window.api.selfService.cancelLeaveRequest(request.id, { reason })); }
    catch (caught) { setError(getErrorMessage(caught, 'Unable to cancel the leave request.')); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="leave-empty-state">Loading leave request…</div>;
  if (!request) return <div className="leave-alert leave-alert--error">{error || 'Leave request was not found.'}</div>;
  return <section className="employee-leave-page"><div className="employee-leave-heading"><div><span>Employee self-service</span><h1>Leave Request</h1><p>{request.leave_name} · {formatDate(request.start_date)} to {formatDate(request.end_date)}</p></div><Link className="leave-secondary-link" to="/employee/leave">Back to My Leave</Link></div>{error && <div className="leave-alert leave-alert--error">{error}</div>}<div className="leave-profile-grid"><article className="leave-profile-card"><span>Status</span><strong><span className={`leave-status leave-status--${request.status}`}>{getLeaveStatusLabel(request.status)}</span></strong></article><article className="leave-profile-card"><span>Requested days</span><strong>{formatDays(request.total_days)}</strong></article><article className="leave-profile-card"><span>Duration</span><strong>{getLeaveDurationLabel(request.duration_type)}</strong></article><article className="leave-profile-card"><span>Paid status</span><strong>{request.is_paid ? 'Paid' : 'Unpaid'}</strong></article></div><article className="leave-detail-section"><h3>Request information</h3><dl className="leave-details-list"><div><dt>Leave type</dt><dd>{request.leave_name}</dd></div><div><dt>Dates</dt><dd>{formatDate(request.start_date)} — {formatDate(request.end_date)}</dd></div><div><dt>Reason</dt><dd>{request.reason}</dd></div><div><dt>Supporting reference</dt><dd>{request.attachment_reference || 'None'}</dd></div><div><dt>Submitted</dt><dd>{formatDateTime(request.created_at)}</dd></div><div><dt>Reviewer notes</dt><dd>{request.reviewer_notes || 'None'}</dd></div></dl></article>{(request.status === 'pending' || request.status === 'approved') && <div className="leave-form-actions"><button className="leave-danger-button" type="button" disabled={busy} onClick={() => void cancelRequest()}>{busy ? 'Cancelling…' : 'Cancel request'}</button></div>}</section>;
}
