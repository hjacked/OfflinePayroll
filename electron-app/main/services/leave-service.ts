import { randomUUID } from 'node:crypto';
import { getDb } from '../db';

export const leaveRequestStatuses = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
] as const;

export const leaveDurationTypes = [
  'full-day',
  'half-day-am',
  'half-day-pm',
] as const;

export type LeaveRequestStatus = typeof leaveRequestStatuses[number];
export type LeaveDurationType = typeof leaveDurationTypes[number];

export interface LeaveTypeRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  is_paid: number;
  track_balance: number;
  annual_credit: number;
  allow_half_day: number;
  require_attachment: number;
  advance_notice_days: number;
  allow_carry_over: number;
  max_carry_over: number;
  min_service_months: number;
  gender_eligibility: 'all' | 'female' | 'male';
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalanceRecord {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  leave_type_id: string;
  leave_code: string;
  leave_name: string;
  balance_year: number;
  opening_balance: number;
  earned: number;
  adjustments: number;
  allocated: number;
  used: number;
  pending: number;
  available: number;
  track_balance: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequestRecord {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  leave_type_id: string;
  leave_code: string;
  leave_name: string;
  is_paid: number;
  track_balance: number;
  start_date: string;
  end_date: string;
  duration_type: LeaveDurationType;
  total_days: number;
  reason: string;
  attachment_reference: string;
  status: LeaveRequestStatus;
  reviewer_notes: string;
  reviewed_at: string;
  cancelled_at: string;
  created_at: string;
  updated_at: string;
}

export interface LeaveSummary {
  total_requests: number;
  pending_requests: number;
  approved_requests: number;
  rejected_requests: number;
  cancelled_requests: number;
  pending_days: number;
  approved_days: number;
  employees_on_leave_today: number;
}

interface LeaveTypeInput {
  code: string;
  name: string;
  description: string;
  is_paid: number;
  track_balance: number;
  annual_credit: number;
  allow_half_day: number;
  require_attachment: number;
  advance_notice_days: number;
  allow_carry_over: number;
  max_carry_over: number;
  min_service_months: number;
  gender_eligibility: 'all' | 'female' | 'male';
  is_active: number;
}

interface LeaveRequestInput {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  duration_type: LeaveDurationType;
  total_days: number;
  reason: string;
  attachment_reference: string;
}

interface LeaveRequestFilters {
  query: string;
  employee_id: string;
  leave_type_id: string;
  status: 'all' | LeaveRequestStatus;
  date_from: string;
  date_to: string;
}

interface LeaveBalanceFilters {
  query: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
}

interface AttendanceSnapshot {
  schedule_id: string | null;
  scheduled_time_in: string | null;
  scheduled_time_out: string | null;
  time_in: string | null;
  time_out: string | null;
  break_minutes: number;
  hours_worked: number;
  regular_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  overtime_hours: number;
  night_diff_hours: number;
  status: string;
  source: string;
  notes: string | null;
  payroll_period_id: string | null;
  leave_request_id: string | null;
}

const leaveTypeSelect = `
  SELECT
    id,
    code,
    name,
    COALESCE(description, '') AS description,
    is_paid,
    track_balance,
    annual_credit,
    allow_half_day,
    require_attachment,
    advance_notice_days,
    allow_carry_over,
    max_carry_over,
    min_service_months,
    gender_eligibility,
    is_active,
    created_at,
    updated_at
  FROM leave_types
`;

const leaveRequestSelect = `
  SELECT
    leave_requests.id,
    leave_requests.employee_id,
    employees.employee_number,
    employees.name AS employee_name,
    COALESCE(employees.department, '') AS department,
    leave_requests.leave_type_id,
    leave_types.code AS leave_code,
    leave_types.name AS leave_name,
    leave_types.is_paid,
    leave_types.track_balance,
    leave_requests.start_date,
    leave_requests.end_date,
    leave_requests.duration_type,
    leave_requests.total_days,
    leave_requests.reason,
    COALESCE(leave_requests.attachment_reference, '') AS attachment_reference,
    leave_requests.status,
    COALESCE(leave_requests.reviewer_notes, '') AS reviewer_notes,
    COALESCE(leave_requests.reviewed_at, '') AS reviewed_at,
    COALESCE(leave_requests.cancelled_at, '') AS cancelled_at,
    leave_requests.created_at,
    leave_requests.updated_at
  FROM leave_requests
  INNER JOIN employees ON employees.id = leave_requests.employee_id
  INNER JOIN leave_types ON leave_types.id = leave_requests.leave_type_id
`;

export async function getLeaveTypes(filters?: unknown): Promise<{
  data: LeaveTypeRecord[];
  total: number;
}> {
  const includeInactive = isRecord(filters) && filters.include_inactive === true;
  const rows = await getDb().all<LeaveTypeRecord[]>(
    `${leaveTypeSelect}
     ${includeInactive ? '' : 'WHERE is_active = 1'}
     ORDER BY is_active DESC, name COLLATE NOCASE ASC`,
  );
  return { data: rows, total: rows.length };
}

export async function createLeaveType(payload: unknown): Promise<LeaveTypeRecord> {
  const input = validateLeaveTypeInput(payload);
  const id = `leave_type_${randomUUID()}`;

  try {
    await getDb().run(
      `INSERT INTO leave_types (
        id, code, name, description, is_paid, track_balance, annual_credit,
        allow_half_day, require_attachment, advance_notice_days,
        allow_carry_over, max_carry_over, min_service_months,
        gender_eligibility, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id,
      input.code,
      input.name,
      input.description || null,
      input.is_paid,
      input.track_balance,
      input.annual_credit,
      input.allow_half_day,
      input.require_attachment,
      input.advance_notice_days,
      input.allow_carry_over,
      input.max_carry_over,
      input.min_service_months,
      input.gender_eligibility,
      input.is_active,
    );
  } catch (error) {
    throw translateLeaveTypeError(error);
  }

  await ensureLeaveBalancesForYear(new Date().getFullYear());
  return requireLeaveType(id);
}

export async function updateLeaveType(
  id: string,
  payload: unknown,
): Promise<LeaveTypeRecord> {
  await requireLeaveType(id);
  const input = validateLeaveTypeInput(payload);

  try {
    await getDb().run(
      `UPDATE leave_types
          SET code = ?, name = ?, description = ?, is_paid = ?,
              track_balance = ?, annual_credit = ?, allow_half_day = ?,
              require_attachment = ?, advance_notice_days = ?,
              allow_carry_over = ?, max_carry_over = ?, min_service_months = ?,
              gender_eligibility = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?`,
      input.code,
      input.name,
      input.description || null,
      input.is_paid,
      input.track_balance,
      input.annual_credit,
      input.allow_half_day,
      input.require_attachment,
      input.advance_notice_days,
      input.allow_carry_over,
      input.max_carry_over,
      input.min_service_months,
      input.gender_eligibility,
      input.is_active,
      id,
    );
  } catch (error) {
    throw translateLeaveTypeError(error);
  }

  await ensureLeaveBalancesForYear(new Date().getFullYear());
  return requireLeaveType(id);
}

export async function deleteLeaveType(id: string): Promise<{
  id: string;
  deactivated: boolean;
}> {
  await requireLeaveType(id);
  const references = await getDb().get<{ count: number }>(
    `SELECT (
       (SELECT COUNT(*) FROM leave_requests WHERE leave_type_id = ?)
       +
       (SELECT COUNT(*) FROM employee_leave_balances WHERE leave_type_id = ?)
     ) AS count`,
    id,
    id,
  );

  if ((references?.count ?? 0) > 0) {
    await getDb().run(
      `UPDATE leave_types
          SET is_active = 0, updated_at = datetime('now')
        WHERE id = ?`,
      id,
    );
    return { id, deactivated: true };
  }

  await getDb().run('DELETE FROM leave_types WHERE id = ?', id);
  return { id, deactivated: false };
}

export async function getLeaveBalances(filters?: unknown): Promise<{
  data: LeaveBalanceRecord[];
  total: number;
}> {
  const parsed = parseLeaveBalanceFilters(filters);
  await ensureLeaveBalancesForYear(parsed.year);

  const clauses: string[] = ['employee_leave_balances.balance_year = ?'];
  const values: unknown[] = [parsed.year];

  if (parsed.query) {
    const search = `%${parsed.query}%`;
    clauses.push(`(
      employees.employee_number LIKE ? COLLATE NOCASE
      OR employees.name LIKE ? COLLATE NOCASE
      OR employees.department LIKE ? COLLATE NOCASE
      OR leave_types.code LIKE ? COLLATE NOCASE
      OR leave_types.name LIKE ? COLLATE NOCASE
    )`);
    values.push(search, search, search, search, search);
  }
  if (parsed.employee_id) {
    clauses.push('employee_leave_balances.employee_id = ?');
    values.push(parsed.employee_id);
  }
  if (parsed.leave_type_id) {
    clauses.push('employee_leave_balances.leave_type_id = ?');
    values.push(parsed.leave_type_id);
  }

  const rows = await getDb().all<LeaveBalanceRecord[]>(
    `SELECT
       employee_leave_balances.id,
       employee_leave_balances.employee_id,
       employees.employee_number,
       employees.name AS employee_name,
       COALESCE(employees.department, '') AS department,
       employee_leave_balances.leave_type_id,
       leave_types.code AS leave_code,
       leave_types.name AS leave_name,
       employee_leave_balances.balance_year,
       employee_leave_balances.opening_balance,
       employee_leave_balances.earned,
       employee_leave_balances.adjustments,
       (employee_leave_balances.opening_balance
         + employee_leave_balances.earned
         + employee_leave_balances.adjustments) AS allocated,
       COALESCE((
         SELECT SUM(requests.total_days)
           FROM leave_requests requests
          WHERE requests.employee_id = employee_leave_balances.employee_id
            AND requests.leave_type_id = employee_leave_balances.leave_type_id
            AND requests.status = 'approved'
            AND CAST(strftime('%Y', requests.start_date) AS INTEGER) = employee_leave_balances.balance_year
       ), 0) AS used,
       COALESCE((
         SELECT SUM(requests.total_days)
           FROM leave_requests requests
          WHERE requests.employee_id = employee_leave_balances.employee_id
            AND requests.leave_type_id = employee_leave_balances.leave_type_id
            AND requests.status = 'pending'
            AND CAST(strftime('%Y', requests.start_date) AS INTEGER) = employee_leave_balances.balance_year
       ), 0) AS pending,
       CASE
         WHEN leave_types.track_balance = 1 THEN
           (employee_leave_balances.opening_balance
             + employee_leave_balances.earned
             + employee_leave_balances.adjustments)
           - COALESCE((
               SELECT SUM(requests.total_days)
                 FROM leave_requests requests
                WHERE requests.employee_id = employee_leave_balances.employee_id
                  AND requests.leave_type_id = employee_leave_balances.leave_type_id
                  AND requests.status IN ('approved', 'pending')
                  AND CAST(strftime('%Y', requests.start_date) AS INTEGER) = employee_leave_balances.balance_year
             ), 0)
         ELSE 0
       END AS available,
       leave_types.track_balance,
       COALESCE(employee_leave_balances.notes, '') AS notes,
       employee_leave_balances.created_at,
       employee_leave_balances.updated_at
     FROM employee_leave_balances
     INNER JOIN employees ON employees.id = employee_leave_balances.employee_id
     INNER JOIN leave_types ON leave_types.id = employee_leave_balances.leave_type_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY employees.last_name COLLATE NOCASE ASC,
              employees.first_name COLLATE NOCASE ASC,
              employees.name COLLATE NOCASE ASC,
              leave_types.name COLLATE NOCASE ASC`,
    ...values,
  );

  return {
    data: rows.map(normalizeBalanceRecord),
    total: rows.length,
  };
}

export async function adjustLeaveBalance(payload: unknown): Promise<LeaveBalanceRecord> {
  if (!isRecord(payload)) {
    throw new Error('Leave balance adjustment information is required.');
  }

  const employeeId = readString(payload, 'employee_id');
  const leaveTypeId = readString(payload, 'leave_type_id');
  const year = readYear(payload.year);
  const amount = readFiniteNumber(payload.amount, 'Adjustment amount');
  const reason = readString(payload, 'reason');

  if (!employeeId || !leaveTypeId) {
    throw new Error('Employee and leave type are required.');
  }
  if (amount === 0) {
    throw new Error('Adjustment amount cannot be zero.');
  }
  if (!reason) {
    throw new Error('An adjustment reason is required.');
  }

  await requireActiveEmployee(employeeId);
  const leaveType = await requireLeaveType(leaveTypeId);
  if (leaveType.track_balance !== 1) {
    throw new Error('This leave type does not use a tracked balance.');
  }

  await ensureBalance(employeeId, leaveType, year);
  const current = await getBalanceForEmployeeType(employeeId, leaveTypeId, year);
  if (!current) {
    throw new Error('Unable to load the leave balance.');
  }
  if (roundDays(current.available + amount) < 0) {
    throw new Error('The adjustment would make the available balance negative.');
  }

  const db = getDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    await db.run(
      `UPDATE employee_leave_balances
          SET adjustments = adjustments + ?,
              notes = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
      amount,
      reason,
      current.id,
    );
    await db.run(
      `INSERT INTO leave_balance_adjustments (
        id, balance_id, amount, reason, created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))`,
      `leave_adjustment_${randomUUID()}`,
      current.id,
      amount,
      reason,
    );
    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }

  const updated = await getBalanceForEmployeeType(employeeId, leaveTypeId, year);
  if (!updated) {
    throw new Error('Unable to load the adjusted leave balance.');
  }
  return updated;
}

export async function getLeaveRequests(filters?: unknown): Promise<{
  data: LeaveRequestRecord[];
  total: number;
}> {
  const { whereClause, values } = buildLeaveRequestWhereClause(filters);
  const rows = await getDb().all<LeaveRequestRecord[]>(
    `${leaveRequestSelect}
     ${whereClause}
     ORDER BY CASE leave_requests.status WHEN 'pending' THEN 0 ELSE 1 END,
              leave_requests.start_date DESC,
              leave_requests.created_at DESC`,
    ...values,
  );
  return { data: rows.map(normalizeLeaveRequest), total: rows.length };
}

export async function getLeaveRequest(
  id: string,
): Promise<LeaveRequestRecord | null> {
  const row = await getDb().get<LeaveRequestRecord>(
    `${leaveRequestSelect} WHERE leave_requests.id = ?`,
    id,
  );
  return row ? normalizeLeaveRequest(row) : null;
}

export async function getLeaveSummary(filters?: unknown): Promise<LeaveSummary> {
  const { whereClause, values } = buildLeaveRequestWhereClause(filters);
  const row = await getDb().get<LeaveSummary>(
    `SELECT
       COUNT(*) AS total_requests,
       SUM(CASE WHEN leave_requests.status = 'pending' THEN 1 ELSE 0 END) AS pending_requests,
       SUM(CASE WHEN leave_requests.status = 'approved' THEN 1 ELSE 0 END) AS approved_requests,
       SUM(CASE WHEN leave_requests.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_requests,
       SUM(CASE WHEN leave_requests.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_requests,
       COALESCE(SUM(CASE WHEN leave_requests.status = 'pending' THEN leave_requests.total_days ELSE 0 END), 0) AS pending_days,
       COALESCE(SUM(CASE WHEN leave_requests.status = 'approved' THEN leave_requests.total_days ELSE 0 END), 0) AS approved_days,
       COUNT(DISTINCT CASE
         WHEN leave_requests.status = 'approved'
          AND date('now', 'localtime') BETWEEN leave_requests.start_date AND leave_requests.end_date
         THEN leave_requests.employee_id
       END) AS employees_on_leave_today
     FROM leave_requests
     INNER JOIN employees ON employees.id = leave_requests.employee_id
     INNER JOIN leave_types ON leave_types.id = leave_requests.leave_type_id
     ${whereClause}`,
    ...values,
  );

  return {
    total_requests: Number(row?.total_requests ?? 0),
    pending_requests: Number(row?.pending_requests ?? 0),
    approved_requests: Number(row?.approved_requests ?? 0),
    rejected_requests: Number(row?.rejected_requests ?? 0),
    cancelled_requests: Number(row?.cancelled_requests ?? 0),
    pending_days: roundDays(Number(row?.pending_days ?? 0)),
    approved_days: roundDays(Number(row?.approved_days ?? 0)),
    employees_on_leave_today: Number(row?.employees_on_leave_today ?? 0),
  };
}

export async function createLeaveRequest(payload: unknown): Promise<LeaveRequestRecord> {
  const input = await validateLeaveRequestInput(payload);
  const id = `leave_request_${randomUUID()}`;

  await assertNoOverlappingRequest(input, '');
  await assertBalanceAvailable(input, '');

  await getDb().run(
    `INSERT INTO leave_requests (
      id, employee_id, leave_type_id, start_date, end_date, duration_type,
      total_days, reason, attachment_reference, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
    id,
    input.employee_id,
    input.leave_type_id,
    input.start_date,
    input.end_date,
    input.duration_type,
    input.total_days,
    input.reason,
    input.attachment_reference || null,
  );

  return requireLeaveRequest(id);
}

export async function updateLeaveRequest(
  id: string,
  payload: unknown,
): Promise<LeaveRequestRecord> {
  const current = await requireLeaveRequest(id);
  if (current.status !== 'pending') {
    throw new Error('Only pending leave requests can be edited.');
  }

  const input = await validateLeaveRequestInput(payload);
  await assertNoOverlappingRequest(input, id);
  await assertBalanceAvailable(input, id);

  await getDb().run(
    `UPDATE leave_requests
        SET employee_id = ?, leave_type_id = ?, start_date = ?, end_date = ?,
            duration_type = ?, total_days = ?, reason = ?,
            attachment_reference = ?, updated_at = datetime('now')
      WHERE id = ?`,
    input.employee_id,
    input.leave_type_id,
    input.start_date,
    input.end_date,
    input.duration_type,
    input.total_days,
    input.reason,
    input.attachment_reference || null,
    id,
  );

  return requireLeaveRequest(id);
}

export async function reviewLeaveRequest(
  id: string,
  payload: unknown,
): Promise<LeaveRequestRecord> {
  if (!isRecord(payload)) {
    throw new Error('Leave review information is required.');
  }
  const decision = readString(payload, 'decision');
  const reviewerNotes = readString(payload, 'reviewer_notes');
  if (decision !== 'approved' && decision !== 'rejected') {
    throw new Error('Leave decision must be approved or rejected.');
  }

  const request = await requireLeaveRequest(id);
  if (request.status !== 'pending') {
    throw new Error('Only pending leave requests can be reviewed.');
  }

  const db = getDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    if (decision === 'approved') {
      const input: LeaveRequestInput = {
        employee_id: request.employee_id,
        leave_type_id: request.leave_type_id,
        start_date: request.start_date,
        end_date: request.end_date,
        duration_type: request.duration_type,
        total_days: request.total_days,
        reason: request.reason,
        attachment_reference: request.attachment_reference,
      };
      await assertBalanceAvailable(input, id);
      await applyLeaveToAttendance(request);
    }

    await db.run(
      `UPDATE leave_requests
          SET status = ?, reviewer_notes = ?, reviewed_at = datetime('now'),
              updated_at = datetime('now')
        WHERE id = ?`,
      decision,
      reviewerNotes || null,
      id,
    );
    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }

  return requireLeaveRequest(id);
}

export async function cancelLeaveRequest(
  id: string,
  payload?: unknown,
): Promise<LeaveRequestRecord> {
  const request = await requireLeaveRequest(id);
  if (request.status === 'cancelled') {
    throw new Error('This leave request is already cancelled.');
  }
  if (request.status === 'rejected') {
    throw new Error('A rejected leave request cannot be cancelled.');
  }

  const cancellationReason = isRecord(payload)
    ? readString(payload, 'reason')
    : '';
  const nextNotes = cancellationReason
    ? [request.reviewer_notes, `Cancellation: ${cancellationReason}`]
      .filter(Boolean)
      .join('\n')
    : request.reviewer_notes;

  const db = getDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    if (request.status === 'approved') {
      await restoreAttendanceForLeave(id);
    }
    await db.run(
      `UPDATE leave_requests
          SET status = 'cancelled', reviewer_notes = ?,
              cancelled_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?`,
      nextNotes || null,
      id,
    );
    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }

  return requireLeaveRequest(id);
}

async function validateLeaveRequestInput(payload: unknown): Promise<LeaveRequestInput> {
  if (!isRecord(payload)) {
    throw new Error('Leave request information is required.');
  }

  const employeeId = readString(payload, 'employee_id');
  const leaveTypeId = readString(payload, 'leave_type_id');
  const startDate = readString(payload, 'start_date');
  const endDate = readString(payload, 'end_date');
  const durationTypeValue = readString(payload, 'duration_type') || 'full-day';
  const reason = readString(payload, 'reason');
  const attachmentReference = readString(payload, 'attachment_reference');

  if (!employeeId || !leaveTypeId) {
    throw new Error('Employee and leave type are required.');
  }
  requireDate(startDate, 'Start date');
  requireDate(endDate, 'End date');
  if (endDate < startDate) {
    throw new Error('End date cannot be earlier than start date.');
  }
  if (startDate.slice(0, 4) !== endDate.slice(0, 4)) {
    throw new Error('A leave request must remain within one calendar year.');
  }
  if (!leaveDurationTypes.includes(durationTypeValue as LeaveDurationType)) {
    throw new Error('Leave duration type is invalid.');
  }
  const durationType = durationTypeValue as LeaveDurationType;
  if (durationType !== 'full-day' && startDate !== endDate) {
    throw new Error('Half-day leave must start and end on the same date.');
  }
  if (!reason) {
    throw new Error('A leave reason is required.');
  }

  await requireActiveEmployee(employeeId);
  const leaveType = await requireLeaveType(leaveTypeId);
  if (leaveType.is_active !== 1) {
    throw new Error('The selected leave type is inactive.');
  }
  if (durationType !== 'full-day' && leaveType.allow_half_day !== 1) {
    throw new Error('The selected leave type does not allow half-day requests.');
  }
  if (leaveType.require_attachment === 1 && !attachmentReference) {
    throw new Error('A supporting-document reference is required for this leave type.');
  }

  const totalDays = calculateLeaveDays(startDate, endDate, durationType);
  if (totalDays <= 0) {
    throw new Error('The selected date range contains no working days.');
  }

  return {
    employee_id: employeeId,
    leave_type_id: leaveTypeId,
    start_date: startDate,
    end_date: endDate,
    duration_type: durationType,
    total_days: totalDays,
    reason,
    attachment_reference: attachmentReference,
  };
}

async function assertNoOverlappingRequest(
  input: LeaveRequestInput,
  excludeId: string,
): Promise<void> {
  const row = await getDb().get<{ id: string }>(
    `SELECT id
       FROM leave_requests
      WHERE employee_id = ?
        AND status IN ('pending', 'approved')
        AND start_date <= ?
        AND end_date >= ?
        ${excludeId ? 'AND id <> ?' : ''}
      LIMIT 1`,
    input.employee_id,
    input.end_date,
    input.start_date,
    ...(excludeId ? [excludeId] : []),
  );
  if (row) {
    throw new Error('The employee already has a pending or approved leave request in this date range.');
  }
}

async function assertBalanceAvailable(
  input: LeaveRequestInput,
  excludeRequestId: string,
): Promise<void> {
  const leaveType = await requireLeaveType(input.leave_type_id);
  if (leaveType.track_balance !== 1) return;

  const year = Number(input.start_date.slice(0, 4));
  await ensureBalance(input.employee_id, leaveType, year);
  const balance = await getBalanceForEmployeeType(
    input.employee_id,
    input.leave_type_id,
    year,
    excludeRequestId,
  );
  if (!balance) {
    throw new Error('Unable to calculate the employee leave balance.');
  }
  if (input.total_days > balance.available + 0.0001) {
    throw new Error(
      `Insufficient ${leaveType.name} balance. Available: ${roundDays(balance.available)} day(s).`,
    );
  }
}

async function applyLeaveToAttendance(request: LeaveRequestRecord): Promise<void> {
  const dates = getWorkingDates(request.start_date, request.end_date);
  const db = getDb();

  for (const workDate of dates) {
    const existing = await db.get<Record<string, unknown>>(
      `SELECT * FROM attendance_records
        WHERE employee_id = ? AND work_date = ?`,
      request.employee_id,
      workDate,
    );

    if (existing) {
      const timeIn = String(existing.time_in ?? '').trim();
      const timeOut = String(existing.time_out ?? '').trim();
      const status = String(existing.status ?? '');
      const isHalfDay = request.duration_type !== 'full-day';
      if (
        !isHalfDay
        && (
          timeIn
          || timeOut
          || ['present', 'official-business', 'work-from-home'].includes(status)
        )
      ) {
        throw new Error(
          `Attendance already contains worked time for ${workDate}. Resolve the conflict before approving full-day leave.`,
        );
      }

      const snapshot: AttendanceSnapshot = {
        schedule_id: nullableString(existing.schedule_id),
        scheduled_time_in: nullableString(existing.scheduled_time_in),
        scheduled_time_out: nullableString(existing.scheduled_time_out),
        time_in: nullableString(existing.time_in),
        time_out: nullableString(existing.time_out),
        break_minutes: Number(existing.break_minutes ?? 0),
        hours_worked: Number(existing.hours_worked ?? 0),
        regular_hours: Number(existing.regular_hours ?? 0),
        late_minutes: Number(existing.late_minutes ?? 0),
        undertime_minutes: Number(existing.undertime_minutes ?? 0),
        overtime_hours: Number(existing.overtime_hours ?? 0),
        night_diff_hours: Number(existing.night_diff_hours ?? 0),
        status,
        source: String(existing.source ?? 'manual'),
        notes: nullableString(existing.notes),
        payroll_period_id: nullableString(existing.payroll_period_id),
        leave_request_id: nullableString(existing.leave_request_id),
      };

      await db.run(
        `INSERT INTO leave_attendance_snapshots (
          id, leave_request_id, work_date, attendance_id, created_new,
          prior_json, created_at
        ) VALUES (?, ?, ?, ?, 0, ?, datetime('now'))`,
        `leave_snapshot_${randomUUID()}`,
        request.id,
        workDate,
        String(existing.id),
        JSON.stringify(snapshot),
      );

      if (isHalfDay && (timeIn || timeOut || ['present', 'official-business', 'work-from-home'].includes(status))) {
        const existingNotes = nullableString(existing.notes);
        const leaveNote = `${getDurationDescription(request.duration_type)} ${request.leave_name}: ${request.reason}`;
        await db.run(
          `UPDATE attendance_records
              SET notes = ?, leave_request_id = ?, updated_at = datetime('now')
            WHERE id = ?`,
          existingNotes ? `${existingNotes}
${leaveNote}` : leaveNote,
          request.id,
          String(existing.id),
        );
      } else {
        await db.run(
          `UPDATE attendance_records
              SET time_in = NULL, time_out = NULL, break_minutes = 0,
                  hours_worked = 0, regular_hours = 0, late_minutes = 0,
                  undertime_minutes = 0, overtime_hours = 0, night_diff_hours = 0,
                  status = 'leave', source = 'manual',
                  notes = ?, leave_request_id = ?, updated_at = datetime('now')
            WHERE id = ?`,
          `${getDurationDescription(request.duration_type)} ${request.leave_name}: ${request.reason}`,
          request.id,
          String(existing.id),
        );
      }
    } else {
      const attendanceId = `att_${randomUUID()}`;
      await db.run(
        `INSERT INTO attendance_records (
          id, employee_id, work_date, break_minutes, hours_worked,
          regular_hours, late_minutes, undertime_minutes, overtime_hours,
          night_diff_hours, status, source, notes, leave_request_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 'leave', 'manual', ?, ?, datetime('now'), datetime('now'))`,
        attendanceId,
        request.employee_id,
        workDate,
        `${getDurationDescription(request.duration_type)} ${request.leave_name}: ${request.reason}`,
        request.id,
      );
      await db.run(
        `INSERT INTO leave_attendance_snapshots (
          id, leave_request_id, work_date, attendance_id, created_new,
          prior_json, created_at
        ) VALUES (?, ?, ?, ?, 1, NULL, datetime('now'))`,
        `leave_snapshot_${randomUUID()}`,
        request.id,
        workDate,
        attendanceId,
      );
    }
  }
}

async function restoreAttendanceForLeave(leaveRequestId: string): Promise<void> {
  const snapshots = await getDb().all<Array<{
    attendance_id: string;
    created_new: number;
    prior_json: string | null;
  }>>(
    `SELECT attendance_id, created_new, prior_json
       FROM leave_attendance_snapshots
      WHERE leave_request_id = ?
      ORDER BY work_date ASC`,
    leaveRequestId,
  );

  for (const snapshot of snapshots) {
    if (snapshot.created_new === 1) {
      await getDb().run(
        `DELETE FROM attendance_records
          WHERE id = ? AND leave_request_id = ?`,
        snapshot.attendance_id,
        leaveRequestId,
      );
      continue;
    }

    if (!snapshot.prior_json) continue;
    const prior = JSON.parse(snapshot.prior_json) as AttendanceSnapshot;
    await getDb().run(
      `UPDATE attendance_records
          SET schedule_id = ?, scheduled_time_in = ?, scheduled_time_out = ?,
              time_in = ?, time_out = ?, break_minutes = ?, hours_worked = ?,
              regular_hours = ?, late_minutes = ?, undertime_minutes = ?,
              overtime_hours = ?, night_diff_hours = ?, status = ?, source = ?,
              notes = ?, payroll_period_id = ?, leave_request_id = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
      prior.schedule_id,
      prior.scheduled_time_in,
      prior.scheduled_time_out,
      prior.time_in,
      prior.time_out,
      prior.break_minutes,
      prior.hours_worked,
      prior.regular_hours,
      prior.late_minutes,
      prior.undertime_minutes,
      prior.overtime_hours,
      prior.night_diff_hours,
      prior.status,
      prior.source,
      prior.notes,
      prior.payroll_period_id,
      prior.leave_request_id,
      snapshot.attendance_id,
    );
  }

  await getDb().run(
    'DELETE FROM leave_attendance_snapshots WHERE leave_request_id = ?',
    leaveRequestId,
  );
}

function buildLeaveRequestWhereClause(filters: unknown): {
  whereClause: string;
  values: unknown[];
} {
  const parsed = parseLeaveRequestFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (parsed.query) {
    const search = `%${parsed.query}%`;
    clauses.push(`(
      employees.employee_number LIKE ? COLLATE NOCASE
      OR employees.name LIKE ? COLLATE NOCASE
      OR employees.department LIKE ? COLLATE NOCASE
      OR leave_types.code LIKE ? COLLATE NOCASE
      OR leave_types.name LIKE ? COLLATE NOCASE
      OR leave_requests.reason LIKE ? COLLATE NOCASE
    )`);
    values.push(search, search, search, search, search, search);
  }
  if (parsed.employee_id) {
    clauses.push('leave_requests.employee_id = ?');
    values.push(parsed.employee_id);
  }
  if (parsed.leave_type_id) {
    clauses.push('leave_requests.leave_type_id = ?');
    values.push(parsed.leave_type_id);
  }
  if (parsed.status !== 'all') {
    clauses.push('leave_requests.status = ?');
    values.push(parsed.status);
  }
  if (parsed.date_from) {
    clauses.push('leave_requests.end_date >= ?');
    values.push(parsed.date_from);
  }
  if (parsed.date_to) {
    clauses.push('leave_requests.start_date <= ?');
    values.push(parsed.date_to);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

function parseLeaveRequestFilters(filters: unknown): LeaveRequestFilters {
  if (!isRecord(filters)) {
    return {
      query: '',
      employee_id: '',
      leave_type_id: '',
      status: 'all',
      date_from: '',
      date_to: '',
    };
  }

  const statusValue = readString(filters, 'status');
  const status = leaveRequestStatuses.includes(statusValue as LeaveRequestStatus)
    ? statusValue as LeaveRequestStatus
    : 'all';
  const dateFrom = readString(filters, 'date_from');
  const dateTo = readString(filters, 'date_to');
  if (dateFrom) requireDate(dateFrom, 'Start filter date');
  if (dateTo) requireDate(dateTo, 'End filter date');
  if (dateFrom && dateTo && dateTo < dateFrom) {
    throw new Error('End filter date cannot be earlier than start filter date.');
  }

  return {
    query: readString(filters, 'query'),
    employee_id: readString(filters, 'employee_id'),
    leave_type_id: readString(filters, 'leave_type_id'),
    status,
    date_from: dateFrom,
    date_to: dateTo,
  };
}

function parseLeaveBalanceFilters(filters: unknown): LeaveBalanceFilters {
  if (!isRecord(filters)) {
    return {
      query: '',
      employee_id: '',
      leave_type_id: '',
      year: new Date().getFullYear(),
    };
  }
  return {
    query: readString(filters, 'query'),
    employee_id: readString(filters, 'employee_id'),
    leave_type_id: readString(filters, 'leave_type_id'),
    year: readYear(filters.year),
  };
}

function validateLeaveTypeInput(payload: unknown): LeaveTypeInput {
  if (!isRecord(payload)) {
    throw new Error('Leave type information is required.');
  }

  const code = readString(payload, 'code').toUpperCase();
  const name = readString(payload, 'name');
  const genderValue = readString(payload, 'gender_eligibility') || 'all';
  if (!code) throw new Error('Leave code is required.');
  if (!name) throw new Error('Leave name is required.');
  if (!['all', 'female', 'male'].includes(genderValue)) {
    throw new Error('Gender eligibility is invalid.');
  }

  const annualCredit = readNonNegativeNumber(payload.annual_credit, 'Annual credit');
  const maxCarryOver = readNonNegativeNumber(payload.max_carry_over, 'Maximum carry-over');
  const advanceNoticeDays = readNonNegativeInteger(
    payload.advance_notice_days,
    'Advance notice days',
  );
  const minServiceMonths = readNonNegativeInteger(
    payload.min_service_months,
    'Minimum service months',
  );
  const trackBalance = readBoolean(payload.track_balance, true) ? 1 : 0;
  const allowCarryOver = readBoolean(payload.allow_carry_over, false) ? 1 : 0;

  return {
    code,
    name,
    description: readString(payload, 'description'),
    is_paid: readBoolean(payload.is_paid, true) ? 1 : 0,
    track_balance: trackBalance,
    annual_credit: trackBalance ? annualCredit : 0,
    allow_half_day: readBoolean(payload.allow_half_day, true) ? 1 : 0,
    require_attachment: readBoolean(payload.require_attachment, false) ? 1 : 0,
    advance_notice_days: advanceNoticeDays,
    allow_carry_over: allowCarryOver,
    max_carry_over: allowCarryOver ? maxCarryOver : 0,
    min_service_months: minServiceMonths,
    gender_eligibility: genderValue as 'all' | 'female' | 'male',
    is_active: readBoolean(payload.is_active, true) ? 1 : 0,
  };
}

async function ensureLeaveBalancesForYear(year: number): Promise<void> {
  await getDb().run(
    `INSERT OR IGNORE INTO employee_leave_balances (
      id, employee_id, leave_type_id, balance_year, opening_balance, earned,
      adjustments, notes, created_at, updated_at
    )
    SELECT
      'balance_' || lower(hex(randomblob(16))),
      employees.id,
      leave_types.id,
      ?,
      0,
      leave_types.annual_credit,
      0,
      'Automatically created from the leave-type annual credit.',
      datetime('now'),
      datetime('now')
    FROM employees
    CROSS JOIN leave_types
    WHERE employees.is_active = 1
      AND leave_types.is_active = 1
      AND leave_types.track_balance = 1`,
    year,
  );
}

async function ensureBalance(
  employeeId: string,
  leaveType: LeaveTypeRecord,
  year: number,
): Promise<void> {
  if (leaveType.track_balance !== 1) return;
  await getDb().run(
    `INSERT OR IGNORE INTO employee_leave_balances (
      id, employee_id, leave_type_id, balance_year, opening_balance, earned,
      adjustments, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, ?, 0, ?, datetime('now'), datetime('now'))`,
    `balance_${randomUUID()}`,
    employeeId,
    leaveType.id,
    year,
    leaveType.annual_credit,
    'Automatically created from the leave-type annual credit.',
  );
}

async function getBalanceForEmployeeType(
  employeeId: string,
  leaveTypeId: string,
  year: number,
  excludeRequestId = '',
): Promise<LeaveBalanceRecord | null> {
  const excludeClause = excludeRequestId ? 'AND requests.id <> ?' : '';
  const params = [employeeId, leaveTypeId, year];
  const requestParams = excludeRequestId ? [excludeRequestId] : [];

  const row = await getDb().get<LeaveBalanceRecord>(
    `SELECT
       employee_leave_balances.id,
       employee_leave_balances.employee_id,
       employees.employee_number,
       employees.name AS employee_name,
       COALESCE(employees.department, '') AS department,
       employee_leave_balances.leave_type_id,
       leave_types.code AS leave_code,
       leave_types.name AS leave_name,
       employee_leave_balances.balance_year,
       employee_leave_balances.opening_balance,
       employee_leave_balances.earned,
       employee_leave_balances.adjustments,
       (employee_leave_balances.opening_balance
         + employee_leave_balances.earned
         + employee_leave_balances.adjustments) AS allocated,
       COALESCE((
         SELECT SUM(requests.total_days)
           FROM leave_requests requests
          WHERE requests.employee_id = employee_leave_balances.employee_id
            AND requests.leave_type_id = employee_leave_balances.leave_type_id
            AND requests.status = 'approved'
            AND CAST(strftime('%Y', requests.start_date) AS INTEGER) = employee_leave_balances.balance_year
            ${excludeClause}
       ), 0) AS used,
       COALESCE((
         SELECT SUM(requests.total_days)
           FROM leave_requests requests
          WHERE requests.employee_id = employee_leave_balances.employee_id
            AND requests.leave_type_id = employee_leave_balances.leave_type_id
            AND requests.status = 'pending'
            AND CAST(strftime('%Y', requests.start_date) AS INTEGER) = employee_leave_balances.balance_year
            ${excludeClause}
       ), 0) AS pending,
       CASE
         WHEN leave_types.track_balance = 1 THEN
           (employee_leave_balances.opening_balance
             + employee_leave_balances.earned
             + employee_leave_balances.adjustments)
           - COALESCE((
               SELECT SUM(requests.total_days)
                 FROM leave_requests requests
                WHERE requests.employee_id = employee_leave_balances.employee_id
                  AND requests.leave_type_id = employee_leave_balances.leave_type_id
                  AND requests.status IN ('approved', 'pending')
                  AND CAST(strftime('%Y', requests.start_date) AS INTEGER) = employee_leave_balances.balance_year
                  ${excludeClause}
             ), 0)
         ELSE 0
       END AS available,
       leave_types.track_balance,
       COALESCE(employee_leave_balances.notes, '') AS notes,
       employee_leave_balances.created_at,
       employee_leave_balances.updated_at
     FROM employee_leave_balances
     INNER JOIN employees ON employees.id = employee_leave_balances.employee_id
     INNER JOIN leave_types ON leave_types.id = employee_leave_balances.leave_type_id
     WHERE employee_leave_balances.employee_id = ?
       AND employee_leave_balances.leave_type_id = ?
       AND employee_leave_balances.balance_year = ?`,
    ...requestParams,
    ...requestParams,
    ...requestParams,
    ...params,
  );

  return row ? normalizeBalanceRecord(row) : null;
}

async function requireLeaveType(id: string): Promise<LeaveTypeRecord> {
  const row = await getDb().get<LeaveTypeRecord>(
    `${leaveTypeSelect} WHERE id = ?`,
    id,
  );
  if (!row) throw new Error('Leave type was not found.');
  return row;
}

async function requireLeaveRequest(id: string): Promise<LeaveRequestRecord> {
  const row = await getLeaveRequest(id);
  if (!row) throw new Error('Leave request was not found.');
  return row;
}

async function requireActiveEmployee(id: string): Promise<void> {
  const employee = await getDb().get<{ is_active: number }>(
    'SELECT is_active FROM employees WHERE id = ?',
    id,
  );
  if (!employee) throw new Error('Employee record was not found.');
  if (employee.is_active !== 1) throw new Error('The selected employee is inactive.');
}

function getDurationDescription(durationType: LeaveDurationType): string {
  if (durationType === 'half-day-am') return 'Morning half-day';
  if (durationType === 'half-day-pm') return 'Afternoon half-day';
  return 'Full-day';
}

function calculateLeaveDays(
  startDate: string,
  endDate: string,
  durationType: LeaveDurationType,
): number {
  if (durationType !== 'full-day') return 0.5;
  return getWorkingDates(startDate, endDate).length;
}

function getWorkingDates(startDate: string, endDate: string): string[] {
  const result: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      result.push(formatIsoDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeBalanceRecord(row: LeaveBalanceRecord): LeaveBalanceRecord {
  return {
    ...row,
    balance_year: Number(row.balance_year),
    opening_balance: roundDays(Number(row.opening_balance ?? 0)),
    earned: roundDays(Number(row.earned ?? 0)),
    adjustments: roundDays(Number(row.adjustments ?? 0)),
    allocated: roundDays(Number(row.allocated ?? 0)),
    used: roundDays(Number(row.used ?? 0)),
    pending: roundDays(Number(row.pending ?? 0)),
    available: roundDays(Number(row.available ?? 0)),
    track_balance: Number(row.track_balance ?? 0),
  };
}

function normalizeLeaveRequest(row: LeaveRequestRecord): LeaveRequestRecord {
  return {
    ...row,
    is_paid: Number(row.is_paid ?? 0),
    track_balance: Number(row.track_balance ?? 0),
    total_days: roundDays(Number(row.total_days ?? 0)),
  };
}

function readYear(value: unknown): number {
  const current = new Date().getFullYear();
  if (value === undefined || value === null || value === '') return current;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2200) {
    throw new Error('Leave balance year is invalid.');
  }
  return parsed;
}

function readNonNegativeNumber(value: unknown, label: string): number {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }
  return roundDays(parsed);
}

function readNonNegativeInteger(value: unknown, label: string): number {
  const parsed = readNonNegativeNumber(value, label);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }
  return parsed;
}

function readFiniteNumber(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return roundDays(parsed);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
}

function requireDate(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} is required and must use YYYY-MM-DD.`);
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || formatIsoDate(parsed) !== value) {
    throw new Error(`${label} is invalid.`);
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value);
  return text || null;
}

function roundDays(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function translateLeaveTypeError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('leave_types.code')) {
    return new Error('That leave code is already in use.');
  }
  if (message.includes('leave_types.name')) {
    return new Error('That leave name is already in use.');
  }
  return error instanceof Error ? error : new Error('Unable to save the leave type.');
}
