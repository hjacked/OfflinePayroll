export type ContributionCalculationMethod =
  | 'bracket'
  | 'percentage'
  | 'fixed'
  | 'tax-bracket';

export type ContributionTableStatus = 'draft' | 'active' | 'archived';
export type ContributionRecordStatus = 'draft' | 'approved' | 'remitted' | 'cancelled';
export type GovernmentNumberField =
  | 'sss_number'
  | 'philhealth_number'
  | 'pagibig_number'
  | 'tin_number'
  | 'none';

export interface ContributionType {
  id: string;
  code: string;
  name: string;
  authority: string;
  description: string;
  calculation_method: ContributionCalculationMethod;
  government_number_field: GovernmentNumberField;
  employee_share_enabled: number;
  employer_share_enabled: number;
  is_tax: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ContributionTypeInput {
  code: string;
  name: string;
  authority: string;
  description: string;
  calculation_method: ContributionCalculationMethod;
  government_number_field: GovernmentNumberField;
  employee_share_enabled: number;
  employer_share_enabled: number;
  is_tax: number;
  is_active: number;
}

export interface ContributionTypeFilters {
  query?: string;
  include_inactive?: boolean;
}

export interface ContributionTableVersion {
  id: string;
  contribution_type_id: string;
  contribution_code: string;
  contribution_name: string;
  authority: string;
  version_name: string;
  effective_from: string;
  effective_to: string;
  status: ContributionTableStatus;
  notes: string;
  bracket_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContributionTableVersionInput {
  contribution_type_id: string;
  version_name: string;
  effective_from: string;
  effective_to: string;
  status: ContributionTableStatus;
  notes: string;
}

export interface ContributionTableFilters {
  contribution_type_id?: string;
  status?: ContributionTableStatus | 'all';
  as_of?: string;
  query?: string;
}

export interface ContributionBracket {
  id: string;
  table_version_id: string;
  min_compensation: number;
  max_compensation: number | null;
  employee_fixed: number;
  employee_rate: number;
  employee_excess_over: number;
  employer_fixed: number;
  employer_rate: number;
  employer_excess_over: number;
  notes: string;
  sort_order: number;
}

export interface ContributionBracketInput {
  min_compensation: number;
  max_compensation: number | null;
  employee_fixed: number;
  employee_rate: number;
  employee_excess_over: number;
  employer_fixed: number;
  employer_rate: number;
  employer_excess_over: number;
  notes: string;
  sort_order: number;
}

export interface ContributionCalculationInput {
  employee_id: string;
  contribution_type_id: string;
  contribution_date: string;
  compensation_basis: number;
  table_version_id?: string;
}

export interface ContributionCalculationResult {
  employee_id: string;
  employee_number: string;
  employee_name: string;
  contribution_type_id: string;
  contribution_code: string;
  contribution_name: string;
  table_version_id: string;
  table_version_name: string;
  contribution_date: string;
  compensation_basis: number;
  employee_share: number;
  employer_share: number;
  total_contribution: number;
  government_number: string;
  missing_government_number: boolean;
  bracket: ContributionBracket;
}

export interface ContributionRecord extends ContributionCalculationResult {
  id: string;
  payroll_period_id: string;
  payroll_period_name: string;
  reference: string;
  notes: string;
  status: ContributionRecordStatus;
  created_at: string;
  updated_at: string;
}

export interface ContributionRecordInput extends ContributionCalculationInput {
  payroll_period_id?: string;
  reference?: string;
  notes?: string;
  status?: ContributionRecordStatus;
}

export interface ContributionRecordFilters {
  employee_id?: string;
  contribution_type_id?: string;
  status?: ContributionRecordStatus | 'all';
  date_from?: string;
  date_to?: string;
  query?: string;
}

export interface ContributionSummary {
  employee_share: number;
  employer_share: number;
  total_contribution: number;
  record_count: number;
  missing_number_count: number;
  draft_count: number;
  approved_count: number;
  remitted_count: number;
  by_type: Array<{
    contribution_type_id: string;
    contribution_code: string;
    contribution_name: string;
    employee_share: number;
    employer_share: number;
    total_contribution: number;
    record_count: number;
  }>;
}
