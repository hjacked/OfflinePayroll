export type LeaveRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type LeaveDurationType =
  | 'full-day'
  | 'half-day-am'
  | 'half-day-pm';

export interface LeaveType {
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

export interface LeaveTypeInput {
  code: string;
  name: string;
  description: string;
  is_paid: boolean;
  track_balance: boolean;
  annual_credit: number;
  allow_half_day: boolean;
  require_attachment: boolean;
  advance_notice_days: number;
  allow_carry_over: boolean;
  max_carry_over: number;
  min_service_months: number;
  gender_eligibility: 'all' | 'female' | 'male';
  is_active: boolean;
}

export interface LeaveBalance {
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

export interface LeaveBalanceFilters {
  query?: string;
  employee_id?: string;
  leave_type_id?: string;
  year?: number;
}

export interface LeaveBalanceAdjustmentInput {
  employee_id: string;
  leave_type_id: string;
  year: number;
  amount: number;
  reason: string;
}

export interface LeaveRequest {
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

export interface LeaveRequestInput {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  duration_type: LeaveDurationType;
  reason: string;
  attachment_reference: string;
}

export interface LeaveRequestFilters {
  query?: string;
  employee_id?: string;
  leave_type_id?: string;
  status?: 'all' | LeaveRequestStatus;
  date_from?: string;
  date_to?: string;
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
