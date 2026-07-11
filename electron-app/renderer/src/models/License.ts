export type LicenseEdition = 'trial' | 'full_perpetual' | 'full_subscription';
export type LicenseStatus = 'active' | 'expired' | 'invalid' | 'device_mismatch' | 'revoked';
export type LicenseSource = 'automatic_trial' | 'signed_license';

export interface DeveloperInformation {
  application_name: string;
  application_version: string;
  developer_name: string;
  support_email: string;
  support_phone: string;
  website: string;
  copyright_notice: string;
  build_date: string;
}

export interface LicenseOverview {
  installation_id: string;
  source: LicenseSource;
  edition: LicenseEdition;
  status: LicenseStatus;
  license_id: string;
  customer_name: string;
  issued_at: string;
  activated_at: string;
  expires_at: string;
  trial_started_at: string;
  trial_expires_at: string;
  days_remaining: number | null;
  max_employees: number | null;
  active_employees: number;
  features: string[];
  machine_bound: boolean;
  read_only: boolean;
  watermark: string;
  message: string;
  last_verified_at: string;
  developer: DeveloperInformation;
}

export interface LicenseEvent {
  id: string;
  action: string;
  outcome: 'success' | 'failure' | 'info';
  details: string;
  created_at: string;
}

export interface LicenseActivationResult {
  activated: boolean;
  filePath?: string;
  license?: LicenseOverview;
}

export interface LicenseDiagnosticsResult {
  saved: boolean;
  filePath?: string;
}
