import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AttendanceCorrection, AttendanceStatus } from '../../../models/Attendance';
import {
  attendanceStatusOptions,
  formatDate,
  getAttendanceStatusLabel,
  getErrorMessage,
  todayDate,
} from '../../admin/timekeeping/utils';

export default function EmployeeAttendanceCorrectionsPage() {
  const [records, setRecords] = useState<AttendanceCorrection[]>([]);
  const [status, setStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [form, setForm] = useState({
    work_date: todayDate(),
    requested_time_in: '',
    requested_time_out: '',
    requested_status: 'present' as AttendanceStatus,
    reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await window.api.selfService.correctionList({ status });
      setRecords(result.data);
    } catch (reason) {
      setError(getErrorMessage(reason, 'Unable to load attendance corrections.'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await window.api.selfService.createCorrection(form);
      setMessage('Attendance correction submitted for review.');
      setForm((current) => ({ ...current, requested_time_in: '', requested_time_out: '', reason: '' }));
      await load();
    } catch (reason) {
      setError(getErrorMessage(reason, 'Unable to submit the attendance correction.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="self-page" aria-labelledby="self-corrections-title">
      <div className="self-heading"><div><span>Employee self-service</span><h1 id="self-corrections-title">Attendance Corrections</h1><p>Request changes to missing or incorrect attendance records.</p></div><Link className="self-button self-button--secondary" to="/employee/timekeeping">Back to timekeeping</Link></div>
      {error && <div className="self-alert self-alert--error">{error}</div>}
      {message && <div className="self-alert self-alert--success">{message}</div>}

      <form className="self-panel self-form" onSubmit={(event) => void submit(event)}>
        <div className="self-panel__heading"><div><h2>New correction request</h2><p>The request will remain pending until a supervisor or HR officer reviews it.</p></div></div>
        <div className="self-form-grid">
          <label><span>Work date</span><input type="date" value={form.work_date} onChange={(event) => setForm((current) => ({ ...current, work_date: event.target.value }))} required /></label>
          <label><span>Requested status</span><select value={form.requested_status} onChange={(event) => setForm((current) => ({ ...current, requested_status: event.target.value as AttendanceStatus }))}>{attendanceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label><span>Requested time in</span><input type="time" value={form.requested_time_in} onChange={(event) => setForm((current) => ({ ...current, requested_time_in: event.target.value }))} /></label>
          <label><span>Requested time out</span><input type="time" value={form.requested_time_out} onChange={(event) => setForm((current) => ({ ...current, requested_time_out: event.target.value }))} /></label>
          <label className="self-form-span"><span>Reason</span><textarea value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} rows={3} required /></label>
        </div>
        <div className="self-form-actions"><button className="self-button" type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit correction'}</button></div>
      </form>

      <article className="self-panel">
        <div className="self-panel__heading"><div><h2>Correction history</h2><p>{records.length} request{records.length === 1 ? '' : 's'}.</p></div><label className="self-inline-filter"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label></div>
        {loading ? <div className="self-empty">Loading correction requests…</div> : records.length === 0 ? <div className="self-empty">No correction requests are available.</div> : <div className="self-table-wrap"><table className="self-table"><thead><tr><th>Date</th><th>Original</th><th>Requested</th><th>Reason</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{formatDate(record.work_date)}</td><td>{record.original_time_in || '—'}–{record.original_time_out || '—'}<span>{getAttendanceStatusLabel(record.original_status)}</span></td><td>{record.requested_time_in || '—'}–{record.requested_time_out || '—'}<span>{getAttendanceStatusLabel(record.requested_status)}</span></td><td>{record.reason}</td><td><span className={`self-status self-status--${record.status}`}>{record.status}</span></td></tr>)}</tbody></table></div>}
      </article>
    </section>
  );
}
