import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LeaveBalance, LeaveDurationType, LeaveType } from '../../../models/Leave';
import { formatDays, getErrorMessage, leaveDurationOptions } from '../../admin/leave/utils';

export default function EmployeeLeaveFormPage() {
  const navigate = useNavigate();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', duration_type: 'full-day' as LeaveDurationType, reason: '', attachment_reference: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.api.selfService.leaveTypes().then((result) => setLeaveTypes(result.data)).catch((reason: unknown) => setError(getErrorMessage(reason, 'Unable to load leave types.'))).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const year = Number((form.start_date || String(new Date().getFullYear())).slice(0, 4));
    void window.api.selfService.leaveBalances({ year }).then((result) => setBalances(result.data)).catch(() => setBalances([]));
  }, [form.start_date]);

  const selectedType = useMemo(() => leaveTypes.find((item) => item.id === form.leave_type_id) ?? null, [leaveTypes, form.leave_type_id]);
  const selectedBalance = useMemo(() => balances.find((item) => item.leave_type_id === form.leave_type_id) ?? null, [balances, form.leave_type_id]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'duration_type' && value !== 'full-day') next.end_date = next.start_date;
      if (key === 'start_date' && next.duration_type !== 'full-day') next.end_date = String(value);
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await window.api.selfService.createLeaveRequest(form);
      navigate(`/employee/leave/${saved.id}`);
    } catch (reason) {
      setError(getErrorMessage(reason, 'Unable to submit the leave request.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="leave-empty-state">Loading leave form…</div>;
  return <section className="employee-leave-page" aria-labelledby="employee-leave-form-title"><div className="employee-leave-heading"><div><span>Employee self-service</span><h1 id="employee-leave-form-title">File Leave Request</h1><p>Submit a request for supervisor or HR review.</p></div><Link className="leave-secondary-link" to="/employee/leave">Back to My Leave</Link></div>{error && <div className="leave-alert leave-alert--error">{error}</div>}<form className="leave-form" onSubmit={(event) => void submit(event)}><div className="leave-form-section"><div className="leave-form-section__heading"><h3>Application</h3><p>Select your leave entitlement and requested dates.</p></div><div className="leave-form-grid"><Field label="Leave type" required><select value={form.leave_type_id} onChange={(event) => update('leave_type_id', event.target.value)} required><option value="">Select leave type</option>{leaveTypes.map((leaveType) => <option key={leaveType.id} value={leaveType.id}>{leaveType.code} — {leaveType.name}</option>)}</select></Field><Field label="Duration" required><select value={form.duration_type} onChange={(event) => update('duration_type', event.target.value as LeaveDurationType)}>{leaveDurationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Start date" required><input type="date" value={form.start_date} onChange={(event) => update('start_date', event.target.value)} required /></Field><Field label="End date" required><input type="date" value={form.end_date} onChange={(event) => update('end_date', event.target.value)} min={form.start_date} disabled={form.duration_type !== 'full-day'} required /></Field><Field label="Reason" required wide><textarea rows={4} value={form.reason} onChange={(event) => update('reason', event.target.value)} required /></Field><Field label="Supporting reference" wide><input value={form.attachment_reference} onChange={(event) => update('attachment_reference', event.target.value)} placeholder="Document name, clinic reference, or file path" /></Field></div>{selectedType && <div className="leave-form-note">{selectedType.track_balance ? <>Available balance: <strong>{selectedBalance ? formatDays(selectedBalance.available) : '0.00'} day(s)</strong></> : 'This leave type does not use a tracked balance.'}</div>}</div><div className="leave-form-actions"><Link className="leave-secondary-link" to="/employee/leave">Cancel</Link><button className="leave-primary-button" type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit request'}</button></div></form></section>;
}

function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={`leave-field${wide ? ' leave-field--wide' : ''}`}><span>{label}{required ? ' *' : ''}</span>{children}</label>;
}
