import crypto, { randomUUID } from 'node:crypto';
import { clipboard } from 'electron';
import { getDb } from '../db';
import { LICENSE_PUBLIC_KEY_PEM } from '../license-public-key';
import { getDeveloperInformation, type DeveloperInformation } from '../developer-info';
import { authorizePermission, currentUser } from './auth-service';

export type LicenseEdition = 'trial' | 'full_perpetual' | 'full_subscription';
export type LicenseStatus = 'active' | 'expired' | 'invalid' | 'device_mismatch' | 'revoked';
export type LicenseSource = 'automatic_trial' | 'signed_license';

export interface SignedLicensePayload {
  version: 1;
  licenseId: string;
  customerName: string;
  edition: LicenseEdition;
  issuedAt: string;
  expiresAt: string | null;
  maxEmployees: number | null;
  installationId: string | null;
  features: string[];
  revoked?: boolean;
}

export interface SignedLicenseFile {
  version: 1;
  payload: SignedLicensePayload;
  signature: string;
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

interface LicenseStateRow {
  id: 'default';
  installation_id: string;
  source: LicenseSource;
  edition: LicenseEdition;
  license_payload_json: string | null;
  license_signature: string | null;
  trial_started_at: string;
  trial_expires_at: string;
  activated_at: string | null;
  last_verified_at: string | null;
  last_run_at: string | null;
  clock_rollback_detected: number;
  created_at: string;
  updated_at: string;
}

const TRIAL_DAYS = 30;
const TRIAL_EMPLOYEE_LIMIT = 5;
const CLOCK_ROLLBACK_TOLERANCE_MS = 5 * 60 * 1000;
const ALL_FEATURES = [
  'employees',
  'timekeeping',
  'leave',
  'earnings',
  'deductions',
  'contributions',
  'payroll',
  'reports',
  'payslips',
  'settings',
  'backup',
  'audit',
];

const WRITE_CHANNELS = new Set([
  'user.create', 'user.update', 'user.setStatus', 'user.resetPassword',
  'employee.create', 'employee.update', 'employee.setStatus', 'employee.delete',
  'attendance.create', 'attendance.update', 'attendance.delete', 'attendance.import',
  'schedule.create', 'schedule.update', 'schedule.delete', 'schedule.assign', 'schedule.unassign',
  'attendanceCorrection.create', 'attendanceCorrection.review',
  'leaveType.create', 'leaveType.update', 'leaveType.delete', 'leaveBalance.adjust',
  'leaveRequest.create', 'leaveRequest.update', 'leaveRequest.review', 'leaveRequest.cancel',
  'earningType.create', 'earningType.update', 'earningType.setStatus', 'earningType.delete',
  'earningAssignment.create', 'earningAssignment.update', 'earningAssignment.setStatus', 'earningAssignment.delete',
  'earningTransaction.create', 'earningTransaction.update', 'earningTransaction.setStatus', 'earningTransaction.delete',
  'deductionType.create', 'deductionType.update', 'deductionType.setStatus', 'deductionType.delete',
  'deductionAssignment.create', 'deductionAssignment.update', 'deductionAssignment.setStatus', 'deductionAssignment.delete',
  'loan.create', 'loan.update', 'loan.setStatus', 'loan.recordPayment', 'loan.delete',
  'deductionTransaction.create', 'deductionTransaction.update', 'deductionTransaction.setStatus', 'deductionTransaction.delete',
  'contributionType.create', 'contributionType.update', 'contributionType.setStatus', 'contributionType.delete',
  'contributionTable.create', 'contributionTable.update', 'contributionTable.setStatus', 'contributionTable.replaceBrackets', 'contributionTable.delete',
  'contributionRecord.create', 'contributionRecord.setStatus', 'contributionRecord.delete',
  'payroll.createPeriod', 'payroll.updatePeriod', 'payroll.deletePeriod', 'payroll.calculate',
  'payroll.approve', 'payroll.finalize', 'payroll.lock', 'payroll.cancel', 'payroll.run',
  'payslip.generate', 'payslip.publish', 'payslip.unpublish', 'payslip.publishPeriod', 'payslip.delete',
  'settings.updateCompany', 'settings.updatePayroll', 'settings.updateBackup',
  'companyProfile.update', 'companyProfile.chooseLogo',
  'self.profile.updateContact', 'self.attendance.createCorrection', 'self.leave.create', 'self.leave.cancel',
]);

const ALWAYS_ALLOWED_PREFIXES = ['auth.', 'license.', 'backup.', 'audit.'];

export async function initializeLicense(): Promise<LicenseOverview> {
  const db = getDb();
  const existing = await getLicenseState();
  const now = new Date();

  if (!existing) {
    const startedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + TRIAL_DAYS * 86_400_000).toISOString();
    await db.run(
      `INSERT INTO license_state (
         id, installation_id, source, edition, trial_started_at, trial_expires_at,
         last_verified_at, last_run_at, clock_rollback_detected, created_at, updated_at
       ) VALUES ('default', ?, 'automatic_trial', 'trial', ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
      createInstallationId(),
      startedAt,
      expiresAt,
      startedAt,
      startedAt,
    );
    await writeLicenseEvent('trial_started', 'success', 'Automatic 30-day trial started.');
  } else {
    const lastRun = existing.last_run_at ? new Date(existing.last_run_at).getTime() : 0;
    const rollback = lastRun > 0 && now.getTime() + CLOCK_ROLLBACK_TOLERANCE_MS < lastRun;
    await db.run(
      `UPDATE license_state
          SET last_run_at = ?,
              last_verified_at = ?,
              clock_rollback_detected = CASE WHEN ? THEN 1 ELSE clock_rollback_detected END,
              updated_at = datetime('now')
        WHERE id = 'default'`,
      now.toISOString(),
      now.toISOString(),
      rollback ? 1 : 0,
    );
    if (rollback) {
      await writeLicenseEvent('clock_rollback_detected', 'failure', 'System clock moved backwards during trial validation.');
    }
  }

  return getLicenseOverview();
}

export async function getLicenseOverview(): Promise<LicenseOverview> {
  const state = await getLicenseState();
  if (!state) return initializeLicense();

  const activeEmployees = await getActiveEmployeeCount();
  const now = Date.now();
  const developer = getDeveloperInformation();

  if (state.source === 'automatic_trial') {
    const expires = new Date(state.trial_expires_at).getTime();
    const invalidClock = Boolean(state.clock_rollback_detected);
    const status: LicenseStatus = invalidClock ? 'invalid' : now > expires ? 'expired' : 'active';
    const days = Math.max(0, Math.ceil((expires - now) / 86_400_000));
    return {
      installation_id: state.installation_id,
      source: state.source,
      edition: 'trial',
      status,
      license_id: '',
      customer_name: '',
      issued_at: state.trial_started_at,
      activated_at: '',
      expires_at: state.trial_expires_at,
      trial_started_at: state.trial_started_at,
      trial_expires_at: state.trial_expires_at,
      days_remaining: status === 'active' ? days : 0,
      max_employees: TRIAL_EMPLOYEE_LIMIT,
      active_employees: activeEmployees,
      features: [...ALL_FEATURES],
      machine_bound: true,
      read_only: status !== 'active',
      watermark: 'TRIAL VERSION',
      message: invalidClock
        ? 'Trial validation detected a system clock rollback. Activate a signed license or contact support.'
        : status === 'expired'
          ? 'The trial has expired. Existing records remain available in read-only mode.'
          : `${days} trial day${days === 1 ? '' : 's'} remaining.`,
      last_verified_at: state.last_verified_at || '',
      developer,
    };
  }

  const verified = verifyStoredSignedLicense(state);
  const payload = verified.payload;
  const machineMismatch = Boolean(payload?.installationId && payload.installationId !== state.installation_id);
  const revoked = Boolean(payload?.revoked);
  const expiry = payload?.expiresAt ? new Date(payload.expiresAt).getTime() : null;
  const expired = expiry !== null && now > expiry;
  const status: LicenseStatus = !verified.valid
    ? 'invalid'
    : machineMismatch
      ? 'device_mismatch'
      : revoked
        ? 'revoked'
        : expired
          ? 'expired'
          : 'active';
  const daysRemaining = expiry === null ? null : Math.max(0, Math.ceil((expiry - now) / 86_400_000));

  return {
    installation_id: state.installation_id,
    source: state.source,
    edition: payload?.edition || state.edition,
    status,
    license_id: payload?.licenseId || '',
    customer_name: payload?.customerName || '',
    issued_at: payload?.issuedAt || '',
    activated_at: state.activated_at || '',
    expires_at: payload?.expiresAt || '',
    trial_started_at: state.trial_started_at,
    trial_expires_at: state.trial_expires_at,
    days_remaining: daysRemaining,
    max_employees: payload?.maxEmployees ?? null,
    active_employees: activeEmployees,
    features: payload?.features?.length ? payload.features : [...ALL_FEATURES],
    machine_bound: Boolean(payload?.installationId),
    read_only: status !== 'active',
    watermark: payload?.edition === 'trial' ? 'TRIAL VERSION' : '',
    message: statusMessage(status, payload?.edition || state.edition, daysRemaining),
    last_verified_at: state.last_verified_at || '',
    developer,
  };
}

export async function activateSignedLicense(content: unknown): Promise<LicenseOverview> {
  await authorizePermission('settings:manage');
  const file = parseLicenseFile(content);
  const verification = verifySignedLicenseFile(file);
  if (!verification.valid) {
    await writeLicenseEvent('activation_failed', 'failure', verification.message);
    throw new Error(verification.message);
  }

  const current = await getLicenseState();
  if (!current) throw new Error('License state has not been initialized.');
  if (file.payload.installationId && file.payload.installationId !== current.installation_id) {
    await writeLicenseEvent('activation_failed', 'failure', 'License installation ID does not match this computer.');
    throw new Error('This license is assigned to a different installation ID.');
  }
  if (file.payload.expiresAt && new Date(file.payload.expiresAt).getTime() <= Date.now()) {
    throw new Error('This license has already expired.');
  }

  await getDb().run(
    `UPDATE license_state
        SET source = 'signed_license', edition = ?, license_payload_json = ?,
            license_signature = ?, activated_at = ?, last_verified_at = ?,
            last_run_at = ?, clock_rollback_detected = 0, updated_at = datetime('now')
      WHERE id = 'default'`,
    file.payload.edition,
    JSON.stringify(file.payload),
    file.signature,
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString(),
  );
  await writeLicenseEvent('license_activated', 'success', `${file.payload.edition} license ${file.payload.licenseId} activated.`);
  return getLicenseOverview();
}

export async function removeSignedLicense(): Promise<LicenseOverview> {
  await authorizePermission('settings:manage');
  const state = await getLicenseState();
  if (!state) throw new Error('License state has not been initialized.');
  await getDb().run(
    `UPDATE license_state
        SET source = 'automatic_trial', edition = 'trial', license_payload_json = NULL,
            license_signature = NULL, activated_at = NULL, last_verified_at = ?,
            last_run_at = ?, updated_at = datetime('now')
      WHERE id = 'default'`,
    new Date().toISOString(),
    new Date().toISOString(),
  );
  await writeLicenseEvent('license_removed', 'success', 'Signed license removed; local trial state restored.');
  return getLicenseOverview();
}

export async function getLicenseEvents(limitValue: unknown = 50): Promise<Array<{
  id: string;
  action: string;
  outcome: string;
  details: string;
  created_at: string;
}>> {
  await authorizePermission('settings:manage');
  const limit = Math.max(1, Math.min(200, Number(limitValue) || 50));
  return getDb().all(
    `SELECT id, action, outcome, COALESCE(details, '') AS details, created_at
       FROM license_events
      ORDER BY created_at DESC
      LIMIT ?`,
    limit,
  );
}

export async function copyInstallationId(): Promise<{ copied: true; installation_id: string }> {
  const overview = await getLicenseOverview();
  clipboard.writeText(overview.installation_id);
  return { copied: true, installation_id: overview.installation_id };
}

export async function exportLicenseDiagnostics(): Promise<string> {
  await authorizePermission('settings:manage');
  const overview = await getLicenseOverview();
  const events = await getLicenseEvents(25);
  return JSON.stringify({
    generated_at: new Date().toISOString(),
    license: overview,
    events,
  }, null, 2);
}

export async function assertLicenseForChannel(channel: string): Promise<void> {
  if (ALWAYS_ALLOWED_PREFIXES.some((prefix) => channel.startsWith(prefix))) return;
  const overview = await getLicenseOverview();
  const feature = featureForChannel(channel);

  if (feature && !overview.features.includes(feature)) {
    throw new Error(`The current license does not include the ${feature} module.`);
  }

  if (overview.read_only && WRITE_CHANNELS.has(channel)) {
    throw new Error('The license is not active. The application is currently in read-only mode. Open Settings → License to activate a valid license.');
  }

  if (channel === 'employee.create' && overview.max_employees !== null) {
    if (overview.active_employees >= overview.max_employees) {
      throw new Error(`The ${overview.edition === 'trial' ? 'trial' : 'license'} employee limit of ${overview.max_employees} has been reached.`);
    }
  }
}

export async function getPayslipLicenseStamp(): Promise<{
  edition: LicenseEdition;
  status: LicenseStatus;
  watermark: string;
}> {
  const overview = await getLicenseOverview();
  return { edition: overview.edition, status: overview.status, watermark: overview.watermark };
}

function parseLicenseFile(content: unknown): SignedLicenseFile {
  let parsed: unknown = content;
  if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('The selected license file is not valid JSON.');
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('The license file format is invalid.');
  }
  const record = parsed as Record<string, unknown>;
  const payload = record.payload as SignedLicensePayload;
  const signature = typeof record.signature === 'string' ? record.signature.trim() : '';
  if (record.version !== 1 || !payload || payload.version !== 1 || !signature) {
    throw new Error('The license file is incomplete or uses an unsupported version.');
  }
  if (!['trial', 'full_perpetual', 'full_subscription'].includes(payload.edition)) {
    throw new Error('The license edition is not supported.');
  }
  if (!payload.licenseId || !payload.customerName || !payload.issuedAt || !Array.isArray(payload.features)) {
    throw new Error('The license payload is missing required fields.');
  }
  return { version: 1, payload, signature };
}

function verifySignedLicenseFile(file: SignedLicenseFile): { valid: boolean; message: string } {
  try {
    const valid = crypto.verify(
      null,
      Buffer.from(stableStringify(file.payload), 'utf8'),
      LICENSE_PUBLIC_KEY_PEM,
      Buffer.from(file.signature, 'base64'),
    );
    return {
      valid,
      message: valid ? 'License signature is valid.' : 'The license signature is invalid.',
    };
  } catch (error) {
    return {
      valid: false,
      message: error instanceof Error ? `Unable to verify license: ${error.message}` : 'Unable to verify license.',
    };
  }
}

function verifyStoredSignedLicense(state: LicenseStateRow): {
  valid: boolean;
  payload: SignedLicensePayload | null;
} {
  if (!state.license_payload_json || !state.license_signature) return { valid: false, payload: null };
  try {
    const payload = JSON.parse(state.license_payload_json) as SignedLicensePayload;
    const valid = verifySignedLicenseFile({ version: 1, payload, signature: state.license_signature }).valid;
    return { valid, payload };
  } catch {
    return { valid: false, payload: null };
  }
}

async function getLicenseState(): Promise<LicenseStateRow | undefined> {
  return getDb().get<LicenseStateRow>(
    `SELECT id, installation_id, source, edition, license_payload_json,
            license_signature, trial_started_at, trial_expires_at,
            activated_at, last_verified_at, last_run_at,
            clock_rollback_detected, created_at, updated_at
       FROM license_state
      WHERE id = 'default'`,
  );
}

async function getActiveEmployeeCount(): Promise<number> {
  const row = await getDb().get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM employees WHERE is_active = 1',
  );
  return Number(row?.count ?? 0);
}

async function writeLicenseEvent(action: string, outcome: 'success' | 'failure' | 'info', details: string): Promise<void> {
  const actor = await currentUser().catch(() => null);
  await getDb().run(
    `INSERT INTO license_events (
       id, action, outcome, details, actor_id, actor_name, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    `license_event_${randomUUID()}`,
    action,
    outcome,
    details,
    actor?.id || null,
    actor?.display_name || 'System',
  );
}

function createInstallationId(): string {
  const value = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `OFFPAY-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}`;
}

function statusMessage(status: LicenseStatus, edition: LicenseEdition, days: number | null): string {
  if (status === 'invalid') return 'The license signature is invalid. The application is in read-only mode.';
  if (status === 'device_mismatch') return 'This license belongs to a different installation ID.';
  if (status === 'revoked') return 'This license has been revoked.';
  if (status === 'expired') return 'The license has expired. The application is in read-only mode.';
  if (edition === 'full_perpetual') return 'Full perpetual license is active.';
  if (edition === 'full_subscription') return `${days ?? 0} subscription day${days === 1 ? '' : 's'} remaining.`;
  return `${days ?? 0} trial day${days === 1 ? '' : 's'} remaining.`;
}

function featureForChannel(channel: string): string | null {
  if (channel.startsWith('employee.')) return 'employees';
  if (channel.startsWith('attendance.') || channel.startsWith('schedule.') || channel.startsWith('attendanceCorrection.')) return 'timekeeping';
  if (channel.startsWith('leave')) return 'leave';
  if (channel.startsWith('earning')) return 'earnings';
  if (channel.startsWith('deduction') || channel.startsWith('loan.')) return 'deductions';
  if (channel.startsWith('contribution')) return 'contributions';
  if (channel.startsWith('payroll.')) return 'payroll';
  if (channel.startsWith('report.')) return 'reports';
  if (channel.startsWith('payslip.') || channel.startsWith('companyProfile.')) return 'payslips';
  if (channel.startsWith('settings.')) return 'settings';
  if (channel.startsWith('backup.')) return 'backup';
  if (channel.startsWith('audit.')) return 'audit';
  return null;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`;
}
