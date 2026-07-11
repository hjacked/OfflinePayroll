export type EarningCategory =
  | 'allowance'
  | 'bonus'
  | 'incentive'
  | 'commission'
  | 'reimbursement'
  | 'adjustment'
  | 'other';

export type CalculationType = 'fixed' | 'variable';
export type EarningRecurrence = 'recurring' | 'one-time';
export type Taxability = 'taxable' | 'non-taxable';
export type EarningTransactionStatus = 'draft' | 'approved' | 'cancelled';

export interface EarningType {
  id: string;
  code: string;
  name: string;
  category: EarningCategory;
  description: string;
  calculation_type: CalculationType;
  default_amount: number;
  recurrence: EarningRecurrence;
  taxability: Taxability;
  include_in_gross: number;
  include_in_contribution_basis: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface EarningTypeInput {
  code: string;
  name: string;
  category: EarningCategory;
  description: string;
  calculation_type: CalculationType;
  default_amount: number;
  recurrence: EarningRecurrence;
  taxability: Taxability;
  include_in_gross: boolean;
  include_in_contribution_basis: boolean;
  is_active: boolean;
}

export interface EarningAssignment {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  earning_type_id: string;
  earning_code: string;
  earning_name: string;
  category: EarningCategory;
  taxability: Taxability;
  amount: number;
  effective_from: string;
  effective_to: string;
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface EarningAssignmentInput {
  employee_id: string;
  earning_type_id: string;
  amount: number;
  effective_from: string;
  effective_to: string;
  notes: string;
  is_active: boolean;
}

export interface EarningTransaction {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  earning_type_id: string;
  earning_code: string;
  earning_name: string;
  category: EarningCategory;
  taxability: Taxability;
  include_in_gross: number;
  include_in_contribution_basis: number;
  assignment_id: string;
  transaction_date: string;
  payroll_period_id: string;
  payroll_period_name: string;
  amount: number;
  reference: string;
  notes: string;
  status: EarningTransactionStatus;
  created_at: string;
  updated_at: string;
}

export interface EarningTransactionInput {
  employee_id: string;
  earning_type_id: string;
  assignment_id: string;
  transaction_date: string;
  payroll_period_id: string;
  amount: number;
  reference: string;
  notes: string;
  status: EarningTransactionStatus;
}

export interface EarningTypeFilters {
  query?: string;
  category?: 'all' | EarningCategory;
  include_inactive?: boolean;
}

export interface EarningAssignmentFilters {
  query?: string;
  employee_id?: string;
  earning_type_id?: string;
  as_of?: string;
  include_inactive?: boolean;
}

export interface EarningTransactionFilters {
  query?: string;
  employee_id?: string;
  earning_type_id?: string;
  category?: 'all' | EarningCategory;
  status?: 'all' | EarningTransactionStatus;
  date_from?: string;
  date_to?: string;
}

export interface EarningSummary {
  total: number;
  draft: number;
  approved: number;
  cancelled: number;
  taxable: number;
  non_taxable: number;
  recurring_assignments: number;
}
