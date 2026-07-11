export interface Payslip {
  id: string;
  employee_id: string;
  payroll_period_id: string;
  gross_income?: number;
  total_deductions?: number;
  net_pay?: number;
  breakdown?: Record<string, unknown>;
  file_path?: string;
  created_at?: string;
}
