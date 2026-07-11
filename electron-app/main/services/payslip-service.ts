import { randomUUID } from 'node:crypto';
import { getDb } from '../db';
import { getPayslipLicenseStamp, type LicenseEdition, type LicenseStatus } from './license-service';

type UnknownRecord = Record<string, unknown>;

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
  item_type: 'earning' | 'deduction' | 'contribution' | 'employer-contribution' | 'information';
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
    edition: LicenseEdition;
    status: LicenseStatus;
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

export interface PayslipRecord {
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

interface PayslipFilters {
  period_id: string;
  employee_id: string;
  status: '' | PayslipStatus;
  query: string;
  published_only: boolean;
}

interface PayrollResultRow {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
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
  attendance_days: number;
  paid_days: number;
  absent_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  regular_hours: number;
  overtime_hours: number;
  late_minutes: number;
  undertime_minutes: number;
}

const payslipSelect = `
  SELECT payslips.id,
         payslips.payroll_period_id,
         payslips.payroll_result_id,
         payslips.employee_id,
         payslips.reference_number,
         payslips.status,
         COALESCE(payslips.generated_by, '') AS generated_by,
         payslips.generated_at,
         COALESCE(payslips.published_by, '') AS published_by,
         COALESCE(payslips.published_at, '') AS published_at,
         payslips.created_at,
         payslips.updated_at,
         payroll_periods.name AS period_name,
         payroll_periods.start_date,
         payroll_periods.end_date,
         COALESCE(payroll_periods.payment_date, payroll_periods.end_date) AS payment_date,
         COALESCE(payroll_periods.workflow_status, 'draft') AS workflow_status,
         payroll_employee_results.employee_number,
         payroll_employee_results.employee_name,
         COALESCE(payroll_employee_results.department, '') AS department,
         COALESCE(payroll_employee_results.role_title, '') AS role_title,
         payroll_employee_results.gross_income,
         payroll_employee_results.total_deductions,
         payroll_employee_results.net_pay,
         (SELECT COUNT(*) FROM payslip_download_logs WHERE payslip_download_logs.payslip_id = payslips.id) AS download_count,
         COALESCE((SELECT MAX(downloaded_at) FROM payslip_download_logs WHERE payslip_download_logs.payslip_id = payslips.id), '') AS last_downloaded_at,
         payslips.snapshot_json
    FROM payslips
    INNER JOIN payroll_periods ON payroll_periods.id = payslips.payroll_period_id
    INNER JOIN payroll_employee_results ON payroll_employee_results.id = payslips.payroll_result_id
`;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function requiredString(value: unknown, label: string): string {
  const text = optionalString(value);
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function optionalBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFilters(filters: unknown): PayslipFilters {
  const value = asRecord(filters);
  const rawStatus = optionalString(value.status);
  if (rawStatus && rawStatus !== 'all' && rawStatus !== 'draft' && rawStatus !== 'published') {
    throw new Error('Invalid payslip status filter.');
  }
  return {
    period_id: optionalString(value.period_id),
    employee_id: optionalString(value.employee_id),
    status: rawStatus === 'all' ? '' : rawStatus as '' | PayslipStatus,
    query: optionalString(value.query),
    published_only: optionalBoolean(value.published_only),
  };
}

function safeJsonParse(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function safeSnapshot(value: string): PayslipSnapshot {
  try {
    return JSON.parse(value) as PayslipSnapshot;
  } catch {
    throw new Error('The payslip snapshot is invalid or corrupted.');
  }
}

function normalizeMoney(value: unknown): number {
  return Math.round((numberValue(value) + Number.EPSILON) * 100) / 100;
}

function sanitizeReferenceSegment(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 18) || 'EMP';
}

function makeReference(paymentDate: string, employeeNumber: string): string {
  const date = paymentDate.replace(/-/g, '');
  const employee = sanitizeReferenceSegment(employeeNumber);
  return `PS-${date}-${employee}-${randomUUID().slice(0, 6).toUpperCase()}`;
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const profile = await getDb().get<CompanyProfile>(
    `SELECT id,
            company_name,
            COALESCE(address, '') AS address,
            COALESCE(contact_email, '') AS contact_email,
            COALESCE(contact_phone, '') AS contact_phone,
            COALESCE(tax_id, '') AS tax_id,
            COALESCE(logo_data_url, '') AS logo_data_url,
            COALESCE(payslip_footer, '') AS payslip_footer,
            updated_at
       FROM company_profiles
      WHERE id = 'default'`,
  );
  if (!profile) throw new Error('Company profile has not been initialized.');
  return profile;
}

export async function updateCompanyProfile(payload: unknown): Promise<CompanyProfile> {
  const value = asRecord(payload);
  const companyName = requiredString(value.company_name, 'Company name');
  if (companyName.length > 160) throw new Error('Company name is too long.');
  const logoDataUrl = optionalString(value.logo_data_url);
  if (logoDataUrl && !/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(logoDataUrl)) {
    throw new Error('Company logo must be a PNG, JPEG, or WebP image.');
  }
  if (logoDataUrl.length > 4_000_000) {
    throw new Error('Company logo is too large. Use an image smaller than 3 MB.');
  }

  await getDb().run(
    `UPDATE company_profiles
        SET company_name = ?, address = ?, contact_email = ?, contact_phone = ?,
            tax_id = ?, logo_data_url = ?, payslip_footer = ?, updated_at = datetime('now')
      WHERE id = 'default'`,
    companyName,
    optionalString(value.address),
    optionalString(value.contact_email),
    optionalString(value.contact_phone),
    optionalString(value.tax_id),
    logoDataUrl,
    optionalString(value.payslip_footer),
  );
  return getCompanyProfile();
}

export async function getPayslipOptions(): Promise<{
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
}> {
  const periods = await getDb().all<Array<{
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    payment_date: string;
    workflow_status: string;
    result_count: number;
    payslip_count: number;
    published_count: number;
  }>>(
    `SELECT payroll_periods.id,
            payroll_periods.name,
            payroll_periods.start_date,
            payroll_periods.end_date,
            COALESCE(payroll_periods.payment_date, payroll_periods.end_date) AS payment_date,
            COALESCE(payroll_periods.workflow_status, 'draft') AS workflow_status,
            (SELECT COUNT(*) FROM payroll_employee_results WHERE payroll_employee_results.payroll_period_id = payroll_periods.id) AS result_count,
            (SELECT COUNT(*) FROM payslips WHERE payslips.payroll_period_id = payroll_periods.id) AS payslip_count,
            (SELECT COUNT(*) FROM payslips WHERE payslips.payroll_period_id = payroll_periods.id AND payslips.status = 'published') AS published_count
       FROM payroll_periods
      WHERE COALESCE(payroll_periods.workflow_status, 'draft') IN ('finalized', 'locked')
        AND EXISTS (SELECT 1 FROM payroll_employee_results WHERE payroll_employee_results.payroll_period_id = payroll_periods.id)
      ORDER BY COALESCE(payroll_periods.payment_date, payroll_periods.end_date) DESC`,
  );

  const employees = await getDb().all<Array<{
    id: string;
    employee_number: string;
    name: string;
    department: string;
  }>>(
    `SELECT employees.id,
            COALESCE(NULLIF(employees.employee_number, ''), employees.id) AS employee_number,
            employees.name,
            COALESCE(employees.department, '') AS department
       FROM employees
      ORDER BY employees.name COLLATE NOCASE`,
  );

  return { periods, employees };
}

export async function getPayslips(filters?: unknown): Promise<{
  data: PayslipRecord[];
  total: number;
}> {
  const parsed = parseFilters(filters);
  const clauses: string[] = ['1 = 1'];
  const params: unknown[] = [];

  if (parsed.period_id) {
    clauses.push('payslips.payroll_period_id = ?');
    params.push(parsed.period_id);
  }
  if (parsed.employee_id) {
    clauses.push('payslips.employee_id = ?');
    params.push(parsed.employee_id);
  }
  if (parsed.published_only) {
    clauses.push("payslips.status = 'published'");
  } else if (parsed.status) {
    clauses.push('payslips.status = ?');
    params.push(parsed.status);
  }
  if (parsed.query) {
    const search = `%${parsed.query}%`;
    clauses.push(`(
      payslips.reference_number LIKE ?
      OR payroll_employee_results.employee_name LIKE ?
      OR payroll_employee_results.employee_number LIKE ?
      OR payroll_periods.name LIKE ?
    )`);
    params.push(search, search, search, search);
  }

  const data = await getDb().all<PayslipRecord[]>(
    `${payslipSelect}
      WHERE ${clauses.join(' AND ')}
      ORDER BY COALESCE(payroll_periods.payment_date, payroll_periods.end_date) DESC,
               payroll_employee_results.employee_name COLLATE NOCASE`,
    ...params,
  );
  return { data, total: data.length };
}

export async function getPayslipSummary(filters?: unknown): Promise<{
  total: number;
  draft: number;
  published: number;
  downloaded: number;
  gross_income: number;
  total_deductions: number;
  net_pay: number;
}> {
  const parsed = parseFilters(filters);
  const clauses: string[] = ['1 = 1'];
  const params: unknown[] = [];
  if (parsed.period_id) {
    clauses.push('payslips.payroll_period_id = ?');
    params.push(parsed.period_id);
  }
  if (parsed.employee_id) {
    clauses.push('payslips.employee_id = ?');
    params.push(parsed.employee_id);
  }
  if (parsed.status) {
    clauses.push('payslips.status = ?');
    params.push(parsed.status);
  }
  const row = await getDb().get<{
    total: number;
    draft: number;
    published: number;
    downloaded: number;
    gross_income: number;
    total_deductions: number;
    net_pay: number;
  }>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN payslips.status = 'draft' THEN 1 ELSE 0 END) AS draft,
            SUM(CASE WHEN payslips.status = 'published' THEN 1 ELSE 0 END) AS published,
            SUM(CASE WHEN EXISTS (SELECT 1 FROM payslip_download_logs WHERE payslip_download_logs.payslip_id = payslips.id) THEN 1 ELSE 0 END) AS downloaded,
            COALESCE(SUM(payroll_employee_results.gross_income), 0) AS gross_income,
            COALESCE(SUM(payroll_employee_results.total_deductions), 0) AS total_deductions,
            COALESCE(SUM(payroll_employee_results.net_pay), 0) AS net_pay
       FROM payslips
       INNER JOIN payroll_employee_results ON payroll_employee_results.id = payslips.payroll_result_id
      WHERE ${clauses.join(' AND ')}`,
    ...params,
  );
  return {
    total: numberValue(row?.total),
    draft: numberValue(row?.draft),
    published: numberValue(row?.published),
    downloaded: numberValue(row?.downloaded),
    gross_income: normalizeMoney(row?.gross_income),
    total_deductions: normalizeMoney(row?.total_deductions),
    net_pay: normalizeMoney(row?.net_pay),
  };
}

export async function getPayslip(id: string): Promise<PayslipRecord | null> {
  const record = await getDb().get<PayslipRecord & { snapshot_json: string }>(
    `${payslipSelect}
      WHERE payslips.id = ?`,
    id,
  );
  if (!record) return null;
  const [actions, downloads] = await Promise.all([
    getDb().all<PayslipActionLog[]>(
      `SELECT id, payslip_id, action, COALESCE(actor, '') AS actor,
              COALESCE(notes, '') AS notes, created_at
         FROM payslip_action_logs
        WHERE payslip_id = ?
        ORDER BY created_at DESC`,
      id,
    ),
    getDb().all<PayslipDownloadLog[]>(
      `SELECT id, payslip_id, employee_id,
              COALESCE(downloaded_by, '') AS downloaded_by,
              COALESCE(file_path, '') AS file_path,
              downloaded_at
         FROM payslip_download_logs
        WHERE payslip_id = ?
        ORDER BY downloaded_at DESC`,
      id,
    ),
  ]);
  const { snapshot_json: snapshotJson, ...base } = record;
  return { ...base, snapshot: safeSnapshot(snapshotJson), actions, downloads };
}

export async function getEmployeePublishedPayslip(
  id: string,
  employeeId: string,
): Promise<PayslipRecord | null> {
  const record = await getPayslip(id);
  if (!record || record.status !== 'published' || record.employee_id !== employeeId) {
    return null;
  }
  return record;
}

export async function generatePayslips(payload: unknown): Promise<{
  created: number;
  updated: number;
  skipped: number;
  total: number;
  data: PayslipRecord[];
}> {
  const value = asRecord(payload);
  const periodId = requiredString(value.period_id, 'Payroll period');
  const actor = optionalString(value.actor) || 'Payroll Administrator';
  const force = optionalBoolean(value.force);

  const period = await getDb().get<{
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    payment_date: string;
    frequency: string;
    workflow_status: string;
  }>(
    `SELECT id, name, start_date, end_date,
            COALESCE(payment_date, end_date) AS payment_date,
            frequency, COALESCE(workflow_status, 'draft') AS workflow_status
       FROM payroll_periods
      WHERE id = ?`,
    periodId,
  );
  if (!period) throw new Error('Payroll period was not found.');
  if (period.workflow_status !== 'finalized' && period.workflow_status !== 'locked') {
    throw new Error('Payslips can only be generated from finalized or locked payroll periods.');
  }

  const results = await getDb().all<PayrollResultRow[]>(
    `SELECT id, payroll_period_id, employee_id, employee_number, employee_name,
            COALESCE(department, '') AS department,
            COALESCE(role_title, '') AS role_title,
            basic_salary, period_basic_pay, overtime_pay, night_differential_pay,
            other_earnings, gross_income, attendance_deductions, other_deductions,
            government_deductions, employer_contributions, total_deductions,
            net_pay, taxable_income, contribution_basis, attendance_days, paid_days,
            absent_days, paid_leave_days, unpaid_leave_days, regular_hours,
            overtime_hours, late_minutes, undertime_minutes
       FROM payroll_employee_results
      WHERE payroll_period_id = ?
      ORDER BY employee_name COLLATE NOCASE`,
    periodId,
  );
  if (results.length === 0) throw new Error('The payroll period has no employee results.');

  const company = await getCompanyProfile();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  await getDb().exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    for (const result of results) {
      const existing = await getDb().get<{ id: string; status: PayslipStatus; reference_number: string }>(
        `SELECT id, status, reference_number
           FROM payslips
          WHERE payroll_period_id = ? AND employee_id = ?`,
        periodId,
        result.employee_id,
      );
      if (existing?.status === 'published' && !force) {
        skipped += 1;
        continue;
      }

      const snapshot = await buildSnapshot(company, period, result);
      const now = new Date().toISOString();
      if (existing) {
        await getDb().run(
          `UPDATE payslips
              SET payroll_result_id = ?, snapshot_json = ?, generated_by = ?,
                  generated_at = ?, updated_at = datetime('now')
            WHERE id = ?`,
          result.id,
          JSON.stringify(snapshot),
          actor,
          now,
          existing.id,
        );
        await logAction(existing.id, force && existing.status === 'published' ? 'regenerated-published' : 'regenerated', actor, period.name);
        updated += 1;
      } else {
        const id = `payslip_${randomUUID()}`;
        const reference = makeReference(period.payment_date, result.employee_number);
        await getDb().run(
          `INSERT INTO payslips (
             id, payroll_period_id, payroll_result_id, employee_id,
             reference_number, status, snapshot_json, generated_by,
             generated_at, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, datetime('now'), datetime('now'))`,
          id,
          periodId,
          result.id,
          result.employee_id,
          reference,
          JSON.stringify(snapshot),
          actor,
          now,
        );
        await logAction(id, 'generated', actor, period.name);
        created += 1;
      }
    }
    await getDb().exec('COMMIT;');
  } catch (error) {
    await getDb().exec('ROLLBACK;');
    throw error;
  }

  const list = await getPayslips({ period_id: periodId });
  return { created, updated, skipped, total: list.total, data: list.data };
}

export async function setPayslipPublished(
  id: string,
  published: boolean,
  actor = 'Payroll Administrator',
): Promise<PayslipRecord> {
  const existing = await getPayslip(id);
  if (!existing) throw new Error('Payslip was not found.');
  const status: PayslipStatus = published ? 'published' : 'draft';
  await getDb().run(
    `UPDATE payslips
        SET status = ?, published_by = ?, published_at = ?, updated_at = datetime('now')
      WHERE id = ?`,
    status,
    published ? actor : '',
    published ? new Date().toISOString() : null,
    id,
  );
  await logAction(id, published ? 'published' : 'unpublished', actor, existing.reference_number);
  const updated = await getPayslip(id);
  if (!updated) throw new Error('Unable to reload the payslip.');
  return updated;
}

export async function publishPeriodPayslips(
  periodId: string,
  actor = 'Payroll Administrator',
): Promise<{ updated: number; data: PayslipRecord[] }> {
  const rows = await getDb().all<Array<{ id: string }>>(
    `SELECT id FROM payslips WHERE payroll_period_id = ? AND status = 'draft'`,
    periodId,
  );
  await getDb().exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    for (const row of rows) {
      await getDb().run(
        `UPDATE payslips
            SET status = 'published', published_by = ?, published_at = ?, updated_at = datetime('now')
          WHERE id = ?`,
        actor,
        new Date().toISOString(),
        row.id,
      );
      await logAction(row.id, 'published', actor, 'Bulk publication');
    }
    await getDb().exec('COMMIT;');
  } catch (error) {
    await getDb().exec('ROLLBACK;');
    throw error;
  }
  const list = await getPayslips({ period_id: periodId });
  return { updated: rows.length, data: list.data };
}

export async function deletePayslip(id: string): Promise<{ id: string }> {
  const existing = await getPayslip(id);
  if (!existing) throw new Error('Payslip was not found.');
  if (existing.status === 'published') {
    throw new Error('Published payslips must be unpublished before deletion.');
  }
  await getDb().run('DELETE FROM payslips WHERE id = ?', id);
  return { id };
}

export async function recordPayslipDownload(
  id: string,
  downloadedBy: string,
  filePath: string,
): Promise<void> {
  const existing = await getDb().get<{ employee_id: string }>(
    'SELECT employee_id FROM payslips WHERE id = ?',
    id,
  );
  if (!existing) throw new Error('Payslip was not found.');
  await getDb().run(
    `INSERT INTO payslip_download_logs (
       id, payslip_id, employee_id, downloaded_by, file_path, downloaded_at
     ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    `payslip_download_${randomUUID()}`,
    id,
    existing.employee_id,
    downloadedBy,
    filePath,
  );
  await logAction(id, 'downloaded', downloadedBy, filePath);
}

async function buildSnapshot(
  company: CompanyProfile,
  period: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    payment_date: string;
    frequency: string;
    workflow_status: string;
  },
  result: PayrollResultRow,
): Promise<PayslipSnapshot> {
  const employee = await getDb().get<{
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
  }>(
    `SELECT id,
            COALESCE(NULLIF(employee_number, ''), id) AS employee_number,
            name,
            COALESCE(department, '') AS department,
            COALESCE(role_title, '') AS role_title,
            COALESCE(bank_name, '') AS bank_name,
            COALESCE(bank_account, '') AS bank_account,
            COALESCE(sss_number, '') AS sss_number,
            COALESCE(philhealth_number, '') AS philhealth_number,
            COALESCE(pagibig_number, '') AS pagibig_number,
            COALESCE(tin_number, '') AS tin_number
       FROM employees
      WHERE id = ?`,
    result.employee_id,
  );
  if (!employee) throw new Error(`Employee ${result.employee_name} was not found.`);

  const rawLines = await getDb().all<Array<{
    id: string;
    item_type: PayslipLineItem['item_type'];
    source_type: string;
    source_id: string | null;
    code: string | null;
    name: string;
    amount: number;
    employer_amount: number;
    metadata_json: string | null;
    sort_order: number;
  }>>(
    `SELECT id, item_type, source_type, source_id, code, name, amount,
            employer_amount, metadata_json, sort_order
       FROM payroll_line_items
      WHERE payroll_result_id = ?
      ORDER BY sort_order, name`,
    result.id,
  );
  const lines: PayslipLineItem[] = rawLines.map((line) => ({
    id: line.id,
    item_type: line.item_type,
    source_type: line.source_type,
    source_id: line.source_id || '',
    code: line.code || '',
    name: line.name,
    amount: normalizeMoney(line.amount),
    employer_amount: normalizeMoney(line.employer_amount),
    metadata: safeJsonParse(line.metadata_json || '{}'),
    sort_order: numberValue(line.sort_order),
  }));

  const loanIds = [...new Set(lines
    .filter((line) => line.source_type === 'loan-installment' && line.source_id)
    .map((line) => line.source_id))];
  const loanBalances = loanIds.length === 0
    ? []
    : await getDb().all<Array<{
      loan_id: string;
      loan_number: string;
      deduction_name: string;
      outstanding_balance: number;
    }>>(
      `SELECT employee_loans.id AS loan_id,
              employee_loans.loan_number,
              deduction_types.name AS deduction_name,
              employee_loans.outstanding_balance
         FROM employee_loans
         INNER JOIN deduction_types ON deduction_types.id = employee_loans.deduction_type_id
        WHERE employee_loans.id IN (${loanIds.map(() => '?').join(', ')})
        ORDER BY employee_loans.loan_number`,
      ...loanIds,
    );

  return {
    license: await getPayslipLicenseStamp(),
    company,
    period,
    employee,
    totals: {
      basic_salary: normalizeMoney(result.basic_salary),
      period_basic_pay: normalizeMoney(result.period_basic_pay),
      overtime_pay: normalizeMoney(result.overtime_pay),
      night_differential_pay: normalizeMoney(result.night_differential_pay),
      other_earnings: normalizeMoney(result.other_earnings),
      gross_income: normalizeMoney(result.gross_income),
      attendance_deductions: normalizeMoney(result.attendance_deductions),
      other_deductions: normalizeMoney(result.other_deductions),
      government_deductions: normalizeMoney(result.government_deductions),
      employer_contributions: normalizeMoney(result.employer_contributions),
      total_deductions: normalizeMoney(result.total_deductions),
      net_pay: normalizeMoney(result.net_pay),
      taxable_income: normalizeMoney(result.taxable_income),
      contribution_basis: normalizeMoney(result.contribution_basis),
    },
    attendance: {
      attendance_days: numberValue(result.attendance_days),
      paid_days: numberValue(result.paid_days),
      absent_days: numberValue(result.absent_days),
      paid_leave_days: numberValue(result.paid_leave_days),
      unpaid_leave_days: numberValue(result.unpaid_leave_days),
      regular_hours: numberValue(result.regular_hours),
      overtime_hours: numberValue(result.overtime_hours),
      late_minutes: numberValue(result.late_minutes),
      undertime_minutes: numberValue(result.undertime_minutes),
    },
    earnings: lines.filter((line) => line.item_type === 'earning'),
    deductions: lines.filter((line) => line.item_type === 'deduction'),
    contributions: lines.filter((line) => line.item_type === 'contribution'),
    employer_contributions: lines.filter((line) => line.item_type === 'employer-contribution'),
    information: lines.filter((line) => line.item_type === 'information'),
    loan_balances: loanBalances.map((loan) => ({
      ...loan,
      outstanding_balance: normalizeMoney(loan.outstanding_balance),
    })),
    generated_at: new Date().toISOString(),
  };
}

async function logAction(
  payslipId: string,
  action: string,
  actor: string,
  notes: string,
): Promise<void> {
  await getDb().run(
    `INSERT INTO payslip_action_logs (
       id, payslip_id, action, actor, notes, created_at
     ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    `payslip_action_${randomUUID()}`,
    payslipId,
    action,
    actor,
    notes,
  );
}
