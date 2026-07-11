export type DeductionCategory = 'loan' | 'statutory' | 'company' | 'advance' | 'penalty' | 'insurance' | 'cooperative' | 'other';
export type DeductionCalculationType = 'fixed' | 'percentage';
export type DeductionRecurrence = 'recurring' | 'one-time';
export type DeductionTransactionStatus = 'draft' | 'approved' | 'cancelled';
export type LoanStatus = 'draft' | 'active' | 'suspended' | 'paid' | 'cancelled';
export type DeductionFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export interface DeductionType {
  id: string; code: string; name: string; category: DeductionCategory; description: string;
  calculation_type: DeductionCalculationType; default_amount: number; default_percentage: number;
  recurrence: DeductionRecurrence; priority: number; is_active: number; created_at: string; updated_at: string;
}
export interface DeductionTypeInput {
  code: string; name: string; category: DeductionCategory; description: string;
  calculation_type: DeductionCalculationType; default_amount: number; default_percentage: number;
  recurrence: DeductionRecurrence; priority: number; is_active: boolean;
}
export interface DeductionAssignment {
  id: string; employee_id: string; employee_number: string; employee_name: string; department: string; role_title: string;
  deduction_type_id: string; deduction_code: string; deduction_name: string; category: DeductionCategory;
  calculation_type: DeductionCalculationType; amount: number; percentage: number; effective_from: string;
  effective_to: string; notes: string; is_active: number; created_at: string; updated_at: string;
}
export interface DeductionAssignmentInput {
  employee_id: string; deduction_type_id: string; amount: number; percentage: number;
  effective_from: string; effective_to: string; notes: string; is_active: boolean;
}
export interface LoanInstallment {
  id: string; loan_id: string; installment_number: number; due_date: string; amount_due: number;
  amount_paid: number; status: 'scheduled' | 'partial' | 'paid' | 'skipped'; transaction_id: string;
  paid_at: string; notes: string;
}
export interface EmployeeLoan {
  id: string; employee_id: string; employee_number: string; employee_name: string; department: string; role_title: string;
  deduction_type_id: string; deduction_code: string; deduction_name: string; loan_number: string;
  principal_amount: number; interest_rate: number; total_payable: number; loan_date: string;
  first_deduction_date: string; number_of_installments: number; deduction_frequency: DeductionFrequency;
  installment_amount: number; outstanding_balance: number; status: LoanStatus; notes: string;
  created_at: string; updated_at: string; installments?: LoanInstallment[];
}
export interface EmployeeLoanInput {
  employee_id: string; deduction_type_id: string; loan_number: string; principal_amount: number;
  interest_rate: number; loan_date: string; first_deduction_date: string; number_of_installments: number;
  deduction_frequency: DeductionFrequency; status: LoanStatus; notes: string;
}
export interface DeductionTransaction {
  id: string; employee_id: string; employee_number: string; employee_name: string; department: string; role_title: string;
  deduction_type_id: string; deduction_code: string; deduction_name: string; category: DeductionCategory;
  assignment_id: string; loan_id: string; loan_number: string; transaction_date: string; payroll_period_id: string;
  payroll_period_name: string; amount: number; reference: string; notes: string; status: DeductionTransactionStatus;
  created_at: string; updated_at: string;
}
export interface DeductionTransactionInput {
  employee_id: string; deduction_type_id: string; assignment_id: string; loan_id: string;
  transaction_date: string; payroll_period_id: string; amount: number; reference: string;
  notes: string; status: DeductionTransactionStatus;
}
export interface DeductionTypeFilters { query?: string; category?: 'all' | DeductionCategory; include_inactive?: boolean; }
export interface DeductionAssignmentFilters { query?: string; employee_id?: string; deduction_type_id?: string; as_of?: string; include_inactive?: boolean; }
export interface EmployeeLoanFilters { query?: string; employee_id?: string; status?: 'all' | LoanStatus; }
export interface DeductionTransactionFilters {
  query?: string; employee_id?: string; deduction_type_id?: string; category?: 'all' | DeductionCategory;
  status?: 'all' | DeductionTransactionStatus; date_from?: string; date_to?: string;
}
export interface DeductionSummary {
  total: number; draft: number; approved: number; cancelled: number; loan_payments: number;
  recurring_assignments: number; active_loans: number; outstanding_loans: number;
}
export interface LoanSummary {
  total_principal: number; total_payable: number; outstanding: number;
  active_count: number; suspended_count: number; paid_count: number;
}
