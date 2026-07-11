import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
} from './utils';

interface FormState {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  duration_type: LeaveDurationType;
  reason: string;
  attachment_reference: string;
}

const emptyForm: FormState = {
  employee_id: '',
  leave_type_id: '',
  start_date: '',
  end_date: '',
  duration_type: 'full-day',
  reason: '',
  attachment_reference: '',
};

export default function LeaveRequestFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const [employeeResult, typeResult, request] = await Promise.all([
          window.api.employee.list({ status: 'active' }),
          window.api.leaveType.list(),
          id ? window.api.leaveRequest.get(id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setEmployees(employeeResult.data);
        setLeaveTypes(typeResult.data);
        if (id) {
          if (!request) throw new Error('Leave request was not found.');
          if (request.status !== 'pending') {
            throw new Error('Only pending leave requests can be edited.');
          }
          setForm({
            employee_id: request.employee_id,
            leave_type_id: request.leave_type_id,
            start_date: request.start_date,
            end_date: request.end_date,
            duration_type: request.duration_type,
            reason: request.reason,
            attachment_reference: request.attachment_reference,
          });
        }
      } catch (reason: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(reason, 'Unable to load the leave form.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!form.employee_id || !form.start_date) {
      setBalances([]);
      return;
    }
    let cancelled = false;
    const year = Number(form.start_date.slice(0, 4));
    void window.api.leaveBalance.list({
      employee_id: form.employee_id,
      year,
    }).then((result) => {
      if (!cancelled) setBalances(result.data);
    }).catch(() => {
      if (!cancelled) setBalances([]);
    });
    return () => {
      cancelled = true;
    };
  }, [form.employee_id, form.start_date]);

  const selectedType = useMemo(
    () => leaveTypes.find((item) => item.id === form.leave_type_id) ?? null,
    [leaveTypes, form.leave_type_id],
  );
  const selectedBalance = useMemo(
    () => balances.find((item) => item.leave_type_id === form.leave_type_id) ?? null,
    [balances, form.leave_type_id],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => {
      const next = { ...current, [key]: value };
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
    const payload: LeaveRequestInput = {
      ...form,
    };
    try {
      const saved = isEditing && id
        ? await window.api.leaveRequest.update(id, payload)
        : await window.api.leaveRequest.create(payload);
      navigate(`/admin/leave-management/${saved.id}`);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to save the leave request.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="leave-empty-state">Loading leave request…</div>;
  }

  return (
    <section className="admin-page leave-page" aria-labelledby="leave-form-title">
      <div className="admin-page-heading leave-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Leave application</span>
          <h2 id="leave-form-title">{isEditing ? 'Edit leave request' : 'File leave request'}</h2>
          <p>Submit a pending request for review. Approved requests automatically update Timekeeping.</p>
        </div>
      </div>

      {error && <div className="leave-alert leave-alert--error">{error}</div>}

      <form className="leave-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="leave-form-section">
          <div className="leave-form-section__heading">
            <h3>Employee and entitlement</h3>
            <p>Select the employee and applicable leave category.</p>
          </div>
          <div className="leave-form-grid">
            <Field label="Employee" required>
              <select
                value={form.employee_id}
                onChange={(event) => updateField('employee_id', event.target.value)}
                required
                disabled={isEditing}
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_number} — {employee.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Leave type" required>
              <select
                value={form.leave_type_id}
                onChange={(event) => updateField('leave_type_id', event.target.value)}
                required
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((leaveType) => (
                  <option key={leaveType.id} value={leaveType.id}>
                    {leaveType.code} — {leaveType.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedType && (
            <div className="leave-entitlement-strip">
              <span>{selectedType.is_paid ? 'Paid leave' : 'Unpaid leave'}</span>
              <span>{selectedType.track_balance ? 'Balance tracked' : 'No balance tracking'}</span>
              <span>{selectedType.allow_half_day ? 'Half-day allowed' : 'Full-day only'}</span>
              {selectedType.track_balance === 1 && selectedBalance && (
                <strong>{formatDays(selectedBalance.available)} day(s) available</strong>
              )}
            </div>
          )}
        </div>

        <div className="leave-form-section">
          <div className="leave-form-section__heading">
            <h3>Leave schedule</h3>
            <p>Weekend dates are excluded from the calculated leave days.</p>
          </div>
          <div className="leave-form-grid leave-form-grid--three">
            <Field label="Start date" required>
              <input
                type="date"
                value={form.start_date}
                onChange={(event) => updateField('start_date', event.target.value)}
                required
              />
            </Field>
            <Field label="End date" required>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date || undefined}
                onChange={(event) => updateField('end_date', event.target.value)}
                required
                disabled={form.duration_type !== 'full-day'}
              />
            </Field>
            <Field label="Duration" required>
              <select
                value={form.duration_type}
                onChange={(event) => updateField(
                  'duration_type',
                  event.target.value as LeaveDurationType,
                )}
              >
                {leaveDurationOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.value !== 'full-day' && selectedType?.allow_half_day !== 1}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="leave-form-section">
          <div className="leave-form-section__heading">
            <h3>Request details</h3>
            <p>Provide enough information for the approving officer to review the request.</p>
          </div>
          <div className="leave-form-grid">
            <Field label="Reason" required wide>
              <textarea
                rows={5}
                value={form.reason}
                onChange={(event) => updateField('reason', event.target.value)}
                placeholder="Reason for leave"
                required
              />
            </Field>
            <Field
              label={selectedType?.require_attachment === 1
                ? 'Supporting document reference'
                : 'Supporting document reference (optional)'}
              required={selectedType?.require_attachment === 1}
              wide
            >
              <input
                value={form.attachment_reference}
                onChange={(event) => updateField('attachment_reference', event.target.value)}
                placeholder="Filename, document number, or local reference"
                required={selectedType?.require_attachment === 1}
              />
            </Field>
          </div>
        </div>

        <div className="leave-form-actions">
          <Link className="leave-secondary-link" to="/admin/leave-management">Cancel</Link>
          <button className="leave-primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Submit request'}
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  required = false,
  wide = false,
  children,
}: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`leave-field${wide ? ' leave-field--wide' : ''}`}>
      <span>{label}{required && <em> *</em>}</span>
      {children}
    </label>
  );
}
