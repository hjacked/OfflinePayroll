export type PayslipStatus = 'draft' | 'published';

export interface CompanyProfile {
  id: string;
  company_name: string;
  address: string;
  contact_email: string;
  contact_phone: string;
  tax_id: string;
  logo_data_url: string;
  payslip_footer: string;
  updated_at: string;
}

export interface PayslipLineItem {
  id: string;
  item_type:
    | 'earning'
    | 'deduction'
    | 'contribution'
    | 'employer-contribution'
    | 'information';
  source_type: string;
  source_id: string;
  code: string;
  name: string;
  amount: number;
  employer_amount: number;
  metadata: Record<string, unknown>;
  sort_order: number;
}

export interface PayslipSnapshot {
  license?: {
    edition: 'trial' | 'full_perpetual' | 'full_subscription';
    status: 'active' | 'expired' | 'invalid' | 'device_mismatch' | 'revoked';
    watermark: string;
  };
  company: CompanyProfile;
  period: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    payment_date: string;
    frequency: string;
    workflow_status: string;
  };
  employee: {
    id: string;
    employee_number: string;
    name: string;
    department: string;
    role_title: string;
    bank_name: string;
    bank_account: string;
    sss_number: string;
    philhealth_number: string;
    pagibig_number: string;
    tin_number: string;
  };
  totals: {
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
  };
  attendance: {
    attendance_days: number;
    paid_days: number;
    absent_days: number;
    paid_leave_days: number;
    unpaid_leave_days: number;
    regular_hours: number;
    overtime_hours: number;
    late_minutes: number;
    undertime_minutes: number;
  };
  earnings: PayslipLineItem[];
  deductions: PayslipLineItem[];
  contributions: PayslipLineItem[];
  employer_contributions: PayslipLineItem[];
  information: PayslipLineItem[];
  loan_balances: Array<{
    loan_id: string;
    loan_number: string;
    deduction_name: string;
    outstanding_balance: number;
  }>;
  generated_at: string;
}

export interface PayslipActionLog {
  id: string;
  payslip_id: string;
  action: string;
  actor: string;
  notes: string;
  created_at: string;
}

export interface PayslipDownloadLog {
  id: string;
  payslip_id: string;
  employee_id: string;
  downloaded_by: string;
  file_path: string;
  downloaded_at: string;
}

export interface Payslip {
  id: string;
  payroll_period_id: string;
  payroll_result_id: string;
  employee_id: string;
  reference_number: string;
  status: PayslipStatus;
  generated_by: string;
  generated_at: string;
  published_by: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  period_name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  workflow_status: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  gross_income: number;
  total_deductions: number;
  net_pay: number;
  download_count: number;
  last_downloaded_at: string;
  snapshot?: PayslipSnapshot;
  actions?: PayslipActionLog[];
  downloads?: PayslipDownloadLog[];
}

export interface PayslipFilters {
  period_id?: string;
  employee_id?: string;
  status?: PayslipStatus | 'all';
  query?: string;
  published_only?: boolean;
}

export interface PayslipSummary {
  total: number;
  draft: number;
  published: number;
  downloaded: number;
  gross_income: number;
  total_deductions: number;
  net_pay: number;
}

export interface PayslipOptions {
  periods: Array<{
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    payment_date: string;
    workflow_status: string;
    result_count: number;
    payslip_count: number;
    published_count: number;
  }>;
  employees: Array<{
    id: string;
    employee_number: string;
    name: string;
    department: string;
  }>;
}

export interface PayslipGenerationResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  data: Payslip[];
}

export interface PayslipPdfExportResult {
  saved: boolean;
  filePath?: string;
}

export interface CompanyLogoSelection {
  selected: boolean;
  fileName?: string;
  dataUrl?: string;
}
