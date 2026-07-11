import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AttendanceRecord } from '../../../models/Attendance';
import {
  formatDate,
  formatHours,
  getAttendanceStatusLabel,
  getErrorMessage,
} from './utils';

export default function AttendanceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Attendance record ID is missing.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    window.api.attendance.get(id)
      .then((result) => {
        if (!cancelled) {
          setRecord(result);
          if (!result) setError('Attendance record was not found.');
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(reason, 'Unable to load attendance record.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete(): Promise<void> {
    if (!record) return;
    const confirmed = window.confirm(
      `Delete the attendance record for ${record.employee_name} on ${formatDate(record.work_date)}?`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await window.api.attendance.delete(record.id);
      navigate('/admin/timekeeping', { replace: true });
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to delete attendance record.'));
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="timekeeping-empty-state">Loading attendance record…</div>;
  }

  return (
    <section className="admin-page timekeeping-page" aria-labelledby="attendance-details-title">
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Timekeeping record</span>
          <h2 id="attendance-details-title">Attendance details</h2>
          <p>Review logged times and payroll-ready computed attendance values.</p>
        </div>
        <div className="timekeeping-heading__actions">
          {record && (
            <Link className="timekeeping-primary-link" to={`/admin/timekeeping/${record.id}/edit`}>
              Edit record
            </Link>
          )}
          <Link className="timekeeping-secondary-link" to="/admin/timekeeping">
            Back to attendance
          </Link>
        </div>
      </div>

      {error && <div className="timekeeping-alert timekeeping-alert--error">{error}</div>}

      {record && (
        <>
          <div className="timekeeping-profile-card">
            <div>
              <span className="timekeeping-profile-card__code">{record.employee_number}</span>
              <h3>{record.employee_name}</h3>
              <p>{record.department || 'No department'} · {formatDate(record.work_date)}</p>
            </div>
            <span className={`timekeeping-status timekeeping-status--${record.status}`}>
              {getAttendanceStatusLabel(record.status)}
            </span>
          </div>

          <div className="timekeeping-detail-grid">
            <DetailSection title="Schedule and logs">
              <Detail label="Schedule" value={record.schedule_name || 'Default / none'} />
              <Detail
                label="Scheduled time"
                value={record.scheduled_time_in && record.scheduled_time_out
                  ? `${record.scheduled_time_in}–${record.scheduled_time_out}`
                  : '—'}
              />
              <Detail label="Actual time in" value={record.time_in || '—'} />
              <Detail label="Actual time out" value={record.time_out || '—'} />
              <Detail label="Break" value={`${record.break_minutes} minutes`} />
              <Detail label="Source" value={record.source.split('-').join(' ')} />
            </DetailSection>

            <DetailSection title="Computed payroll values">
              <Detail label="Hours worked" value={`${formatHours(record.hours_worked)} hours`} />
              <Detail label="Regular hours" value={`${formatHours(record.regular_hours)} hours`} />
              <Detail label="Late" value={`${record.late_minutes} minutes`} />
              <Detail label="Undertime" value={`${record.undertime_minutes} minutes`} />
              <Detail label="Overtime" value={`${formatHours(record.overtime_hours)} hours`} />
              <Detail
                label="Night differential"
                value={`${formatHours(record.night_diff_hours)} hours`}
              />
            </DetailSection>

            <DetailSection title="Record information" wide>
              <Detail label="Notes" value={record.notes || '—'} wide />
              <Detail label="Created" value={record.created_at || '—'} />
              <Detail label="Last updated" value={record.updated_at || '—'} />
            </DetailSection>
          </div>

          <div className="timekeeping-danger-zone">
            <div>
              <h3>Delete attendance record</h3>
              <p>This permanently removes the daily attendance entry.</p>
            </div>
            <button
              className="timekeeping-danger-button"
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? 'Deleting…' : 'Delete record'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function DetailSection({
  title,
  wide = false,
  children,
}: {
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className={`timekeeping-detail-section${wide ? ' timekeeping-detail-section--wide' : ''}`}>
      <h3>{title}</h3>
      <dl>{children}</dl>
    </article>
  );
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'timekeeping-detail--wide' : ''}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
