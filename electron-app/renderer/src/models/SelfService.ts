import type { AuthUser } from './Auth';
import type {
  AttendanceCorrection,
  AttendanceRecord,
  AttendanceSummary,
} from './Attendance';
import type { ContributionRecord, ContributionSummary } from './Contributions';
import type {
  DeductionAssignment,
  DeductionSummary,
  DeductionTransaction,
  EmployeeLoan,
  LoanSummary,
} from './Deductions';
import type { EarningAssignment, EarningSummary, EarningTransaction } from './Earnings';
import type { Employee } from './Employee';
import type { LeaveBalance, LeaveRequest, LeaveType } from './Leave';
import type { EmployeePayrollHistoryRecord } from './PayrollPeriod';
import type { Payslip } from './Payslip';

export interface SelfServiceProfile {
  user: Pick<
    AuthUser,
    'id' | 'username' | 'display_name' | 'email' | 'role' | 'employee_id'
  >;
  employee: Employee;
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
  attendance: AttendanceSummary;
  available_leave_days: number;
  pending_leave_requests: number;
  pending_attendance_corrections: number;
  active_loan_balance: number;
  latest_payroll: EmployeePayrollHistoryRecord | null;
  latest_payslip: Payslip | null;
}

export interface SelfServiceEarnings {
  assignments: EarningAssignment[];
  transactions: EarningTransaction[];
  summary: EarningSummary;
}

export interface SelfServiceDeductions {
  assignments: DeductionAssignment[];
  loans: EmployeeLoan[];
  transactions: DeductionTransaction[];
  summary: DeductionSummary;
  loan_summary: LoanSummary;
}

export interface SelfServiceContributions {
  records: ContributionRecord[];
  summary: ContributionSummary;
}

export interface SelfServiceAttendanceData {
  records: AttendanceRecord[];
  summary: AttendanceSummary;
  schedule: SelfServiceSchedule | null;
}

export interface SelfServiceCorrectionData {
  records: AttendanceCorrection[];
}

export type SelfServiceLeaveTypesResult = { data: LeaveType[]; total: number };
export type SelfServiceLeaveBalancesResult = { data: LeaveBalance[]; total: number };
export type SelfServiceLeaveRequestsResult = { data: LeaveRequest[]; total: number };
