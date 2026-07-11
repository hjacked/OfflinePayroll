import type { CompanyProfile } from './Payslip';
import type { PayrollFrequency } from './PayrollPeriod';

export type BackupFrequency = 'daily' | 'weekly' | 'monthly';

export interface PayrollDefaults {
  id: 'default';
  default_frequency: PayrollFrequency;
  workdays_per_month: number;
  hours_per_day: number;
  overtime_multiplier: number;
  night_differential_rate: number;
  payment_delay_days: number;
  updated_at: string;
}

export interface BackupPolicy {
  id: 'default';
  backup_directory: string;
  auto_backup_enabled: boolean;
  backup_frequency: BackupFrequency;
  retention_count: number;
  include_audit_logs: boolean;
  updated_at: string;
}

export interface SettingsAuditLog {
  id: string;
  category: 'company' | 'payroll' | 'backup';
  actor_id: string;
  actor_name: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface SystemInformation {
  application_version: string;
  electron_version: string;
  node_version: string;
  database_path: string;
  database_size_bytes: number;
  active_employees: number;
  active_users: number;
  payroll_periods: number;
  payslips: number;
}

export interface SettingsBundle {
  company: CompanyProfile;
  payroll: PayrollDefaults;
  backup: BackupPolicy;
  system: SystemInformation;
  audit: SettingsAuditLog[];
}

export interface BackupDirectorySelection {
  selected: boolean;
  path?: string;
}
