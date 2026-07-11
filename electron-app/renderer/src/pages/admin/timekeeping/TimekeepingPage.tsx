import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  AttendanceListFilters,
  AttendanceRecord,
  AttendanceStatus,
  AttendanceSummary,
} from '../../../models/Attendance';
import type { Employee } from '../../../models/Employee';
import {
  attendanceStatusOptions,
  currentMonthRange,
  formatDate,
  formatHours,
  getAttendanceStatusLabel,
  getErrorMessage,
} from './utils';

const initialRange = currentMonthRange();

const emptySummary: AttendanceSummary = {
  total_records: 0,
  present_records: 0,
  absent_records: 0,
  incomplete_records: 0,
  records_with_late: 0,
  late_minutes: 0,
  undertime_minutes: 0,
  overtime_hours: 0,
};

export default function TimekeepingPage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>(emptySummary);
  const [filters, setFilters] = useState<Required<AttendanceListFilters>>({
    query: '',
    employee_id: '',
    status: 'all',
    date_from: initialRange.dateFrom,
    date_to: initialRange.dateTo,
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [attendanceResult, summaryResult, employeeResult] = await Promise.all([
        window.api.attendance.list(appliedFilters),
        window.api.attendance.summary(appliedFilters),
        window.api.employee.list({ status: 'active' }),
      ]);
      setRecords(attendanceResult.data);
      setSummary(summaryResult);
      setEmployees(employeeResult.data);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load attendance records.'));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setAppliedFilters({ ...filters });
  }

  function resetFilters(): void {
    const next = {
      query: '',
      employee_id: '',
      status: 'all' as const,
      date_from: initialRange.dateFrom,
      date_to: initialRange.dateTo,
    };
    setFilters(next);
    setAppliedFilters(next);
  }

  async function handleDelete(record: AttendanceRecord): Promise<void> {
    const confirmed = window.confirm(
      `Delete the attendance record for ${record.employee_name} on ${formatDate(record.work_date)}?`,
    );
    if (!confirmed) return;

    setBusyId(record.id);
    setError(null);
    try {
      await window.api.attendance.delete(record.id);
      await loadData();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to delete attendance record.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-page timekeeping-page" aria-labelledby="timekeeping-title">
      <div className="admin-page-heading timekeeping-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Attendance administration</span>
          <h2 id="timekeeping-title">Timekeeping</h2>
          <p>
            Record daily attendance, review computed hours, manage shifts, import logs,
            and process correction requests.
          </p>
        </div>
        <div className="timekeeping-heading__actions">
          <Link className="timekeeping-secondary-link" to="/admin/timekeeping/corrections">
            Corrections
          </Link>
          <Link className="timekeeping-secondary-link" to="/admin/timekeeping/schedules">
            Schedules
          </Link>
          <Link className="timekeeping-secondary-link" to="/admin/timekeeping/import">
            Import CSV
          </Link>
          <Link className="timekeeping-primary-link" to="/admin/timekeeping/new">
            Add attendance
          </Link>
        </div>
      </div>

      {error && <div className="timekeeping-alert timekeeping-alert--error">{error}</div>}

      <div className="timekeeping-summary-grid">
        <SummaryCard label="Records" value={summary.total_records} />
        <SummaryCard label="Present" value={summary.present_records} />
        <SummaryCard label="Absent" value={summary.absent_records} />
        <SummaryCard label="Incomplete" value={summary.incomplete_records} />
        <SummaryCard label="With late" value={summary.records_with_late} />
        <SummaryCard label="Late minutes" value={summary.late_minutes} />
        <SummaryCard label="Undertime minutes" value={summary.undertime_minutes} />
        <SummaryCard label="Overtime hours" value={formatHours(summary.overtime_hours)} />
      </div>

      <form className="timekeeping-toolbar" onSubmit={applyFilters}>
        <label className="timekeeping-field timekeeping-field--search">
          <span>Search</span>
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({
              ...current,
              query: event.target.value,
            }))}
            placeholder="Employee number, name, or department"
          />
        </label>
        <label className="timekeeping-field">
          <span>Employee</span>
          <select
            value={filters.employee_id}
            onChange={(event) => setFilters((current) => ({
              ...current,
              employee_id: event.target.value,
            }))}
          >
            <option value="">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_number} — {employee.name}
              </option>
            ))}
          </select>
        </label>
        <label className="timekeeping-field">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({
              ...current,
              status: event.target.value as 'all' | AttendanceStatus,
            }))}
          >
            <option value="all">All statuses</option>
            {attendanceStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="timekeeping-field">
          <span>From</span>
          <input
            type="date"
            value={filters.date_from}
            onChange={(event) => setFilters((current) => ({
              ...current,
              date_from: event.target.value,
            }))}
          />
        </label>
        <label className="timekeeping-field">
          <span>To</span>
          <input
            type="date"
            value={filters.date_to}
            onChange={(event) => setFilters((current) => ({
              ...current,
              date_to: event.target.value,
            }))}
          />
        </label>
        <div className="timekeeping-toolbar__actions">
          <button className="timekeeping-primary-button" type="submit">Apply</button>
          <button className="timekeeping-secondary-button" type="button" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </form>

      <div className="timekeeping-table-card">
        <div className="timekeeping-table-card__header">
          <div>
            <h3>Daily attendance</h3>
            <p>{records.length} record{records.length === 1 ? '' : 's'} in the selected range.</p>
          </div>
        </div>

        {loading ? (
          <div className="timekeeping-empty-state">Loading attendance records…</div>
        ) : records.length === 0 ? (
          <div className="timekeeping-empty-state">
            No attendance records match the selected filters.
          </div>
        ) : (
          <div className="timekeeping-table-wrap">
            <table className="timekeeping-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Schedule</th>
                  <th>Time in</th>
                  <th>Time out</th>
                  <th>Status</th>
                  <th>Worked</th>
                  <th>Late</th>
                  <th>Undertime</th>
                  <th>OT</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.work_date)}</td>
                    <td>
                      <div className="timekeeping-employee-cell">
                        <strong>{record.employee_name}</strong>
                        <span>{record.employee_number}</span>
                      </div>
                    </td>
                    <td>{record.schedule_name || 'Default / none'}</td>
                    <td>{record.time_in || '—'}</td>
                    <td>{record.time_out || '—'}</td>
                    <td>
                      <span className={`timekeeping-status timekeeping-status--${record.status}`}>
                        {getAttendanceStatusLabel(record.status)}
                      </span>
                    </td>
                    <td>{formatHours(record.hours_worked)} h</td>
                    <td>{record.late_minutes} min</td>
                    <td>{record.undertime_minutes} min</td>
                    <td>{formatHours(record.overtime_hours)} h</td>
                    <td>
                      <div className="timekeeping-row-actions">
                        <Link to={`/admin/timekeeping/${record.id}`}>View</Link>
                        <Link to={`/admin/timekeeping/${record.id}/edit`}>Edit</Link>
                        <button
                          type="button"
                          className="timekeeping-row-actions__danger"
                          disabled={busyId === record.id}
                          onClick={() => void handleDelete(record)}
                        >
                          Delete
                        </button>
                      </div>
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

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="timekeeping-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
