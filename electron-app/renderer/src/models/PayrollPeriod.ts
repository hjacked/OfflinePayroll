export type PayrollFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type PayrollWorkflowStatus =
  | 'draft'
  | 'calculated'
  | 'approved'
  | 'finalized'
  | 'locked'
  | 'cancelled';

export interface PayrollPeriodInput {
  name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  frequency: PayrollFrequency;
  notes: string;
  workdays_per_month: number;
  hours_per_day: number;
  overtime_multiplier: number;
  night_differential_rate: number;
  created_by?: string;
}

export interface PayrollPeriod extends PayrollPeriodInput {
  id: string;
  status: string;
  workflow_status: PayrollWorkflowStatus;
  employee_count: number;
  gross_total: number;
  deduction_total: number;
  net_total: number;
  employer_contribution_total: number;
  validation_error_count: number;
  validation_warning_count: number;
  calculated_at: string;
  approved_at: string;
  finalized_at: string;
  locked_at: string;
  created_at: string;
  updated_at: string;
}

export type PayrollItemType =
  | 'earning'
  | 'deduction'
  | 'contribution'
  | 'employer-contribution'
  | 'information';

export interface PayrollLineItem {
  id: string;
  payroll_result_id: string;
  payroll_period_id: string;
  employee_id: string;
  item_type: PayrollItemType;
  source_type: string;
  source_id: string;
  code: string;
  name: string;
  amount: number;
  taxable: number;
  contribution_basis: number;
  employer_amount: number;
  metadata: Record<string, unknown>;
  sort_order: number;
}

export interface PayrollEmployeeResult {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  salary_type: string;
  basic_salary: number;
  period_basic_pay: number;
  overtime_pay: number;
  night_differential_pay: number;
  other_earnings: number;
  gross_income: number;
  attendance_deductions: number;
  other_deductions: number;
  government_deductions: number;
  employer_contributions: number;
  total_deductions: number;
  net_pay: number;
  taxable_income: number;
  contribution_basis: number;
  attendance_days: number;
  paid_days: number;
  absent_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  regular_hours: number;
  overtime_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  validation_status: 'ok' | 'warning' | 'error';
  calculated_at: string;
  line_items?: PayrollLineItem[];
}

export interface PayrollValidationIssue {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  severity: 'warning' | 'error';
  code: string;
  message: string;
  created_at: string;
}

export interface PayrollPeriodDetails {
  period: PayrollPeriod;
  employees: PayrollEmployeeResult[];
  issues: PayrollValidationIssue[];
  actions: Array<{
    id: string;
    action: string;
    actor: string;
    notes: string;
    created_at: string;
  }>;
}

export interface PayrollRegister {
  period: PayrollPeriod;
  employees: PayrollEmployeeResult[];
  totals: {
    basic_pay: number;
    overtime_pay: number;
    other_earnings: number;
    gross_income: number;
    attendance_deductions: number;
    other_deductions: number;
    government_deductions: number;
    total_deductions: number;
    employer_contributions: number;
    net_pay: number;
  };
}

export interface EmployeePayrollHistoryRecord extends PayrollEmployeeResult {
  period_name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  workflow_status: PayrollWorkflowStatus;
}
