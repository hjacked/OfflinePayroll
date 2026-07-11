export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'leave'
  | 'rest-day'
  | 'holiday'
  | 'official-business'
  | 'work-from-home'
  | 'incomplete';

export type AttendanceSource =
  | 'manual'
  | 'csv-import'
  | 'biometric'
  | 'employee-correction';

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

export interface AttendanceInput {
  employee_id: string;
  work_date: string;
  schedule_id: string;
  time_in: string;
  time_out: string;
  break_minutes: number | null;
  status: AttendanceStatus;
  source: AttendanceSource;
  notes: string;
  payroll_period_id?: string;
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

export interface WorkSchedule {
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

export interface WorkScheduleInput {
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  grace_minutes: number;
  standard_hours: number;
  is_active: boolean;
}

export interface ScheduleAssignment {
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

export interface ScheduleAssignmentInput {
  employee_id: string;
  schedule_id: string;
  effective_from: string;
  effective_to: string;
}

export interface AttendanceCorrection {
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

export interface AttendanceCorrectionInput {
  employee_id: string;
  work_date: string;
  requested_time_in: string;
  requested_time_out: string;
  requested_status: AttendanceStatus;
  reason: string;
}

export interface AttendanceImportRow {
  employee_number: string;
  work_date: string;
  time_in: string;
  time_out: string;
  status: string;
  schedule_name: string;
  break_minutes: string | number;
  notes: string;
}

export interface AttendanceImportResult {
  imported: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
}
