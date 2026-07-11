import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  ScheduleAssignment,
  ScheduleAssignmentInput,
  WorkSchedule,
  WorkScheduleInput,
} from '../../../models/Attendance';
import type { Employee } from '../../../models/Employee';
import { formatDate, getErrorMessage, todayDate } from './utils';

interface ScheduleFormState {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: string;
  grace_minutes: string;
  standard_hours: string;
  is_active: boolean;
}

const emptySchedule: ScheduleFormState = {
  name: '',
  start_time: '08:00',
  end_time: '17:00',
  break_minutes: '60',
  grace_minutes: '5',
  standard_hours: '8',
  is_active: true,
};

const emptyAssignment: ScheduleAssignmentInput = {
  employee_id: '',
  schedule_id: '',
  effective_from: todayDate(),
  effective_to: '',
};

export default function WorkSchedulesPage() {
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(emptySchedule);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignmentForm, setAssignmentForm] = useState<ScheduleAssignmentInput>(emptyAssignment);
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [scheduleResult, assignmentResult, employeeResult] = await Promise.all([
        window.api.schedule.list({ include_inactive: true }),
        window.api.schedule.assignments(),
        window.api.employee.list({ status: 'active' }),
      ]);
      setSchedules(scheduleResult.data);
      setAssignments(assignmentResult.data);
      setEmployees(employeeResult.data);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load work schedules.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function editSchedule(schedule: WorkSchedule): void {
    setEditingId(schedule.id);
    setScheduleForm({
      name: schedule.name,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      break_minutes: String(schedule.break_minutes),
      grace_minutes: String(schedule.grace_minutes),
      standard_hours: String(schedule.standard_hours),
      is_active: schedule.is_active === 1,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetScheduleForm(): void {
    setEditingId(null);
    setScheduleForm(emptySchedule);
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSavingSchedule(true);
    setError(null);
    const payload: WorkScheduleInput = {
      name: scheduleForm.name,
      start_time: scheduleForm.start_time,
      end_time: scheduleForm.end_time,
      break_minutes: Number(scheduleForm.break_minutes),
      grace_minutes: Number(scheduleForm.grace_minutes),
      standard_hours: Number(scheduleForm.standard_hours),
      is_active: scheduleForm.is_active,
    };

    try {
      if (editingId) {
        await window.api.schedule.update(editingId, payload);
      } else {
        await window.api.schedule.create(payload);
      }
      resetScheduleForm();
      await loadData();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to save work schedule.'));
    } finally {
      setSavingSchedule(false);
    }
  }

  async function deleteSchedule(schedule: WorkSchedule): Promise<void> {
    if (!window.confirm(`Delete work schedule “${schedule.name}”?`)) return;
    setBusyId(schedule.id);
    setError(null);
    try {
      await window.api.schedule.delete(schedule.id);
      if (editingId === schedule.id) resetScheduleForm();
      await loadData();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to delete work schedule.'));
    } finally {
      setBusyId(null);
    }
  }

  async function saveAssignment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSavingAssignment(true);
    setError(null);
    try {
      await window.api.schedule.assign(assignmentForm);
      setAssignmentForm(emptyAssignment);
      await loadData();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to assign work schedule.'));
    } finally {
      setSavingAssignment(false);
    }
  }

  async function removeAssignment(assignment: ScheduleAssignment): Promise<void> {
    if (!window.confirm(`Remove ${assignment.schedule_name} from ${assignment.employee_name}?`)) return;
    setBusyId(assignment.id);
    setError(null);
    try {
      await window.api.schedule.unassign(assignment.id);
      await loadData();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to remove schedule assignment.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-page timekeeping-page" aria-labelledby="work-schedules-title">
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Timekeeping setup</span>
          <h2 id="work-schedules-title">Work schedules</h2>
          <p>Create shifts and assign them to employees for date-based attendance calculations.</p>
        </div>
        <Link className="timekeeping-secondary-link" to="/admin/timekeeping">
          Back to attendance
        </Link>
      </div>

      {error && <div className="timekeeping-alert timekeeping-alert--error">{error}</div>}

      <div className="timekeeping-two-column">
        <form className="timekeeping-form-section" onSubmit={(event) => void saveSchedule(event)}>
          <div className="timekeeping-form-section__heading">
            <h3>{editingId ? 'Edit work schedule' : 'Create work schedule'}</h3>
            <p>Supports day shifts and overnight shifts.</p>
          </div>
          <div className="timekeeping-form-grid">
            <label className="timekeeping-field timekeeping-field--wide">
              <span>Schedule name *</span>
              <input
                value={scheduleForm.name}
                onChange={(event) => setScheduleForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label className="timekeeping-field">
              <span>Start time *</span>
              <input
                type="time"
                value={scheduleForm.start_time}
                onChange={(event) => setScheduleForm((current) => ({ ...current, start_time: event.target.value }))}
                required
              />
            </label>
            <label className="timekeeping-field">
              <span>End time *</span>
              <input
                type="time"
                value={scheduleForm.end_time}
                onChange={(event) => setScheduleForm((current) => ({ ...current, end_time: event.target.value }))}
                required
              />
            </label>
            <label className="timekeeping-field">
              <span>Break minutes</span>
              <input
                type="number"
                min="0"
                step="1"
                value={scheduleForm.break_minutes}
                onChange={(event) => setScheduleForm((current) => ({ ...current, break_minutes: event.target.value }))}
              />
            </label>
            <label className="timekeeping-field">
              <span>Grace minutes</span>
              <input
                type="number"
                min="0"
                step="1"
                value={scheduleForm.grace_minutes}
                onChange={(event) => setScheduleForm((current) => ({ ...current, grace_minutes: event.target.value }))}
              />
            </label>
            <label className="timekeeping-field">
              <span>Standard hours</span>
              <input
                type="number"
                min="0.25"
                max="24"
                step="0.25"
                value={scheduleForm.standard_hours}
                onChange={(event) => setScheduleForm((current) => ({ ...current, standard_hours: event.target.value }))}
              />
            </label>
            <label className="timekeeping-checkbox">
              <input
                type="checkbox"
                checked={scheduleForm.is_active}
                onChange={(event) => setScheduleForm((current) => ({ ...current, is_active: event.target.checked }))}
              />
              <span>Active schedule</span>
            </label>
          </div>
          <div className="timekeeping-form-actions">
            {editingId && (
              <button className="timekeeping-secondary-button" type="button" onClick={resetScheduleForm}>
                Cancel edit
              </button>
            )}
            <button className="timekeeping-primary-button" type="submit" disabled={savingSchedule}>
              {savingSchedule ? 'Saving…' : editingId ? 'Save schedule' : 'Create schedule'}
            </button>
          </div>
        </form>

        <form className="timekeeping-form-section" onSubmit={(event) => void saveAssignment(event)}>
          <div className="timekeeping-form-section__heading">
            <h3>Assign schedule</h3>
            <p>The latest effective assignment is used for each work date.</p>
          </div>
          <div className="timekeeping-form-grid">
            <label className="timekeeping-field timekeeping-field--wide">
              <span>Employee *</span>
              <select
                value={assignmentForm.employee_id}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, employee_id: event.target.value }))}
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
            <label className="timekeeping-field timekeeping-field--wide">
              <span>Schedule *</span>
              <select
                value={assignmentForm.schedule_id}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, schedule_id: event.target.value }))}
                required
              >
                <option value="">Select schedule</option>
                {schedules.filter((schedule) => schedule.is_active === 1).map((schedule) => (
                  <option key={schedule.id} value={schedule.id}>{schedule.name}</option>
                ))}
              </select>
            </label>
            <label className="timekeeping-field">
              <span>Effective from *</span>
              <input
                type="date"
                value={assignmentForm.effective_from}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, effective_from: event.target.value }))}
                required
              />
            </label>
            <label className="timekeeping-field">
              <span>Effective to</span>
              <input
                type="date"
                value={assignmentForm.effective_to}
                onChange={(event) => setAssignmentForm((current) => ({ ...current, effective_to: event.target.value }))}
              />
            </label>
          </div>
          <div className="timekeeping-form-actions">
            <button className="timekeeping-primary-button" type="submit" disabled={savingAssignment}>
              {savingAssignment ? 'Assigning…' : 'Assign schedule'}
            </button>
          </div>
        </form>
      </div>

      <div className="timekeeping-table-card">
        <div className="timekeeping-table-card__header">
          <div><h3>Schedule definitions</h3><p>{schedules.length} schedule{schedules.length === 1 ? '' : 's'}.</p></div>
        </div>
        {loading ? <div className="timekeeping-empty-state">Loading schedules…</div> : (
          <div className="timekeeping-table-wrap">
            <table className="timekeeping-table timekeeping-table--compact">
              <thead><tr><th>Name</th><th>Time</th><th>Break</th><th>Grace</th><th>Hours</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {schedules.map((schedule) => (
                  <tr key={schedule.id}>
                    <td><strong>{schedule.name}</strong></td>
                    <td>{schedule.start_time}–{schedule.end_time}</td>
                    <td>{schedule.break_minutes} min</td>
                    <td>{schedule.grace_minutes} min</td>
                    <td>{schedule.standard_hours}</td>
                    <td>{schedule.is_active === 1 ? 'Active' : 'Inactive'}</td>
                    <td>
                      <div className="timekeeping-row-actions">
                        <button type="button" onClick={() => editSchedule(schedule)}>Edit</button>
                        <button
                          type="button"
                          className="timekeeping-row-actions__danger"
                          disabled={busyId === schedule.id}
                          onClick={() => void deleteSchedule(schedule)}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="timekeeping-table-card">
        <div className="timekeeping-table-card__header">
          <div><h3>Employee assignments</h3><p>{assignments.length} assignment{assignments.length === 1 ? '' : 's'}.</p></div>
        </div>
        {assignments.length === 0 ? <div className="timekeeping-empty-state">No employee schedule assignments yet.</div> : (
          <div className="timekeeping-table-wrap">
            <table className="timekeeping-table timekeeping-table--compact">
              <thead><tr><th>Employee</th><th>Schedule</th><th>Effective from</th><th>Effective to</th><th>Action</th></tr></thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td><strong>{assignment.employee_name}</strong><br /><small>{assignment.employee_number}</small></td>
                    <td>{assignment.schedule_name}</td>
                    <td>{formatDate(assignment.effective_from)}</td>
                    <td>{assignment.effective_to ? formatDate(assignment.effective_to) : 'Open-ended'}</td>
                    <td>
                      <button
                        className="timekeeping-link-button timekeeping-link-button--danger"
                        type="button"
                        disabled={busyId === assignment.id}
                        onClick={() => void removeAssignment(assignment)}
                      >Remove</button>
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
