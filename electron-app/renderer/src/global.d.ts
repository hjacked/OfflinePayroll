import type {
  AttendanceCorrection,
  AttendanceCorrectionInput,
  AttendanceImportResult,
  AttendanceImportRow,
  AttendanceInput,
  AttendanceListFilters,
  AttendanceRecord,
  AttendanceSummary,
  ScheduleAssignment,
  ScheduleAssignmentInput,
  WorkSchedule,
  WorkScheduleInput,
} from './models/Attendance';
import type {
  LeaveBalance,
  LeaveBalanceAdjustmentInput,
  LeaveBalanceFilters,
  LeaveRequest,
  LeaveRequestFilters,
  LeaveRequestInput,
  LeaveSummary,
  LeaveType,
  LeaveTypeInput,
} from './models/Leave';
import type {
  Employee,
  EmployeeInput,
  EmployeeListFilters,
} from './models/Employee';

export interface PayrollApi {
  employee: {
    list: (
      filters?: EmployeeListFilters,
    ) => Promise<{ data: Employee[]; total: number }>;
    get: (id: string) => Promise<Employee | null>;
    create: (payload: EmployeeInput) => Promise<Employee>;
    update: (id: string, payload: EmployeeInput) => Promise<Employee>;
    setStatus: (id: string, active: boolean) => Promise<Employee>;
    delete: (id: string) => Promise<{ id: string }>;
  };
  attendance: {
    list: (
      filters?: AttendanceListFilters,
    ) => Promise<{ data: AttendanceRecord[]; total: number }>;
    get: (id: string) => Promise<AttendanceRecord | null>;
    summary: (filters?: AttendanceListFilters) => Promise<AttendanceSummary>;
    create: (payload: AttendanceInput) => Promise<AttendanceRecord>;
    update: (id: string, payload: AttendanceInput) => Promise<AttendanceRecord>;
    delete: (id: string) => Promise<{ id: string }>;
    importRows: (rows: AttendanceImportRow[]) => Promise<AttendanceImportResult>;
  };
  schedule: {
    list: (filters?: {
      include_inactive?: boolean;
    }) => Promise<{ data: WorkSchedule[]; total: number }>;
    create: (payload: WorkScheduleInput) => Promise<WorkSchedule>;
    update: (id: string, payload: WorkScheduleInput) => Promise<WorkSchedule>;
    delete: (id: string) => Promise<{ id: string }>;
    assignments: (filters?: {
      employee_id?: string;
    }) => Promise<{ data: ScheduleAssignment[]; total: number }>;
    assign: (payload: ScheduleAssignmentInput) => Promise<ScheduleAssignment>;
    unassign: (id: string) => Promise<{ id: string }>;
  };
  attendanceCorrection: {
    list: (filters?: {
      status?: 'all' | 'pending' | 'approved' | 'rejected';
      employee_id?: string;
    }) => Promise<{ data: AttendanceCorrection[]; total: number }>;
    create: (payload: AttendanceCorrectionInput) => Promise<AttendanceCorrection>;
    review: (
      id: string,
      payload: {
        decision: 'approved' | 'rejected';
        reviewer_notes: string;
      },
    ) => Promise<AttendanceCorrection>;
  };
  leaveType: {
    list: (filters?: {
      include_inactive?: boolean;
    }) => Promise<{ data: LeaveType[]; total: number }>;
    create: (payload: LeaveTypeInput) => Promise<LeaveType>;
    update: (id: string, payload: LeaveTypeInput) => Promise<LeaveType>;
    delete: (id: string) => Promise<{ id: string; deactivated: boolean }>;
  };
  leaveBalance: {
    list: (
      filters?: LeaveBalanceFilters,
    ) => Promise<{ data: LeaveBalance[]; total: number }>;
    adjust: (payload: LeaveBalanceAdjustmentInput) => Promise<LeaveBalance>;
  };
  leaveRequest: {
    list: (
      filters?: LeaveRequestFilters,
    ) => Promise<{ data: LeaveRequest[]; total: number }>;
    get: (id: string) => Promise<LeaveRequest | null>;
    summary: (filters?: LeaveRequestFilters) => Promise<LeaveSummary>;
    create: (payload: LeaveRequestInput) => Promise<LeaveRequest>;
    update: (id: string, payload: LeaveRequestInput) => Promise<LeaveRequest>;
    review: (
      id: string,
      payload: {
        decision: 'approved' | 'rejected';
        reviewer_notes: string;
      },
    ) => Promise<LeaveRequest>;
    cancel: (
      id: string,
      payload?: { reason: string },
    ) => Promise<LeaveRequest>;
  };
  payroll: {
    createPeriod: (payload: {
      name: string;
      start_date: string;
      end_date: string;
      frequency: string;
      created_by?: string;
    }) => Promise<{
      period: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        frequency: string;
        status: string;
        created_by?: string;
        created_at?: string;
        updated_at?: string;
      };
    }>;
    run: (periodId: string) => Promise<{ periodId: string; status: string }>;
  };
}

declare global {
  interface Window {
    api: PayrollApi;
  }
}
