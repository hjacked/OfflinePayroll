export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  status?: string;
  hours_worked?: number;
  overtime_hours?: number;
  payroll_period_id?: string;
}
