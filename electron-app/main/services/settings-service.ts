import { app } from 'electron';
import { stat } from 'node:fs/promises';
import { getDatabasePath, getDb } from '../db';
import { authorizePermission } from './auth-service';
import { getDeveloperInformation, type DeveloperInformation } from '../developer-info';
import {
  getCompanyProfile,
  updateCompanyProfile,
  type CompanyProfile,
} from './payslip-service';

export type PayrollFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
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
  developer: DeveloperInformation;
}

interface PayrollSettingsRow {
  id: 'default';
  default_frequency: PayrollFrequency;
  workdays_per_month: number;
  hours_per_day: number;
  overtime_multiplier: number;
  night_differential_rate: number;
  payment_delay_days: number;
  updated_at: string;
}

interface BackupSettingsRow {
  id: 'default';
  backup_directory: string | null;
  auto_backup_enabled: number;
  backup_frequency: BackupFrequency;
  retention_count: number;
  include_audit_logs: number;
  updated_at: string;
}

export async function getSettingsBundle(): Promise<SettingsBundle> {
  await authorizePermission('settings:manage');
  const [company, payroll, backup, system, audit] = await Promise.all([
    getCompanyProfile(),
    getPayrollDefaults(),
    getBackupPolicy(),
    getSystemInformation(),
    listSettingsAuditLogs(30),
  ]);
  return { company, payroll, backup, system, audit, developer: getDeveloperInformation() };
}

export async function getPayrollDefaults(): Promise<PayrollDefaults> {
  const row = await getDb().get<PayrollSettingsRow>(
    `SELECT id, default_frequency, workdays_per_month, hours_per_day,
            overtime_multiplier, night_differential_rate,
            payment_delay_days, updated_at
       FROM payroll_settings
      WHERE id = 'default'`,
  );
  if (!row) throw new Error('Payroll defaults have not been initialized.');
  return row;
}

export async function getBackupPolicy(): Promise<BackupPolicy> {
  const row = await getDb().get<BackupSettingsRow>(
    `SELECT id, COALESCE(backup_directory, '') AS backup_directory,
            auto_backup_enabled, backup_frequency, retention_count,
            include_audit_logs, updated_at
       FROM backup_settings
      WHERE id = 'default'`,
  );
  if (!row) throw new Error('Backup policy has not been initialized.');
  return {
    id: row.id,
    backup_directory: row.backup_directory || '',
    auto_backup_enabled: Boolean(row.auto_backup_enabled),
    backup_frequency: row.backup_frequency,
    retention_count: Number(row.retention_count),
    include_audit_logs: Boolean(row.include_audit_logs),
    updated_at: row.updated_at,
  };
}

export async function updateCompanySettings(payload: unknown): Promise<CompanyProfile> {
  const actor = await authorizePermission('settings:manage');
  const before = await getCompanyProfile();
  const updated = await updateCompanyProfile(payload);
  await logSettingsChange(
    'company',
    actor.id,
    actor.display_name,
    changedFields(safeCompanyForAudit(before), safeCompanyForAudit(updated)),
  );
  return updated;
}

export async function updatePayrollSettings(payload: unknown): Promise<PayrollDefaults> {
  const actor = await authorizePermission('settings:manage');
  const before = await getPayrollDefaults();
  const input = asRecord(payload);
  const next: Omit<PayrollDefaults, 'id' | 'updated_at'> = {
    default_frequency: enumValue(
      input.default_frequency,
      ['weekly', 'biweekly', 'semimonthly', 'monthly'],
      'Default payroll frequency',
    ),
    workdays_per_month: numberInRange(input.workdays_per_month, 1, 31, 'Workdays per month'),
    hours_per_day: numberInRange(input.hours_per_day, 0.5, 24, 'Hours per day'),
    overtime_multiplier: numberInRange(input.overtime_multiplier, 1, 10, 'Overtime multiplier'),
    night_differential_rate: numberInRange(
      input.night_differential_rate,
      0,
      1,
      'Night differential rate',
    ),
    payment_delay_days: integerInRange(input.payment_delay_days, 0, 31, 'Payment delay days'),
  };

  await getDb().run(
    `UPDATE payroll_settings
        SET default_frequency = ?, workdays_per_month = ?, hours_per_day = ?,
            overtime_multiplier = ?, night_differential_rate = ?,
            payment_delay_days = ?, updated_at = datetime('now')
      WHERE id = 'default'`,
    next.default_frequency,
    next.workdays_per_month,
    next.hours_per_day,
    next.overtime_multiplier,
    next.night_differential_rate,
    next.payment_delay_days,
  );

  const updated = await getPayrollDefaults();
  await logSettingsChange('payroll', actor.id, actor.display_name, changedFields(before, updated));
  return updated;
}

export async function updateBackupPolicy(payload: unknown): Promise<BackupPolicy> {
  const actor = await authorizePermission('settings:manage');
  const before = await getBackupPolicy();
  const input = asRecord(payload);
  const directory = optionalString(input.backup_directory);
  if (directory.length > 1000) throw new Error('Backup directory is too long.');
  const frequency = enumValue(
    input.backup_frequency,
    ['daily', 'weekly', 'monthly'],
    'Backup frequency',
  );
  const retention = integerInRange(input.retention_count, 1, 100, 'Backup retention count');
  const autoBackup = Boolean(input.auto_backup_enabled);
  if (autoBackup && !directory) {
    throw new Error('Choose a backup directory before enabling automatic backups.');
  }

  await getDb().run(
    `UPDATE backup_settings
        SET backup_directory = ?, auto_backup_enabled = ?,
            backup_frequency = ?, retention_count = ?, include_audit_logs = ?,
            updated_at = datetime('now')
      WHERE id = 'default'`,
    directory,
    autoBackup ? 1 : 0,
    frequency,
    retention,
    Boolean(input.include_audit_logs) ? 1 : 0,
  );

  const updated = await getBackupPolicy();
  await logSettingsChange('backup', actor.id, actor.display_name, changedFields(before, updated));
  return updated;
}

export async function listSettingsAuditLogs(limitValue: unknown = 50): Promise<SettingsAuditLog[]> {
  const limit = Math.max(1, Math.min(200, Number(limitValue) || 50));
  const rows = await getDb().all<Array<{
    id: string;
    category: SettingsAuditLog['category'];
    actor_id: string | null;
    actor_name: string | null;
    changes_json: string;
    created_at: string;
  }>>(
    `SELECT id, category, COALESCE(actor_id, '') AS actor_id,
            COALESCE(actor_name, '') AS actor_name, changes_json, created_at
       FROM settings_audit_logs
      ORDER BY created_at DESC
      LIMIT ?`,
    limit,
  );
  return rows.map((row) => ({
    id: row.id,
    category: row.category,
    actor_id: row.actor_id || '',
    actor_name: row.actor_name || 'System',
    changes: parseJsonObject(row.changes_json),
    created_at: row.created_at,
  }));
}

export async function getSystemInformation(): Promise<SystemInformation> {
  const databasePath = getDatabasePath();
  let databaseSize = 0;
  try {
    databaseSize = (await stat(databasePath)).size;
  } catch {
    databaseSize = 0;
  }

  const counts = await getDb().get<{
    active_employees: number;
    active_users: number;
    payroll_periods: number;
    payslips: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM employees WHERE is_active = 1) AS active_employees,
       (SELECT COUNT(*) FROM users WHERE is_active = 1) AS active_users,
       (SELECT COUNT(*) FROM payroll_periods) AS payroll_periods,
       (SELECT COUNT(*) FROM payslips) AS payslips`,
  );

  return {
    application_version: app.getVersion(),
    electron_version: process.versions.electron || '',
    node_version: process.versions.node || '',
    database_path: databasePath,
    database_size_bytes: databaseSize,
    active_employees: Number(counts?.active_employees ?? 0),
    active_users: Number(counts?.active_users ?? 0),
    payroll_periods: Number(counts?.payroll_periods ?? 0),
    payslips: Number(counts?.payslips ?? 0),
  };
}

async function logSettingsChange(
  category: SettingsAuditLog['category'],
  actorId: string,
  actorName: string,
  changes: Record<string, unknown>,
): Promise<void> {
  if (Object.keys(changes).length === 0) return;
  await getDb().run(
    `INSERT INTO settings_audit_logs (
       id, category, actor_id, actor_name, changes_json, created_at
     ) VALUES (
       'settings_' || lower(hex(randomblob(16))), ?, ?, ?, ?, datetime('now')
     )`,
    category,
    actorId,
    actorName,
    JSON.stringify(changes),
  );
}

function safeCompanyForAudit(profile: CompanyProfile): Record<string, unknown> {
  return {
    company_name: profile.company_name,
    address: profile.address,
    contact_email: profile.contact_email,
    contact_phone: profile.contact_phone,
    tax_id: profile.tax_id,
    logo_configured: Boolean(profile.logo_data_url),
    payslip_footer: profile.payslip_footer,
  };
}

function changedFields(before: object, after: object): Record<string, unknown> {
  const previous = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(next)) {
    if (key === 'updated_at' || key === 'id') continue;
    if (JSON.stringify(previous[key]) !== JSON.stringify(next[key])) {
      changes[key] = { from: previous[key] ?? null, to: next[key] ?? null };
    }
  }
  return changes;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Settings details are required.');
  }
  return value as Record<string, unknown>;
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberInRange(value: unknown, min: number, max: number, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label} must be between ${min} and ${max}.`);
  }
  return number;
}

function integerInRange(value: unknown, min: number, max: number, label: string): number {
  const number = numberInRange(value, min, max, label);
  if (!Number.isInteger(number)) throw new Error(`${label} must be a whole number.`);
  return number;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as T;
}

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}
