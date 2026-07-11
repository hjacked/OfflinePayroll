import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AttendanceListFilters, AttendanceRecord, AttendanceSummary } from '../../../models/Attendance';
import type { SelfServiceSchedule } from '../../../models/SelfService';
import {
  attendanceStatusOptions,
  currentMonthRange,
  formatDate,
  formatHours,
  getAttendanceStatusLabel,
  getErrorMessage,
} from '../../admin/timekeeping/utils';

const initialRange = currentMonthRange();

export default function EmployeeTimekeepingPage() {
  const [filters, setFilters] = useState<AttendanceListFilters>({
    status: 'all',
    date_from: initialRange.dateFrom,
    date_to: initialRange.dateTo,
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [schedule, setSchedule] = useState<SelfServiceSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [recordResult, summaryResult, scheduleResult] = await Promise.all([
        window.api.selfService.attendanceList(filters),
        window.api.selfService.attendanceSummary(filters),
        window.api.selfService.schedule(),
      ]);
      setRecords(recordResult.data);
      setSummary(summaryResult);
      setSchedule(scheduleResult);
    } catch (reason) {
      setError(getErrorMessage(reason, 'Unable to load your attendance records.'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="self-page" aria-labelledby="self-timekeeping-title">
      <div className="self-heading">
        <div>
          <span>Employee self-service</span>
          <h1 id="self-timekeeping-title">My Timekeeping</h1>
          <p>Review your attendance, schedule, late minutes, undertime, and overtime.</p>
        </div>
        <Link className="self-button" to="/employee/timekeeping/corrections">
          Attendance corrections
        </Link>
      </div>

      {error && <div className="self-alert self-alert--error">{error}</div>}

      <div className="self-summary-grid">
        <SummaryCard label="Attendance records" value={summary?.total_records ?? 0} />
        <SummaryCard label="Present days" value={summary?.present_records ?? 0} />
        <SummaryCard label="Late minutes" value={summary?.late_minutes ?? 0} />
        <SummaryCard label="Undertime minutes" value={summary?.undertime_minutes ?? 0} />
        <SummaryCard label="Overtime hours" value={formatHours(summary?.overtime_hours ?? 0)} />
      </div>

      <article className="self-panel">
        <div className="self-panel__heading">
          <div>
            <h2>Current work schedule</h2>
            <p>Your active schedule assignment as of today.</p>
          </div>
        </div>
        {schedule ? (
          <div className="self-schedule-card">
            <div><span>Schedule</span><strong>{schedule.schedule_name}</strong></div>
            <div><span>Working hours</span><strong>{schedule.start_time}–{schedule.end_time}</strong></div>
            <div><span>Break</span><strong>{schedule.break_minutes} minutes</strong></div>
            <div><span>Grace period</span><strong>{schedule.grace_minutes} minutes</strong></div>
          </div>
        ) : (
          <div className="self-empty">No active work schedule is assigned to your profile.</div>
        )}
      </article>

      <article className="self-panel">
        <div className="self-filter-grid">
          <label><span>Date from</span><input type="date" value={filters.date_from ?? ''} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} /></label>
          <label><span>Date to</span><input type="date" value={filters.date_to ?? ''} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} /></label>
          <label><span>Status</span><select value={filters.status ?? 'all'} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as AttendanceListFilters['status'] }))}><option value="all">All statuses</option>{attendanceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>

        {loading ? (
          <div className="self-empty">Loading attendance records…</div>
        ) : records.length === 0 ? (
          <div className="self-empty">No attendance records match the selected filters.</div>
        ) : (
          <div className="self-table-wrap">
            <table className="self-table">
              <thead><tr><th>Date</th><th>Status</th><th>Time in</th><th>Time out</th><th>Hours</th><th>Late</th><th>Undertime</th><th>Overtime</th></tr></thead>
              <tbody>{records.map((record) => <tr key={record.id}><td><strong>{formatDate(record.work_date)}</strong><span>{record.schedule_name || 'No schedule'}</span></td><td><span className={`self-status self-status--${record.status}`}>{getAttendanceStatusLabel(record.status)}</span></td><td>{record.time_in || '—'}</td><td>{record.time_out || '—'}</td><td>{formatHours(record.hours_worked)}</td><td>{record.late_minutes} min</td><td>{record.undertime_minutes} min</td><td>{formatHours(record.overtime_hours)} hr</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return <article className="self-summary-card"><span>{label}</span><strong>{value}</strong></article>;
}
