import { randomUUID } from 'node:crypto';
import { getDb } from '../db';
import { currentUser, type AuthUser } from './auth-service';
import {
  createAttendanceCorrection,
  getAttendanceCorrections,
  getAttendanceRecords,
  getAttendanceSummary,
  type AttendanceListFilters,
} from './attendance-service';
import {
  cancelLeaveRequest,
  createLeaveRequest,
  getLeaveBalances,
  getLeaveRequest,
  getLeaveRequests,
  getLeaveTypes,
} from './leave-service';
import {
  getEarningAssignments,
  getEarningSummary,
  getEarningTransactions,
} from './earnings-service';
import {
  getDeductionAssignments,
  getDeductionSummary,
  getDeductionTransactions,
  getEmployeeLoans,
  getLoanSummary,
} from './deductions-service';
import {
  getContributionRecords,
  getContributionSummary,
} from './contributions-service';
import { getEmployeePayrollHistory } from './payroll-service';
import {
  getEmployeePublishedPayslip,
  getPayslips,
} from './payslip-service';
import { getEmployee, type EmployeeRecord } from './employee-service';

export interface SelfServiceProfile {
  user: Pick<
    AuthUser,
    'id' | 'username' | 'display_name' | 'email' | 'role' | 'employee_id'
  >;
  employee: EmployeeRecord;
}

export interface SelfServiceSchedule {
  id: string;
  schedule_id: string;
  schedule_name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  grace_minutes: number;
  standard_hours: number;
  effective_from: string;
  effective_to: string;
}

export interface SelfServiceDashboard {
  profile: SelfServiceProfile;
  attendance: Awaited<ReturnType<typeof getAttendanceSummary>>;
  available_leave_days: number;
  pending_leave_requests: number;
  pending_attendance_corrections: number;
  active_loan_balance: number;
  latest_payroll: Awaited<ReturnType<typeof getEmployeePayrollHistory>>['data'][number] | null;
  latest_payslip: Awaited<ReturnType<typeof getPayslips>>['data'][number] | null;
}

export async function getSelfServiceProfile(): Promise<SelfServiceProfile> {
  const { user, employee } = await requireLinkedEmployee();
  return {
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
    },
    employee,
  };
}

export async function updateSelfServiceContact(payload: unknown): Promise<SelfServiceProfile> {
  const { user, employee } = await requireLinkedEmployee();
  const input = asRecord(payload);
  const phone = optionalString(input.phone, 50);
  const address = optionalString(input.address, 500);

  await getDb().run(
    `UPDATE employees
        SET phone = ?,
            address = ?,
            updated_at = datetime('now')
      WHERE id = ?`,
    phone || null,
    address || null,
    employee.id,
  );

  await getDb().run(
    `INSERT INTO auth_audit_logs (
       id, user_id, username, action, details, created_at
     ) VALUES (?, ?, ?, 'employee_contact_updated', ?, datetime('now'))`,
    `auth_audit_${randomUUID()}`,
    user.id,
    user.username,
    'Employee updated their phone number or address through self-service.',
  );

  return getSelfServiceProfile();
}

export async function getSelfServiceDashboard(): Promise<SelfServiceDashboard> {
  const profile = await getSelfServiceProfile();
  const employeeId = profile.employee.id;
  const today = formatDate(new Date());
  const monthStart = `${today.slice(0, 7)}-01`;
  const year = Number(today.slice(0, 4));

  const [
    attendance,
    balances,
    pendingLeave,
    pendingCorrections,
    loanSummary,
    payrollHistory,
    payslips,
  ] = await Promise.all([
    getAttendanceSummary({ employee_id: employeeId, date_from: monthStart, date_to: today }),
    getLeaveBalances({ employee_id: employeeId, year }),
    getLeaveRequests({ employee_id: employeeId, status: 'pending' }),
    getAttendanceCorrections({ employee_id: employeeId, status: 'pending' }),
    getLoanSummary({ employee_id: employeeId }),
    getEmployeePayrollHistory({ employee_id: employeeId }),
    getPayslips({ employee_id: employeeId, published_only: true }),
  ]);

  return {
    profile,
    attendance,
    available_leave_days: round(
      balances.data.reduce((sum, balance) => sum + Number(balance.available || 0), 0),
    ),
    pending_leave_requests: pendingLeave.total,
    pending_attendance_corrections: pendingCorrections.total,
    active_loan_balance: round(Number(loanSummary.outstanding || 0)),
    latest_payroll: payrollHistory.data[0] ?? null,
    latest_payslip: payslips.data[0] ?? null,
  };
}

export async function getSelfAttendance(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  return getAttendanceRecords({ ...safeFilters(filters), employee_id: employeeId });
}

export async function getSelfAttendanceSummary(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  return getAttendanceSummary({ ...safeFilters(filters), employee_id: employeeId });
}

export async function getSelfSchedule(): Promise<SelfServiceSchedule | null> {
  const employeeId = await requireLinkedEmployeeId();
  const today = formatDate(new Date());
  const row = await getDb().get<SelfServiceSchedule>(
    `SELECT employee_schedule_assignments.id,
            employee_schedule_assignments.schedule_id,
            work_schedules.name AS schedule_name,
            work_schedules.start_time,
            work_schedules.end_time,
            work_schedules.break_minutes,
            work_schedules.grace_minutes,
            work_schedules.standard_hours,
            employee_schedule_assignments.effective_from,
            COALESCE(employee_schedule_assignments.effective_to, '') AS effective_to
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
    today,
    today,
  );
  return row ?? null;
}

export async function getSelfAttendanceCorrections(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  return getAttendanceCorrections({ ...safeFilters(filters), employee_id: employeeId });
}

export async function createSelfAttendanceCorrection(payload: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  return createAttendanceCorrection({ ...asRecord(payload), employee_id: employeeId });
}

export async function getSelfLeaveTypes() {
  await requireLinkedEmployeeId();
  return getLeaveTypes({ include_inactive: false });
}

export async function getSelfLeaveBalances(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  return getLeaveBalances({ ...safeFilters(filters), employee_id: employeeId });
}

export async function getSelfLeaveRequests(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  return getLeaveRequests({ ...safeFilters(filters), employee_id: employeeId });
}

export async function getSelfLeaveRequest(id: string) {
  const employeeId = await requireLinkedEmployeeId();
  const request = await getLeaveRequest(id);
  if (!request || request.employee_id !== employeeId) {
    throw new Error('The leave request was not found for the signed-in employee.');
  }
  return request;
}

export async function createSelfLeaveRequest(payload: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  return createLeaveRequest({ ...asRecord(payload), employee_id: employeeId });
}

export async function cancelSelfLeaveRequest(id: string, payload?: unknown) {
  await getSelfLeaveRequest(id);
  return cancelLeaveRequest(id, payload);
}

export async function getSelfEarnings(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  const common = safeFilters(filters);
  const [assignments, transactions, summary] = await Promise.all([
    getEarningAssignments({ ...common, employee_id: employeeId, include_inactive: false }),
    getEarningTransactions({ ...common, employee_id: employeeId, status: 'approved' }),
    getEarningSummary({ ...common, employee_id: employeeId }),
  ]);
  return { assignments: assignments.data, transactions: transactions.data, summary };
}

export async function getSelfDeductions(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  const common = safeFilters(filters);
  const [assignments, loans, transactions, summary, loanSummary] = await Promise.all([
    getDeductionAssignments({ ...common, employee_id: employeeId, include_inactive: false }),
    getEmployeeLoans({ ...common, employee_id: employeeId, status: 'all' }),
    getDeductionTransactions({ ...common, employee_id: employeeId, status: 'approved' }),
    getDeductionSummary({ ...common, employee_id: employeeId }),
    getLoanSummary({ ...common, employee_id: employeeId }),
  ]);
  return {
    assignments: assignments.data,
    loans: loans.data,
    transactions: transactions.data,
    summary,
    loan_summary: loanSummary,
  };
}

export async function getSelfContributions(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  const common = safeFilters(filters);
  const [records, summary] = await Promise.all([
    getContributionRecords({ ...common, employee_id: employeeId, status: 'all' }),
    getContributionSummary({ ...common, employee_id: employeeId }),
  ]);
  return { records: records.data, summary };
}

export async function getSelfPayrollHistory(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  return getEmployeePayrollHistory({ ...safeFilters(filters), employee_id: employeeId });
}

export async function getSelfPayslips(filters?: unknown) {
  const employeeId = await requireLinkedEmployeeId();
  return getPayslips({
    ...safeFilters(filters),
    employee_id: employeeId,
    published_only: true,
  });
}

export async function getSelfPayslip(id: string) {
  const employeeId = await requireLinkedEmployeeId();
  const payslip = await getEmployeePublishedPayslip(id, employeeId);
  if (!payslip) {
    throw new Error('The published payslip was not found for the signed-in employee.');
  }
  return payslip;
}

export async function getSelfIdentity(): Promise<{
  user: AuthUser;
  employee: EmployeeRecord;
}> {
  return requireLinkedEmployee();
}

async function requireLinkedEmployee(): Promise<{
  user: AuthUser;
  employee: EmployeeRecord;
}> {
  const user = await currentUser();
  if (!user) throw new Error('Authentication is required.');
  if (!user.employee_id) {
    throw new Error('This account is not linked to an employee profile. Contact an administrator.');
  }
  const employee = await getEmployee(user.employee_id);
  if (!employee || !employee.is_active) {
    throw new Error('The linked employee profile is unavailable or inactive.');
  }
  return { user, employee };
}

async function requireLinkedEmployeeId(): Promise<string> {
  const { employee } = await requireLinkedEmployee();
  return employee.id;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeFilters(value: unknown): Record<string, unknown> {
  const input = asRecord(value);
  const allowed = new Set([
    'query',
    'status',
    'date_from',
    'date_to',
    'year',
    'leave_type_id',
    'earning_type_id',
    'deduction_type_id',
    'contribution_type_id',
    'as_of',
  ]);
  return Object.fromEntries(
    Object.entries(input).filter(([key]) => allowed.has(key)),
  );
}

function optionalString(value: unknown, maxLength: number): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') throw new Error('Contact fields must be text.');
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`Contact information cannot exceed ${maxLength} characters.`);
  }
  return normalized;
}

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
