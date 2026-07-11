import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Employee } from '../../../models/Employee';
import type {
  LeaveBalance,
  LeaveDurationType,
  LeaveRequestInput,
  LeaveType,
} from '../../../models/Leave';
import {
  formatDays,
  getErrorMessage,
  leaveDurationOptions,
} from '../../admin/leave/utils';

const storageKey = 'payroll.selectedEmployeeId';

export default function EmployeeLeaveFormPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialEmployeeId = searchParams.get('employee')
    ?? localStorage.getItem(storageKey)
    ?? '';
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [form, setForm] = useState<LeaveRequestInput>({
    employee_id: initialEmployeeId,
    leave_type_id: '',
    start_date: '',
    end_date: '',
    duration_type: 'full-day',
    reason: '',
    attachment_reference: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const [employeeResult, typeResult] = await Promise.all([
          window.api.employee.list({ status: 'active' }),
          window.api.leaveType.list(),
        ]);
        if (cancelled) return;
        setEmployees(employeeResult.data);
        setLeaveTypes(typeResult.data);
        if (!form.employee_id && employeeResult.data[0]) {
          const firstId = employeeResult.data[0].id;
          setForm((current) => ({ ...current, employee_id: firstId }));
          localStorage.setItem(storageKey, firstId);
        }
      } catch (reason: unknown) {
        if (!cancelled) setError(getErrorMessage(reason, 'Unable to load the leave form.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form.employee_id || !form.start_date) {
      setBalances([]);
      return;
    }
    const year = Number(form.start_date.slice(0, 4));
    void window.api.leaveBalance.list({
      employee_id: form.employee_id,
      year,
    }).then((result) => setBalances(result.data)).catch(() => setBalances([]));
  }, [form.employee_id, form.start_date]);

  const selectedType = useMemo(
    () => leaveTypes.find((item) => item.id === form.leave_type_id) ?? null,
    [leaveTypes, form.leave_type_id],
  );
  const selectedBalance = useMemo(
    () => balances.find((item) => item.leave_type_id === form.leave_type_id) ?? null,
    [balances, form.leave_type_id],
  );

  function updateField<K extends keyof LeaveRequestInput>(
    key: K,
    value: LeaveRequestInput[K],
  ): void {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'employee_id') {
        localStorage.setItem(storageKey, String(value));
      }
      if (key === 'duration_type' && value !== 'full-day') {
        next.end_date = next.start_date;
      }
      if (key === 'start_date' && next.duration_type !== 'full-day') {
        next.end_date = String(value);
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const saved = await window.api.leaveRequest.create(form);
      navigate(`/employee/leave/${saved.id}`);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to submit the leave request.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="leave-empty-state">Loading leave form…</div>;

  return (
    <section className="employee-leave-page" aria-labelledby="employee-leave-form-title">
      <div className="employee-leave-heading">
        <div>
          <span>Employee self-service</span>
          <h1 id="employee-leave-form-title">File Leave Request</h1>
          <p>Submit a request for supervisor or HR review.</p>
        </div>
        <Link className="leave-secondary-link" to="/employee/leave">Back to My Leave</Link>
      </div>

      {error && <div className="leave-alert leave-alert--error">{error}</div>}

      <form className="leave-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="leave-form-section">
          <div className="leave-form-section__heading"><h3>Application</h3><p>Select the employee profile and leave entitlement.</p></div>
          <div className="leave-form-grid">
            <Field label="Employee profile" required>
              <select value={form.employee_id} onChange={(event) => updateField('employee_id', event.target.value)} required>
                <option value="">Select employee</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}
              </select>
            </Field>
            <Field label="Leave type" required>
              <select value={form.leave_type_id} onChange={(event) => updateField('leave_type_id', event.target.value)} required>
                <option value="">Select leave type</option>
                {leaveTypes.map((leaveType) => <option key={leaveType.id} value={leaveType.id}>{leaveType.code} — {leaveType.name}</option>)}
              </select>
            </Field>
          </div>
          {selectedType && (
            <div className="leave-entitlement-strip">
              <span>{selectedType.is_paid ? 'Paid leave' : 'Unpaid leave'}</span>
              <span>{selectedType.allow_half_day ? 'Half-day allowed' : 'Full-day only'}</span>
              {selectedType.track_balance === 1 && selectedBalance && <strong>{formatDays(selectedBalance.available)} day(s) available</strong>}
            </div>
          )}
        </div>

        <div className="leave-form-section">
          <div className="leave-form-section__heading"><h3>Schedule</h3><p>Weekend dates are excluded from the requested days.</p></div>
          <div className="leave-form-grid leave-form-grid--three">
            <Field label="Start date" required><input type="date" value={form.start_date} onChange={(event) => updateField('start_date', event.target.value)} required /></Field>
            <Field label="End date" required><input type="date" min={form.start_date || undefined} value={form.end_date} onChange={(event) => updateField('end_date', event.target.value)} required disabled={form.duration_type !== 'full-day'} /></Field>
            <Field label="Duration" required>
              <select value={form.duration_type} onChange={(event) => updateField('duration_type', event.target.value as LeaveDurationType)}>
                {leaveDurationOptions.map((option) => <option key={option.value} value={option.value} disabled={option.value !== 'full-day' && selectedType?.allow_half_day !== 1}>{option.label}</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div className="leave-form-section">
          <div className="leave-form-section__heading"><h3>Details</h3><p>Explain the reason and provide a supporting reference when required.</p></div>
          <div className="leave-form-grid">
            <Field label="Reason" required wide><textarea rows={5} value={form.reason} onChange={(event) => updateField('reason', event.target.value)} required /></Field>
            <Field label={selectedType?.require_attachment ? 'Supporting document reference' : 'Supporting document reference (optional)'} required={selectedType?.require_attachment === 1} wide><input value={form.attachment_reference} onChange={(event) => updateField('attachment_reference', event.target.value)} required={selectedType?.require_attachment === 1} /></Field>
          </div>
        </div>

        <div className="leave-form-actions">
          <Link className="leave-secondary-link" to="/employee/leave">Cancel</Link>
          <button className="leave-primary-button" type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit request'}</button>
        </div>
      </form>
    </section>
  );
}

function Field({ label, required = false, wide = false, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={`leave-field${wide ? ' leave-field--wide' : ''}`}><span>{label}{required && <em> *</em>}</span>{children}</label>;
}
