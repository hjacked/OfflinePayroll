import { randomUUID } from 'node:crypto';
import { getDb } from '../db';

export const attendanceStatuses = [
  'present',
  'absent',
  'leave',
  'rest-day',
  'holiday',
  'official-business',
  'work-from-home',
  'incomplete',
] as const;

export const attendanceSources = [
  'manual',
  'csv-import',
  'biometric',
  'employee-correction',
] as const;

export type AttendanceStatus = typeof attendanceStatuses[number];
export type AttendanceSource = typeof attendanceSources[number];

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  work_date: string;
  schedule_id: string;
  schedule_name: string;
  scheduled_time_in: string;
  scheduled_time_out: string;
  time_in: string;
  time_out: string;
  break_minutes: number;
  hours_worked: number;
  regular_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  overtime_hours: number;
  night_diff_hours: number;
  status: AttendanceStatus;
  source: AttendanceSource;
  notes: string;
  payroll_period_id: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceListFilters {
  query?: string;
  employee_id?: string;
  status?: 'all' | AttendanceStatus;
  date_from?: string;
  date_to?: string;
}

export interface AttendanceSummary {
  total_records: number;
  present_records: number;
  absent_records: number;
  incomplete_records: number;
  records_with_late: number;
  late_minutes: number;
  undertime_minutes: number;
  overtime_hours: number;
}

export interface WorkScheduleRecord {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  grace_minutes: number;
  standard_hours: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleAssignmentRecord {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  schedule_id: string;
  schedule_name: string;
  effective_from: string;
  effective_to: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceCorrectionRecord {
  id: string;
  attendance_id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  work_date: string;
  original_time_in: string;
  original_time_out: string;
  original_status: string;
  requested_time_in: string;
  requested_time_out: string;
  requested_status: AttendanceStatus;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_notes: string;
  reviewed_at: string;
  created_at: string;
  updated_at: string;
}

interface AttendanceInput {
  employee_id: string;
  work_date: string;
  schedule_id: string;
  time_in: string;
  time_out: string;
  break_minutes: number | null;
  status: AttendanceStatus;
  source: AttendanceSource;
  notes: string;
  payroll_period_id: string;
}

interface WorkScheduleInput {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  grace_minutes: number;
  standard_hours: number;
  is_active: number;
}

interface ResolvedSchedule {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  grace_minutes: number;
  standard_hours: number;
}

interface AttendanceMetrics {
  status: AttendanceStatus;
  break_minutes: number;
  hours_worked: number;
  regular_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  overtime_hours: number;
  night_diff_hours: number;
}

const attendanceSelect = `
  SELECT
    attendance_records.id,
    attendance_records.employee_id,
    employees.employee_number,
    employees.name AS employee_name,
    COALESCE(employees.department, '') AS department,
    attendance_records.work_date,
    COALESCE(attendance_records.schedule_id, '') AS schedule_id,
    COALESCE(work_schedules.name, '') AS schedule_name,
    COALESCE(attendance_records.scheduled_time_in, '') AS scheduled_time_in,
    COALESCE(attendance_records.scheduled_time_out, '') AS scheduled_time_out,
    COALESCE(attendance_records.time_in, '') AS time_in,
    COALESCE(attendance_records.time_out, '') AS time_out,
    attendance_records.break_minutes,
    attendance_records.hours_worked,
    attendance_records.regular_hours,
    attendance_records.late_minutes,
    attendance_records.undertime_minutes,
    attendance_records.overtime_hours,
    attendance_records.night_diff_hours,
    attendance_records.status,
    attendance_records.source,
    COALESCE(attendance_records.notes, '') AS notes,
    COALESCE(attendance_records.payroll_period_id, '') AS payroll_period_id,
    attendance_records.created_at,
    attendance_records.updated_at
  FROM attendance_records
  INNER JOIN employees ON employees.id = attendance_records.employee_id
  LEFT JOIN work_schedules ON work_schedules.id = attendance_records.schedule_id
`;

const correctionSelect = `
  SELECT
    attendance_corrections.id,
    COALESCE(attendance_corrections.attendance_id, '') AS attendance_id,
    attendance_corrections.employee_id,
    employees.employee_number,
    employees.name AS employee_name,
    attendance_corrections.work_date,
    COALESCE(attendance_records.time_in, '') AS original_time_in,
    COALESCE(attendance_records.time_out, '') AS original_time_out,
    COALESCE(attendance_records.status, '') AS original_status,
    COALESCE(attendance_corrections.requested_time_in, '') AS requested_time_in,
    COALESCE(attendance_corrections.requested_time_out, '') AS requested_time_out,
    attendance_corrections.requested_status,
    attendance_corrections.reason,
    attendance_corrections.status,
    COALESCE(attendance_corrections.reviewer_notes, '') AS reviewer_notes,
    COALESCE(attendance_corrections.reviewed_at, '') AS reviewed_at,
    attendance_corrections.created_at,
    attendance_corrections.updated_at
  FROM attendance_corrections
  INNER JOIN employees ON employees.id = attendance_corrections.employee_id
  LEFT JOIN attendance_records ON attendance_records.id = attendance_corrections.attendance_id
`;

export async function getAttendanceRecords(filters?: unknown): Promise<{
  data: AttendanceRecord[];
  total: number;
}> {
  const { whereClause, values } = buildAttendanceWhereClause(filters);
  const rows = await getDb().all<AttendanceRecord[]>(
    `${attendanceSelect}
     ${whereClause}
     ORDER BY attendance_records.work_date DESC,
              employees.last_name COLLATE NOCASE ASC,
              employees.first_name COLLATE NOCASE ASC,
              employees.name COLLATE NOCASE ASC`,
    ...values,
  );

  return { data: rows, total: rows.length };
}

export async function getAttendanceRecord(
  id: string,
): Promise<AttendanceRecord | null> {
  const row = await getDb().get<AttendanceRecord>(
    `${attendanceSelect} WHERE attendance_records.id = ?`,
    id,
  );
  return row ?? null;
}

export async function getAttendanceSummary(
  filters?: unknown,
): Promise<AttendanceSummary> {
  const { whereClause, values } = buildAttendanceWhereClause(filters);
  const row = await getDb().get<AttendanceSummary>(
    `SELECT
       COUNT(*) AS total_records,
       SUM(CASE WHEN status IN ('present', 'official-business', 'work-from-home') THEN 1 ELSE 0 END) AS present_records,
       SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_records,
       SUM(CASE WHEN status = 'incomplete' THEN 1 ELSE 0 END) AS incomplete_records,
       SUM(CASE WHEN late_minutes > 0 THEN 1 ELSE 0 END) AS records_with_late,
       COALESCE(SUM(late_minutes), 0) AS late_minutes,
       COALESCE(SUM(undertime_minutes), 0) AS undertime_minutes,
       COALESCE(SUM(overtime_hours), 0) AS overtime_hours
     FROM attendance_records
     INNER JOIN employees ON employees.id = attendance_records.employee_id
     ${whereClause}`,
    ...values,
  );

  return {
    total_records: Number(row?.total_records ?? 0),
    present_records: Number(row?.present_records ?? 0),
    absent_records: Number(row?.absent_records ?? 0),
    incomplete_records: Number(row?.incomplete_records ?? 0),
    records_with_late: Number(row?.records_with_late ?? 0),
    late_minutes: Number(row?.late_minutes ?? 0),
    undertime_minutes: Number(row?.undertime_minutes ?? 0),
    overtime_hours: roundHours(Number(row?.overtime_hours ?? 0)),
  };
}

export async function createAttendanceRecord(
  payload: unknown,
): Promise<AttendanceRecord> {
  const input = validateAttendanceInput(payload);
  return saveAttendanceRecord(`att_${randomUUID()}`, input, false);
}

export async function updateAttendanceRecord(
  id: string,
  payload: unknown,
): Promise<AttendanceRecord> {
  await requireAttendanceRecord(id);
  const input = validateAttendanceInput(payload);
  return saveAttendanceRecord(id, input, true);
}

export async function deleteAttendanceRecord(id: string): Promise<{ id: string }> {
  const result = await getDb().run('DELETE FROM attendance_records WHERE id = ?', id);
  if ((result.changes ?? 0) === 0) {
    throw new Error('Attendance record was not found.');
  }
  return { id };
}

export async function importAttendanceRows(payload: unknown): Promise<{
  imported: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}> {
  if (!Array.isArray(payload)) {
    throw new Error('Attendance import rows are required.');
  }
  if (payload.length === 0) {
    throw new Error('The attendance import file has no data rows.');
  }
  if (payload.length > 5000) {
    throw new Error('A maximum of 5,000 attendance rows can be imported at once.');
  }

  let imported = 0;
  let updated = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let index = 0; index < payload.length; index += 1) {
    try {
      const raw = payload[index];
      if (!isRecord(raw)) {
        throw new Error('Row is not a valid record.');
      }

      const employeeNumber = readString(raw, 'employee_number');
      const employee = await getDb().get<{ id: string }>(
        `SELECT id FROM employees
          WHERE employee_number = ? COLLATE NOCASE`,
        employeeNumber,
      );
      if (!employee) {
        throw new Error(`Employee number ${employeeNumber || '(blank)'} was not found.`);
      }

      const workDate = readString(raw, 'work_date');
      const scheduleName = readString(raw, 'schedule_name');
      let scheduleId = readString(raw, 'schedule_id');
      if (!scheduleId && scheduleName) {
        const schedule = await getDb().get<{ id: string }>(
          'SELECT id FROM work_schedules WHERE name = ? COLLATE NOCASE',
          scheduleName,
        );
        if (!schedule) {
          throw new Error(`Schedule ${scheduleName} was not found.`);
        }
        scheduleId = schedule.id;
      }

      const existing = await getDb().get<{ id: string }>(
        `SELECT id FROM attendance_records
          WHERE employee_id = ? AND work_date = ?`,
        employee.id,
        workDate,
      );

      const attendanceInput = validateAttendanceInput({
        employee_id: employee.id,
        work_date: workDate,
        schedule_id: scheduleId,
        time_in: readString(raw, 'time_in'),
        time_out: readString(raw, 'time_out'),
        break_minutes: raw.break_minutes,
        status: readString(raw, 'status') || 'present',
        source: 'csv-import',
        notes: readString(raw, 'notes'),
      });

      if (existing) {
        await saveAttendanceRecord(existing.id, attendanceInput, true);
        updated += 1;
      } else {
        await saveAttendanceRecord(`att_${randomUUID()}`, attendanceInput, false);
        imported += 1;
      }
    } catch (error) {
      errors.push({
        row: index + 2,
        message: getErrorMessage(error),
      });
    }
  }

  return {
    imported,
    updated,
    failed: errors.length,
    errors,
  };
}

export async function getWorkSchedules(filters?: unknown): Promise<{
  data: WorkScheduleRecord[];
  total: number;
}> {
  const includeInactive = isRecord(filters) && filters.include_inactive === true;
  const rows = await getDb().all<WorkScheduleRecord[]>(
    `SELECT id, name, start_time, end_time, break_minutes, grace_minutes,
            standard_hours, is_active, created_at, updated_at
       FROM work_schedules
      ${includeInactive ? '' : 'WHERE is_active = 1'}
      ORDER BY is_active DESC, name COLLATE NOCASE ASC`,
  );
  return { data: rows, total: rows.length };
}

export async function createWorkSchedule(payload: unknown): Promise<WorkScheduleRecord> {
  const input = validateWorkScheduleInput(payload);
  const id = `schedule_${randomUUID()}`;

  try {
    await getDb().run(
      `INSERT INTO work_schedules (
        id, name, start_time, end_time, break_minutes, grace_minutes,
        standard_hours, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id,
      input.name,
      input.start_time,
      input.end_time,
      input.break_minutes,
      input.grace_minutes,
      input.standard_hours,
      input.is_active,
    );
  } catch (error) {
    throw translateScheduleError(error);
  }

  return requireWorkSchedule(id);
}

export async function updateWorkSchedule(
  id: string,
  payload: unknown,
): Promise<WorkScheduleRecord> {
  await requireWorkSchedule(id);
  const input = validateWorkScheduleInput(payload);

  try {
    await getDb().run(
      `UPDATE work_schedules
          SET name = ?, start_time = ?, end_time = ?, break_minutes = ?,
              grace_minutes = ?, standard_hours = ?, is_active = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
      input.name,
      input.start_time,
      input.end_time,
      input.break_minutes,
      input.grace_minutes,
      input.standard_hours,
      input.is_active,
      id,
    );
  } catch (error) {
    throw translateScheduleError(error);
  }

  return requireWorkSchedule(id);
}

export async function deleteWorkSchedule(id: string): Promise<{ id: string }> {
  const count = await getDb().get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM work_schedules;',
  );
  if ((count?.count ?? 0) <= 1) {
    throw new Error('At least one work schedule must remain in the system.');
  }

  const result = await getDb().run('DELETE FROM work_schedules WHERE id = ?', id);
  if ((result.changes ?? 0) === 0) {
    throw new Error('Work schedule was not found.');
  }
  return { id };
}

export async function getScheduleAssignments(filters?: unknown): Promise<{
  data: ScheduleAssignmentRecord[];
  total: number;
}> {
  const employeeId = isRecord(filters) ? readString(filters, 'employee_id') : '';
  const rows = await getDb().all<ScheduleAssignmentRecord[]>(
    `SELECT
       employee_schedule_assignments.id,
       employee_schedule_assignments.employee_id,
       employees.employee_number,
       employees.name AS employee_name,
       employee_schedule_assignments.schedule_id,
       work_schedules.name AS schedule_name,
       employee_schedule_assignments.effective_from,
       COALESCE(employee_schedule_assignments.effective_to, '') AS effective_to,
       employee_schedule_assignments.created_at,
       employee_schedule_assignments.updated_at
     FROM employee_schedule_assignments
     INNER JOIN employees ON employees.id = employee_schedule_assignments.employee_id
     INNER JOIN work_schedules ON work_schedules.id = employee_schedule_assignments.schedule_id
     ${employeeId ? 'WHERE employee_schedule_assignments.employee_id = ?' : ''}
     ORDER BY employee_schedule_assignments.effective_from DESC,
              employees.name COLLATE NOCASE ASC`,
    ...(employeeId ? [employeeId] : []),
  );
  return { data: rows, total: rows.length };
}

export async function assignWorkSchedule(
  payload: unknown,
): Promise<ScheduleAssignmentRecord> {
  if (!isRecord(payload)) {
    throw new Error('Schedule assignment information is required.');
  }

  const employeeId = readString(payload, 'employee_id');
  const scheduleId = readString(payload, 'schedule_id');
  const effectiveFrom = readString(payload, 'effective_from');
  const effectiveTo = readString(payload, 'effective_to');

  await requireEmployee(employeeId);
  await requireWorkSchedule(scheduleId);
  requireDate(effectiveFrom, 'Effective-from date');
  if (effectiveTo) {
    requireDate(effectiveTo, 'Effective-to date');
    if (effectiveTo < effectiveFrom) {
      throw new Error('Effective-to date cannot be earlier than effective-from date.');
    }
  }

  const id = `assignment_${randomUUID()}`;
  await getDb().run(
    `INSERT INTO employee_schedule_assignments (
      id, employee_id, schedule_id, effective_from, effective_to,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id,
    employeeId,
    scheduleId,
    effectiveFrom,
    effectiveTo || null,
  );

  const assignment = await getDb().get<ScheduleAssignmentRecord>(
    `SELECT
       employee_schedule_assignments.id,
       employee_schedule_assignments.employee_id,
       employees.employee_number,
       employees.name AS employee_name,
       employee_schedule_assignments.schedule_id,
       work_schedules.name AS schedule_name,
       employee_schedule_assignments.effective_from,
       COALESCE(employee_schedule_assignments.effective_to, '') AS effective_to,
       employee_schedule_assignments.created_at,
       employee_schedule_assignments.updated_at
     FROM employee_schedule_assignments
     INNER JOIN employees ON employees.id = employee_schedule_assignments.employee_id
     INNER JOIN work_schedules ON work_schedules.id = employee_schedule_assignments.schedule_id
     WHERE employee_schedule_assignments.id = ?`,
    id,
  );

  if (!assignment) {
    throw new Error('Unable to load the saved schedule assignment.');
  }
  return assignment;
}

export async function deleteScheduleAssignment(id: string): Promise<{ id: string }> {
  const result = await getDb().run(
    'DELETE FROM employee_schedule_assignments WHERE id = ?',
    id,
  );
  if ((result.changes ?? 0) === 0) {
    throw new Error('Schedule assignment was not found.');
  }
  return { id };
}

export async function getAttendanceCorrections(filters?: unknown): Promise<{
  data: AttendanceCorrectionRecord[];
  total: number;
}> {
  const status = isRecord(filters) ? readString(filters, 'status') : '';
  const employeeId = isRecord(filters) ? readString(filters, 'employee_id') : '';
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (status && status !== 'all') {
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      throw new Error('Correction status filter is invalid.');
    }
    clauses.push('attendance_corrections.status = ?');
    values.push(status);
  }
  if (employeeId) {
    clauses.push('attendance_corrections.employee_id = ?');
    values.push(employeeId);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await getDb().all<AttendanceCorrectionRecord[]>(
    `${correctionSelect}
     ${whereClause}
     ORDER BY CASE attendance_corrections.status WHEN 'pending' THEN 0 ELSE 1 END,
              attendance_corrections.created_at DESC`,
    ...values,
  );
  return { data: rows, total: rows.length };
}

export async function createAttendanceCorrection(
  payload: unknown,
): Promise<AttendanceCorrectionRecord> {
  if (!isRecord(payload)) {
    throw new Error('Attendance correction information is required.');
  }

  const employeeId = readString(payload, 'employee_id');
  const workDate = readString(payload, 'work_date');
  const requestedTimeIn = readString(payload, 'requested_time_in');
  const requestedTimeOut = readString(payload, 'requested_time_out');
  const requestedStatus = readAttendanceStatus(payload, 'requested_status', 'present');
  const reason = readString(payload, 'reason');

  await requireEmployee(employeeId);
  requireDate(workDate, 'Work date');
  requireOptionalTime(requestedTimeIn, 'Requested time-in');
  requireOptionalTime(requestedTimeOut, 'Requested time-out');
  if (!reason) {
    throw new Error('A correction reason is required.');
  }

  const attendance = await getDb().get<{ id: string }>(
    `SELECT id FROM attendance_records
      WHERE employee_id = ? AND work_date = ?`,
    employeeId,
    workDate,
  );

  const id = `correction_${randomUUID()}`;
  await getDb().run(
    `INSERT INTO attendance_corrections (
      id, attendance_id, employee_id, work_date, requested_time_in,
      requested_time_out, requested_status, reason, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
    id,
    attendance?.id ?? null,
    employeeId,
    workDate,
    requestedTimeIn || null,
    requestedTimeOut || null,
    requestedStatus,
    reason,
  );

  return requireAttendanceCorrection(id);
}

export async function reviewAttendanceCorrection(
  id: string,
  payload: unknown,
): Promise<AttendanceCorrectionRecord> {
  if (!isRecord(payload)) {
    throw new Error('Correction review information is required.');
  }

  const decision = readString(payload, 'decision');
  const reviewerNotes = readString(payload, 'reviewer_notes');
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new Error('Correction decision must be approved or rejected.');
  }

  const correction = await requireAttendanceCorrection(id);
  if (correction.status !== 'pending') {
    throw new Error('Only pending attendance corrections can be reviewed.');
  }

  const db = getDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    if (decision === 'approved') {
      const current = correction.attendance_id
        ? await getAttendanceRecord(correction.attendance_id)
        : null;

      const input = validateAttendanceInput({
        employee_id: correction.employee_id,
        work_date: correction.work_date,
        schedule_id: current?.schedule_id ?? '',
        time_in: correction.requested_time_in,
        time_out: correction.requested_time_out,
        break_minutes: current?.break_minutes,
        status: correction.requested_status,
        source: 'employee-correction',
        notes: current?.notes
          ? `${current.notes}\nApproved correction: ${correction.reason}`
          : `Approved correction: ${correction.reason}`,
        payroll_period_id: current?.payroll_period_id ?? '',
      });

      if (current) {
        await saveAttendanceRecord(current.id, input, true);
      } else {
        await saveAttendanceRecord(`att_${randomUUID()}`, input, false);
      }
    }

    await db.run(
      `UPDATE attendance_corrections
          SET status = ?, reviewer_notes = ?, reviewed_at = datetime('now'),
              updated_at = datetime('now')
        WHERE id = ?`,
      decision,
      reviewerNotes,
      id,
    );
    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }

  return requireAttendanceCorrection(id);
}

async function saveAttendanceRecord(
  id: string,
  input: AttendanceInput,
  updating: boolean,
): Promise<AttendanceRecord> {
  await requireEmployee(input.employee_id);
  const schedule = await resolveSchedule(
    input.employee_id,
    input.work_date,
    input.schedule_id,
  );
  const metrics = calculateAttendanceMetrics(input, schedule);

  try {
    if (updating) {
      await getDb().run(
        `UPDATE attendance_records
            SET employee_id = ?, work_date = ?, schedule_id = ?,
                scheduled_time_in = ?, scheduled_time_out = ?, time_in = ?,
                time_out = ?, break_minutes = ?, hours_worked = ?,
                regular_hours = ?, late_minutes = ?, undertime_minutes = ?,
                overtime_hours = ?, night_diff_hours = ?, status = ?, source = ?,
                notes = ?, payroll_period_id = ?, updated_at = datetime('now')
          WHERE id = ?`,
        input.employee_id,
        input.work_date,
        schedule?.id ?? null,
        schedule?.start_time ?? null,
        schedule?.end_time ?? null,
        input.time_in || null,
        input.time_out || null,
        metrics.break_minutes,
        metrics.hours_worked,
        metrics.regular_hours,
        metrics.late_minutes,
        metrics.undertime_minutes,
        metrics.overtime_hours,
        metrics.night_diff_hours,
        metrics.status,
        input.source,
        input.notes || null,
        input.payroll_period_id || null,
        id,
      );
    } else {
      await getDb().run(
        `INSERT INTO attendance_records (
          id, employee_id, work_date, schedule_id, scheduled_time_in,
          scheduled_time_out, time_in, time_out, break_minutes, hours_worked,
          regular_hours, late_minutes, undertime_minutes, overtime_hours,
          night_diff_hours, status, source, notes, payroll_period_id,
          created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          datetime('now'), datetime('now')
        )`,
        id,
        input.employee_id,
        input.work_date,
        schedule?.id ?? null,
        schedule?.start_time ?? null,
        schedule?.end_time ?? null,
        input.time_in || null,
        input.time_out || null,
        metrics.break_minutes,
        metrics.hours_worked,
        metrics.regular_hours,
        metrics.late_minutes,
        metrics.undertime_minutes,
        metrics.overtime_hours,
        metrics.night_diff_hours,
        metrics.status,
        input.source,
        input.notes || null,
        input.payroll_period_id || null,
      );
    }
  } catch (error) {
    throw translateAttendanceError(error);
  }

  return requireAttendanceRecord(id);
}

function buildAttendanceWhereClause(filters: unknown): {
  whereClause: string;
  values: unknown[];
} {
  const parsed = parseAttendanceFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (parsed.query) {
    const search = `%${parsed.query}%`;
    clauses.push(`(
      employees.employee_number LIKE ? COLLATE NOCASE
      OR employees.name LIKE ? COLLATE NOCASE
      OR employees.department LIKE ? COLLATE NOCASE
    )`);
    values.push(search, search, search);
  }
  if (parsed.employee_id) {
    clauses.push('attendance_records.employee_id = ?');
    values.push(parsed.employee_id);
  }
  if (parsed.status !== 'all') {
    clauses.push('attendance_records.status = ?');
    values.push(parsed.status);
  }
  if (parsed.date_from) {
    clauses.push('attendance_records.work_date >= ?');
    values.push(parsed.date_from);
  }
  if (parsed.date_to) {
    clauses.push('attendance_records.work_date <= ?');
    values.push(parsed.date_to);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

function parseAttendanceFilters(filters: unknown): Required<AttendanceListFilters> {
  if (!isRecord(filters)) {
    return {
      query: '',
      employee_id: '',
      status: 'all',
      date_from: '',
      date_to: '',
    };
  }

  const statusValue = readString(filters, 'status');
  const status = attendanceStatuses.includes(statusValue as AttendanceStatus)
    ? statusValue as AttendanceStatus
    : 'all';
  const dateFrom = readString(filters, 'date_from');
  const dateTo = readString(filters, 'date_to');
  if (dateFrom) requireDate(dateFrom, 'Start date');
  if (dateTo) requireDate(dateTo, 'End date');
  if (dateFrom && dateTo && dateTo < dateFrom) {
    throw new Error('End date cannot be earlier than start date.');
  }

  return {
    query: readString(filters, 'query'),
    employee_id: readString(filters, 'employee_id'),
    status,
    date_from: dateFrom,
    date_to: dateTo,
  };
}

function validateAttendanceInput(payload: unknown): AttendanceInput {
  if (!isRecord(payload)) {
    throw new Error('Attendance information is required.');
  }

  const employeeId = readString(payload, 'employee_id');
  const workDate = readString(payload, 'work_date');
  const timeIn = readString(payload, 'time_in');
  const timeOut = readString(payload, 'time_out');
  const status = readAttendanceStatus(payload, 'status', 'present');
  const source = readAttendanceSource(payload, 'source', 'manual');
  const rawBreakMinutes = payload.break_minutes;
  let breakMinutes: number | null = null;

  if (rawBreakMinutes !== undefined && rawBreakMinutes !== null && rawBreakMinutes !== '') {
    breakMinutes = toNonNegativeNumber(rawBreakMinutes, 'Break minutes');
    if (!Number.isInteger(breakMinutes) || breakMinutes > 1440) {
      throw new Error('Break minutes must be a whole number from 0 to 1,440.');
    }
  }

  if (!employeeId) {
    throw new Error('Employee is required.');
  }
  requireDate(workDate, 'Work date');
  requireOptionalTime(timeIn, 'Time-in');
  requireOptionalTime(timeOut, 'Time-out');

  return {
    employee_id: employeeId,
    work_date: workDate,
    schedule_id: readString(payload, 'schedule_id'),
    time_in: timeIn,
    time_out: timeOut,
    break_minutes: breakMinutes,
    status,
    source,
    notes: readString(payload, 'notes'),
    payroll_period_id: readString(payload, 'payroll_period_id'),
  };
}

function validateWorkScheduleInput(payload: unknown): WorkScheduleInput {
  if (!isRecord(payload)) {
    throw new Error('Work schedule information is required.');
  }

  const name = readString(payload, 'name');
  const startTime = readString(payload, 'start_time');
  const endTime = readString(payload, 'end_time');
  const breakMinutes = toNonNegativeNumber(payload.break_minutes ?? 0, 'Break minutes');
  const graceMinutes = toNonNegativeNumber(payload.grace_minutes ?? 0, 'Grace minutes');
  const standardHours = toNonNegativeNumber(payload.standard_hours ?? 8, 'Standard hours');

  if (!name) {
    throw new Error('Schedule name is required.');
  }
  requireTime(startTime, 'Schedule start time');
  requireTime(endTime, 'Schedule end time');
  if (!Number.isInteger(breakMinutes) || breakMinutes > 1440) {
    throw new Error('Break minutes must be a whole number from 0 to 1,440.');
  }
  if (!Number.isInteger(graceMinutes) || graceMinutes > 240) {
    throw new Error('Grace minutes must be a whole number from 0 to 240.');
  }
  if (standardHours <= 0 || standardHours > 24) {
    throw new Error('Standard hours must be greater than 0 and not more than 24.');
  }

  const activeValue = payload.is_active;
  const isActive = typeof activeValue === 'boolean'
    ? activeValue
    : activeValue === 0 || activeValue === '0'
      ? false
      : true;

  return {
    name,
    start_time: startTime,
    end_time: endTime,
    break_minutes: breakMinutes,
    grace_minutes: graceMinutes,
    standard_hours: roundHours(standardHours),
    is_active: isActive ? 1 : 0,
  };
}

async function resolveSchedule(
  employeeId: string,
  workDate: string,
  requestedScheduleId: string,
): Promise<ResolvedSchedule | null> {
  if (requestedScheduleId) {
    const schedule = await getDb().get<ResolvedSchedule>(
      `SELECT id, name, start_time, end_time, break_minutes,
              grace_minutes, standard_hours
         FROM work_schedules WHERE id = ?`,
      requestedScheduleId,
    );
    if (!schedule) {
      throw new Error('Selected work schedule was not found.');
    }
    return schedule;
  }

  const assigned = await getDb().get<ResolvedSchedule>(
    `SELECT work_schedules.id, work_schedules.name, work_schedules.start_time,
            work_schedules.end_time, work_schedules.break_minutes,
            work_schedules.grace_minutes, work_schedules.standard_hours
       FROM employee_schedule_assignments
       INNER JOIN work_schedules
         ON work_schedules.id = employee_schedule_assignments.schedule_id
      WHERE employee_schedule_assignments.employee_id = ?
        AND employee_schedule_assignments.effective_from <= ?
        AND (
          employee_schedule_assignments.effective_to IS NULL
          OR employee_schedule_assignments.effective_to = ''
          OR employee_schedule_assignments.effective_to >= ?
        )
      ORDER BY employee_schedule_assignments.effective_from DESC
      LIMIT 1`,
    employeeId,
    workDate,
    workDate,
  );
  if (assigned) {
    return assigned;
  }

  return await getDb().get<ResolvedSchedule>(
    `SELECT id, name, start_time, end_time, break_minutes,
            grace_minutes, standard_hours
       FROM work_schedules
      WHERE is_active = 1
      ORDER BY CASE WHEN id = 'schedule_default_day' THEN 0 ELSE 1 END,
               name COLLATE NOCASE ASC
      LIMIT 1`,
  ) ?? null;
}

function calculateAttendanceMetrics(
  input: AttendanceInput,
  schedule: ResolvedSchedule | null,
): AttendanceMetrics {
  const workingStatuses: AttendanceStatus[] = [
    'present',
    'official-business',
    'work-from-home',
  ];
  let status = input.status;

  if (workingStatuses.includes(status) && (!input.time_in || !input.time_out)) {
    status = 'incomplete';
  }
  if (!workingStatuses.includes(status) || !input.time_in || !input.time_out) {
    return {
      status,
      break_minutes: input.break_minutes ?? schedule?.break_minutes ?? 0,
      hours_worked: 0,
      regular_hours: 0,
      late_minutes: 0,
      undertime_minutes: 0,
      overtime_hours: 0,
      night_diff_hours: 0,
    };
  }

  let actualIn = parseTimeToMinutes(input.time_in);
  let actualOut = parseTimeToMinutes(input.time_out);
  if (actualOut <= actualIn) {
    actualOut += 1440;
  }

  const breakMinutes = input.break_minutes ?? schedule?.break_minutes ?? 0;
  const workedMinutes = Math.max(0, actualOut - actualIn - breakMinutes);
  const hoursWorked = roundHours(workedMinutes / 60);

  if (!schedule) {
    return {
      status,
      break_minutes: breakMinutes,
      hours_worked: hoursWorked,
      regular_hours: hoursWorked,
      late_minutes: 0,
      undertime_minutes: 0,
      overtime_hours: 0,
      night_diff_hours: roundHours(calculateNightMinutes(actualIn, actualOut) / 60),
    };
  }

  let scheduledIn = parseTimeToMinutes(schedule.start_time);
  let scheduledOut = parseTimeToMinutes(schedule.end_time);
  if (scheduledOut <= scheduledIn) {
    scheduledOut += 1440;
  }

  actualIn = normalizeAround(actualIn, scheduledIn);
  actualOut = normalizeAround(actualOut, actualIn);
  while (actualOut <= actualIn) {
    actualOut += 1440;
  }

  const lateMinutes = Math.max(
    0,
    Math.round(actualIn - scheduledIn - schedule.grace_minutes),
  );
  const undertimeMinutes = Math.max(0, Math.round(scheduledOut - actualOut));
  const overtimeMinutes = Math.max(0, actualOut - scheduledOut);

  return {
    status,
    break_minutes: breakMinutes,
    hours_worked: hoursWorked,
    regular_hours: roundHours(Math.min(hoursWorked, schedule.standard_hours)),
    late_minutes: lateMinutes,
    undertime_minutes: undertimeMinutes,
    overtime_hours: roundHours(overtimeMinutes / 60),
    night_diff_hours: roundHours(calculateNightMinutes(actualIn, actualOut) / 60),
  };
}

function calculateNightMinutes(start: number, end: number): number {
  let total = 0;
  for (let day = -1; day <= 2; day += 1) {
    const nightStart = day * 1440 + 22 * 60;
    const nightEnd = (day + 1) * 1440 + 6 * 60;
    total += Math.max(0, Math.min(end, nightEnd) - Math.max(start, nightStart));
  }
  return Math.max(0, total);
}

function normalizeAround(value: number, reference: number): number {
  let normalized = value;
  while (normalized < reference - 720) normalized += 1440;
  while (normalized > reference + 720) normalized -= 1440;
  return normalized;
}

async function requireAttendanceRecord(id: string): Promise<AttendanceRecord> {
  const record = await getAttendanceRecord(id);
  if (!record) {
    throw new Error('Attendance record was not found.');
  }
  return record;
}

async function requireEmployee(id: string): Promise<void> {
  if (!id) {
    throw new Error('Employee is required.');
  }
  const employee = await getDb().get<{ id: string }>(
    'SELECT id FROM employees WHERE id = ?',
    id,
  );
  if (!employee) {
    throw new Error('Employee record was not found.');
  }
}

async function requireWorkSchedule(id: string): Promise<WorkScheduleRecord> {
  if (!id) {
    throw new Error('Work schedule is required.');
  }
  const schedule = await getDb().get<WorkScheduleRecord>(
    `SELECT id, name, start_time, end_time, break_minutes, grace_minutes,
            standard_hours, is_active, created_at, updated_at
       FROM work_schedules WHERE id = ?`,
    id,
  );
  if (!schedule) {
    throw new Error('Work schedule was not found.');
  }
  return schedule;
}

async function requireAttendanceCorrection(
  id: string,
): Promise<AttendanceCorrectionRecord> {
  const correction = await getDb().get<AttendanceCorrectionRecord>(
    `${correctionSelect} WHERE attendance_corrections.id = ?`,
    id,
  );
  if (!correction) {
    throw new Error('Attendance correction was not found.');
  }
  return correction;
}

function readAttendanceStatus(
  record: Record<string, unknown>,
  key: string,
  fallback: AttendanceStatus,
): AttendanceStatus {
  const value = readString(record, key) || fallback;
  if (!attendanceStatuses.includes(value as AttendanceStatus)) {
    throw new Error('Attendance status is invalid.');
  }
  return value as AttendanceStatus;
}

function readAttendanceSource(
  record: Record<string, unknown>,
  key: string,
  fallback: AttendanceSource,
): AttendanceSource {
  const value = readString(record, key) || fallback;
  if (!attendanceSources.includes(value as AttendanceSource)) {
    throw new Error('Attendance source is invalid.');
  }
  return value as AttendanceSource;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireDate(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is invalid.`);
  }
}

function requireTime(value: string, label: string): void {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error(`${label} must use 24-hour HH:MM format.`);
  }
}

function requireOptionalTime(value: string, label: string): void {
  if (value) {
    requireTime(value, label);
  }
}

function parseTimeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function toNonNegativeNumber(value: unknown, label: string): number {
  const parsed = typeof value === 'number'
    ? value
    : Number(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be zero or a positive number.`);
  }
  return parsed;
}

function roundHours(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function translateAttendanceError(error: unknown): Error {
  const message = getErrorMessage(error);
  if (message.includes('attendance_records.employee_id, attendance_records.work_date')) {
    return new Error('This employee already has an attendance record for that date.');
  }
  if (message.includes('FOREIGN KEY constraint failed')) {
    return new Error('The employee, schedule, or payroll period no longer exists.');
  }
  return error instanceof Error ? error : new Error('Unable to save attendance record.');
}

function translateScheduleError(error: unknown): Error {
  const message = getErrorMessage(error);
  if (message.includes('work_schedules.name')) {
    return new Error('That work-schedule name is already in use.');
  }
  return error instanceof Error ? error : new Error('Unable to save work schedule.');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : String(error || 'Unknown error');
}
