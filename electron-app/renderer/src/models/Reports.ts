import type { PayrollWorkflowStatus } from './PayrollPeriod';

export interface ReportFilters {
  period_id?: string;
  date_from?: string;
  date_to?: string;
  employee_id?: string;
  department?: string;
  status?: PayrollWorkflowStatus | 'all';
  query?: string;
}

export interface ReportPeriodOption {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  frequency: string;
  workflow_status: PayrollWorkflowStatus;
}

export interface ReportEmployeeOption {
  id: string;
  employee_number: string;
  name: string;
  department: string;
}

export interface ReportOptions {
  periods: ReportPeriodOption[];
  employees: ReportEmployeeOption[];
  departments: string[];
}

export interface ReportsDashboardData {
  totals: {
    periods: number;
    employee_records: number;
    employees: number;
    departments: number;
    gross_income: number;
    total_deductions: number;
    net_pay: number;
    employer_contributions: number;
  };
  recent_periods: Array<ReportPeriodOption & {
    employee_count: number;
    gross_total: number;
    deduction_total: number;
    net_total: number;
  }>;
}

export interface PayrollRegisterReportRow {
  id: string;
  period_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  workflow_status: PayrollWorkflowStatus;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
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
  validation_status: 'ok' | 'warning' | 'error';
}

export interface PayrollRegisterReport {
  rows: PayrollRegisterReportRow[];
  totals: {
    period_basic_pay: number;
    overtime_pay: number;
    night_differential_pay: number;
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

export interface PayrollSummaryPeriodRow {
  period_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  frequency: string;
  workflow_status: PayrollWorkflowStatus;
  employee_count: number;
  gross_income: number;
  total_deductions: number;
  employer_contributions: number;
  net_pay: number;
}

export interface PayrollSummaryDepartmentRow {
  department: string;
  employee_count: number;
  period_count: number;
  gross_income: number;
  total_deductions: number;
  employer_contributions: number;
  net_pay: number;
}

export interface PayrollSummaryReport {
  periods: PayrollSummaryPeriodRow[];
  departments: PayrollSummaryDepartmentRow[];
  totals: {
    employee_records: number;
    gross_income: number;
    total_deductions: number;
    employer_contributions: number;
    net_pay: number;
  };
}

export interface ReportLineItemRow {
  id: string;
  period_id: string;
  period_name: string;
  payment_date: string;
  workflow_status: PayrollWorkflowStatus;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  item_type: string;
  source_type: string;
  code: string;
  name: string;
  amount: number;
  taxable: number;
  contribution_basis: number;
}

export interface ReportLineItemSummary {
  code: string;
  name: string;
  source_type: string;
  amount: number;
  records: number;
}

export interface LineItemReport {
  rows: ReportLineItemRow[];
  summary: ReportLineItemSummary[];
  total: number;
}

export interface ContributionReportRow {
  period_id: string;
  period_name: string;
  payment_date: string;
  workflow_status: PayrollWorkflowStatus;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  contribution_key: string;
  code: string;
  name: string;
  employee_share: number;
  employer_share: number;
  total_contribution: number;
}

export interface ContributionReportSummary {
  code: string;
  name: string;
  employee_share: number;
  employer_share: number;
  total_contribution: number;
  employees: number;
}

export interface ContributionReport {
  rows: ContributionReportRow[];
  summary: ContributionReportSummary[];
  totals: {
    employee_share: number;
    employer_share: number;
    total_contribution: number;
  };
}

export interface NetPayReportRow {
  period_id: string;
  period_name: string;
  payment_date: string;
  workflow_status: PayrollWorkflowStatus;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  gross_income: number;
  total_deductions: number;
  net_pay: number;
  validation_status: 'ok' | 'warning' | 'error';
}

export interface NetPayReport {
  rows: NetPayReportRow[];
  totals: {
    employees: number;
    gross_income: number;
    total_deductions: number;
    net_pay: number;
  };
}

export interface PayrollVarianceInput {
  current_period_id: string;
  comparison_period_id: string;
  department?: string;
  query?: string;
}

export interface PayrollVarianceRow {
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  comparison_gross: number;
  current_gross: number;
  gross_variance: number;
  comparison_deductions: number;
  current_deductions: number;
  deduction_variance: number;
  comparison_net: number;
  current_net: number;
  net_variance: number;
}

export interface PayrollVarianceReport {
  current_period: ReportPeriodOption;
  comparison_period: ReportPeriodOption;
  rows: PayrollVarianceRow[];
  totals: {
    comparison_gross: number;
    current_gross: number;
    gross_variance: number;
    comparison_deductions: number;
    current_deductions: number;
    deduction_variance: number;
    comparison_net: number;
    current_net: number;
    net_variance: number;
  };
}

export interface BankTransferReportRow {
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  bank_name: string;
  bank_account: string;
  net_pay: number;
  ready: number;
}

export interface BankTransferReport {
  period: ReportPeriodOption;
  rows: BankTransferReportRow[];
  totals: {
    employees: number;
    ready: number;
    missing_accounts: number;
    net_pay: number;
  };
}

export interface PdfExportResult {
  saved: boolean;
  filePath?: string;
}
