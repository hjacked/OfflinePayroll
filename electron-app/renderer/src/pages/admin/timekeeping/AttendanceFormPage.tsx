import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  AttendanceInput,
  AttendanceSource,
  AttendanceStatus,
  WorkSchedule,
} from '../../../models/Attendance';
import type { Employee } from '../../../models/Employee';
import {
  attendanceStatusOptions,
  getErrorMessage,
  todayDate,
} from './utils';

interface AttendanceFormState {
  employee_id: string;
  work_date: string;
  schedule_id: string;
  time_in: string;
  time_out: string;
  break_minutes: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  notes: string;
}

const emptyForm: AttendanceFormState = {
  employee_id: '',
  work_date: todayDate(),
  schedule_id: '',
  time_in: '',
  time_out: '',
  break_minutes: '',
  status: 'present',
  source: 'manual',
  notes: '',
};

export default function AttendanceFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [form, setForm] = useState<AttendanceFormState>(emptyForm);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      window.api.employee.list({ status: 'active' }),
      window.api.schedule.list({ include_inactive: false }),
      id ? window.api.attendance.get(id) : Promise.resolve(null),
    ])
      .then(([employeeResult, scheduleResult, record]) => {
        if (cancelled) return;
        setEmployees(employeeResult.data);
        setSchedules(scheduleResult.data);
        if (record) {
          setForm({
            employee_id: record.employee_id,
            work_date: record.work_date,
            schedule_id: record.schedule_id,
            time_in: record.time_in,
            time_out: record.time_out,
            break_minutes: String(record.break_minutes),
            status: record.status,
            source: record.source,
            notes: record.notes,
          });
        } else if (id) {
          setError('Attendance record was not found.');
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(reason, 'Unable to load attendance form data.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateField<K extends keyof AttendanceFormState>(
    key: K,
    value: AttendanceFormState[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: AttendanceInput = {
        employee_id: form.employee_id,
        work_date: form.work_date,
        schedule_id: form.schedule_id,
        time_in: form.time_in,
        time_out: form.time_out,
        break_minutes: form.break_minutes === '' ? null : Number(form.break_minutes),
        status: form.status,
        source: form.source,
        notes: form.notes,
      };

      const saved = id
        ? await window.api.attendance.update(id, payload)
        : await window.api.attendance.create(payload);
      navigate(`/admin/timekeeping/${saved.id}`, { replace: true });
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to save attendance record.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="timekeeping-empty-state">Loading attendance form…</div>;
  }

  return (
    <section className="admin-page timekeeping-page" aria-labelledby="attendance-form-title">
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Timekeeping</span>
          <h2 id="attendance-form-title">
            {isEditing ? 'Edit attendance' : 'Add attendance'}
          </h2>
          <p>
            Select an employee and work date. Hours, late, undertime, overtime,
            and night differential are calculated automatically from the shift.
          </p>
        </div>
        <Link className="timekeeping-secondary-link" to="/admin/timekeeping">
          Back to attendance
        </Link>
      </div>

      {error && <div className="timekeeping-alert timekeeping-alert--error">{error}</div>}

      <form className="timekeeping-form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="timekeeping-form-section">
          <div className="timekeeping-form-section__heading">
            <h3>Attendance details</h3>
            <p>Employee, work date, shift, status, and attendance source.</p>
          </div>
          <div className="timekeeping-form-grid">
            <Field label="Employee" required>
              <select
                value={form.employee_id}
                onChange={(event) => updateField('employee_id', event.target.value)}
                required
              >
                <option value="">Select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_number} — {employee.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Work date" required>
              <input
                type="date"
                value={form.work_date}
                onChange={(event) => updateField('work_date', event.target.value)}
                required
              />
            </Field>
            <Field label="Work schedule">
              <select
                value={form.schedule_id}
                onChange={(event) => updateField('schedule_id', event.target.value)}
              >
                <option value="">Use assigned/default schedule</option>
                {schedules.map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>
                    {schedule.name} ({schedule.start_time}–{schedule.end_time})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Attendance status" required>
              <select
                value={form.status}
                onChange={(event) => updateField(
                  'status',
                  event.target.value as AttendanceStatus,
                )}
              >
                {attendanceStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select
                value={form.source}
                onChange={(event) => updateField(
                  'source',
                  event.target.value as AttendanceSource,
                )}
              >
                <option value="manual">Manual</option>
                <option value="biometric">Biometric</option>
                <option value="csv-import">CSV import</option>
                <option value="employee-correction">Employee correction</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="timekeeping-form-section">
          <div className="timekeeping-form-section__heading">
            <h3>Time logs</h3>
            <p>Leave time fields blank for absences, leave, rest days, and holidays.</p>
          </div>
          <div className="timekeeping-form-grid">
            <Field label="Time in">
              <input
                type="time"
                value={form.time_in}
                onChange={(event) => updateField('time_in', event.target.value)}
              />
            </Field>
            <Field label="Time out">
              <input
                type="time"
                value={form.time_out}
                onChange={(event) => updateField('time_out', event.target.value)}
              />
            </Field>
            <Field label="Break minutes">
              <input
                type="number"
                min="0"
                max="1440"
                step="1"
                value={form.break_minutes}
                onChange={(event) => updateField('break_minutes', event.target.value)}
                placeholder="Use schedule default"
              />
            </Field>
            <Field label="Notes" wide>
              <textarea
                rows={4}
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                placeholder="Optional attendance remarks"
              />
            </Field>
          </div>
        </div>

        <div className="timekeeping-form-actions">
          <Link className="timekeeping-secondary-link" to="/admin/timekeeping">
            Cancel
          </Link>
          <button className="timekeeping-primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create attendance'}
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
    <label className={`timekeeping-field${wide ? ' timekeeping-field--wide' : ''}`}>
      <span>{label}{required && <em> *</em>}</span>
      {children}
    </label>
  );
}
