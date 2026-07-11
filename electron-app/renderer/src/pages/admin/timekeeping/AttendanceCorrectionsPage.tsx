import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  AttendanceCorrection,
  AttendanceCorrectionInput,
  AttendanceStatus,
} from '../../../models/Attendance';
import type { Employee } from '../../../models/Employee';
import {
  attendanceStatusOptions,
  formatDate,
  getAttendanceStatusLabel,
  getErrorMessage,
  todayDate,
} from './utils';

const emptyCorrection: AttendanceCorrectionInput = {
  employee_id: '',
  work_date: todayDate(),
  requested_time_in: '',
  requested_time_out: '',
  requested_status: 'present',
  reason: '',
};

export default function AttendanceCorrectionsPage() {
  const [corrections, setCorrections] = useState<AttendanceCorrection[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [form, setForm] = useState<AttendanceCorrectionInput>(emptyCorrection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [correctionResult, employeeResult] = await Promise.all([
        window.api.attendanceCorrection.list({ status: statusFilter }),
        window.api.employee.list({ status: 'active' }),
      ]);
      setCorrections(correctionResult.data);
      setEmployees(employeeResult.data);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load attendance corrections.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function submitCorrection(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await window.api.attendanceCorrection.create(form);
      setForm(emptyCorrection);
      setStatusFilter('pending');
      await loadData();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to submit attendance correction.'));
    } finally {
      setSaving(false);
    }
  }

  async function review(
    correction: AttendanceCorrection,
    decision: 'approved' | 'rejected',
  ): Promise<void> {
    const reviewerNotes = window.prompt(
      decision === 'approved'
        ? 'Optional approval notes:'
        : 'Enter rejection notes:',
      '',
    );
    if (reviewerNotes === null) return;
    if (decision === 'rejected' && !reviewerNotes.trim()) {
      setError('Rejection notes are required.');
      return;
    }

    setBusyId(correction.id);
    setError(null);
    try {
      await window.api.attendanceCorrection.review(correction.id, {
        decision,
        reviewer_notes: reviewerNotes,
      });
      await loadData();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to review attendance correction.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-page timekeeping-page" aria-labelledby="corrections-title">
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Timekeeping workflow</span>
          <h2 id="corrections-title">Attendance corrections</h2>
          <p>
            Submit missing or corrected logs and approve or reject pending requests.
            Approved requests update the daily attendance record automatically.
          </p>
        </div>
        <Link className="timekeeping-secondary-link" to="/admin/timekeeping">
          Back to attendance
        </Link>
      </div>

      {error && <div className="timekeeping-alert timekeeping-alert--error">{error}</div>}

      <form className="timekeeping-form-section" onSubmit={(event) => void submitCorrection(event)}>
        <div className="timekeeping-form-section__heading">
          <h3>Submit correction</h3>
          <p>Use this for missing punches, incorrect times, or status corrections.</p>
        </div>
        <div className="timekeeping-form-grid timekeeping-form-grid--correction">
          <label className="timekeeping-field">
            <span>Employee *</span>
            <select
              value={form.employee_id}
              onChange={(event) => setForm((current) => ({ ...current, employee_id: event.target.value }))}
              required
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.employee_number} — {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="timekeeping-field">
            <span>Work date *</span>
            <input
              type="date"
              value={form.work_date}
              onChange={(event) => setForm((current) => ({ ...current, work_date: event.target.value }))}
              required
            />
          </label>
          <label className="timekeeping-field">
            <span>Requested status *</span>
            <select
              value={form.requested_status}
              onChange={(event) => setForm((current) => ({
                ...current,
                requested_status: event.target.value as AttendanceStatus,
              }))}
            >
              {attendanceStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="timekeeping-field">
            <span>Requested time in</span>
            <input
              type="time"
              value={form.requested_time_in}
              onChange={(event) => setForm((current) => ({ ...current, requested_time_in: event.target.value }))}
            />
          </label>
          <label className="timekeeping-field">
            <span>Requested time out</span>
            <input
              type="time"
              value={form.requested_time_out}
              onChange={(event) => setForm((current) => ({ ...current, requested_time_out: event.target.value }))}
            />
          </label>
          <label className="timekeeping-field timekeeping-field--wide">
            <span>Reason *</span>
            <textarea
              rows={3}
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              required
            />
          </label>
        </div>
        <div className="timekeeping-form-actions">
          <button className="timekeeping-primary-button" type="submit" disabled={saving}>
            {saving ? 'Submitting…' : 'Submit correction'}
          </button>
        </div>
      </form>

      <div className="timekeeping-table-card">
        <div className="timekeeping-table-card__header timekeeping-table-card__header--filter">
          <div>
            <h3>Correction queue</h3>
            <p>{corrections.length} request{corrections.length === 1 ? '' : 's'} shown.</p>
          </div>
          <label className="timekeeping-field timekeeping-field--inline">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(
                event.target.value as 'all' | 'pending' | 'approved' | 'rejected',
              )}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="all">All requests</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="timekeeping-empty-state">Loading correction requests…</div>
        ) : corrections.length === 0 ? (
          <div className="timekeeping-empty-state">No correction requests match this filter.</div>
        ) : (
          <div className="timekeeping-table-wrap">
            <table className="timekeeping-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Original</th>
                  <th>Requested</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {corrections.map((correction) => (
                  <tr key={correction.id}>
                    <td><strong>{correction.employee_name}</strong><br /><small>{correction.employee_number}</small></td>
                    <td>{formatDate(correction.work_date)}</td>
                    <td>
                      {correction.original_status
                        ? `${getAttendanceStatusLabel(correction.original_status)} · ${correction.original_time_in || '—'}–${correction.original_time_out || '—'}`
                        : 'No existing record'}
                    </td>
                    <td>
                      {getAttendanceStatusLabel(correction.requested_status)} · {correction.requested_time_in || '—'}–{correction.requested_time_out || '—'}
                    </td>
                    <td className="timekeeping-reason-cell">{correction.reason}</td>
                    <td>
                      <span className={`timekeeping-review-status timekeeping-review-status--${correction.status}`}>
                        {correction.status}
                      </span>
                      {correction.reviewer_notes && <small>{correction.reviewer_notes}</small>}
                    </td>
                    <td>
                      {correction.status === 'pending' ? (
                        <div className="timekeeping-row-actions">
                          <button
                            type="button"
                            disabled={busyId === correction.id}
                            onClick={() => void review(correction, 'approved')}
                          >Approve</button>
                          <button
                            type="button"
                            className="timekeeping-row-actions__danger"
                            disabled={busyId === correction.id}
                            onClick={() => void review(correction, 'rejected')}
                          >Reject</button>
                        </div>
                      ) : correction.reviewed_at || 'Reviewed'}
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
