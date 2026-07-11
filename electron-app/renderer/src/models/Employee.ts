export type EmploymentStatus =
  | 'probationary'
  | 'regular'
  | 'contractual'
  | 'project-based'
  | 'part-time'
  | 'resigned'
  | 'terminated'
  | 'retired';

export type SalaryType = 'monthly' | 'daily' | 'hourly' | 'fixed-contract';

export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  role_title: string;
  employment_status: EmploymentStatus;
  employment_date: string;
  salary_type: SalaryType;
  basic_salary: number;
  salary_grade: string;
  bank_name: string;
  bank_account: string;
  sss_number: string;
  philhealth_number: string;
  pagibig_number: string;
  tin_number: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInput {
  employee_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  role_title: string;
  employment_status: EmploymentStatus;
  employment_date: string;
  salary_type: SalaryType;
  basic_salary: number;
  salary_grade: string;
  bank_name: string;
  bank_account: string;
  sss_number: string;
  philhealth_number: string;
  pagibig_number: string;
  tin_number: string;
  is_active: boolean;
}

export interface EmployeeListFilters {
  query?: string;
  status?: 'all' | 'active' | 'inactive';
}
