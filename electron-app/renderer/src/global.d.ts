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
