import { randomUUID } from 'node:crypto';
import { getDb } from '../db';
import { authorizePermission, currentUser } from './auth-service';

export type AuditOutcome = 'success' | 'failure' | 'info';
export type AuditSource =
  | 'application'
  | 'authentication'
  | 'settings'
  | 'backup'
  | 'payroll'
  | 'payslip'
  | 'download'
  | 'license';

export interface AuditLogEntry {
  id: string;
  source: AuditSource;
  module: string;
  action: string;
  outcome: AuditOutcome;
  user_id: string | null;
  username: string | null;
  display_name: string | null;
  role: string | null;
  entity_type: string | null;
  entity_id: string | null;
  channel: string | null;
  summary: string;
  metadata_json: string;
  origin: string | null;
  created_at: string;
}

export interface AuditFilters {
  search?: string;
  source?: AuditSource | 'all';
  module?: string | 'all';
  outcome?: AuditOutcome | 'all';
  user_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
}

export interface AuditSummary {
  total: number;
  last_24_hours: number;
  failures_last_7_days: number;
  active_actors_last_30_days: number;
  source_counts: Array<{ source: string; count: number }>;
  module_counts: Array<{ module: string; count: number }>;
}

export interface AuditListResult {
  data: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  summary: AuditSummary;
  options: {
    sources: string[];
    modules: string[];
    outcomes: AuditOutcome[];
  };
}

const AUDIT_UNION = `
  SELECT
    'application:' || application_audit_logs.id AS id,
    'application' AS source,
    application_audit_logs.module AS module,
    application_audit_logs.action AS action,
    application_audit_logs.outcome AS outcome,
    application_audit_logs.user_id AS user_id,
    application_audit_logs.username AS username,
    application_audit_logs.display_name AS display_name,
    application_audit_logs.role AS role,
    application_audit_logs.entity_type AS entity_type,
    application_audit_logs.entity_id AS entity_id,
    application_audit_logs.channel AS channel,
    application_audit_logs.summary AS summary,
    application_audit_logs.metadata_json AS metadata_json,
    application_audit_logs.origin AS origin,
    application_audit_logs.created_at AS created_at
  FROM application_audit_logs

  UNION ALL

  SELECT
    'authentication:' || auth_audit_logs.id,
    'authentication',
    'authentication',
    auth_audit_logs.action,
    CASE
      WHEN auth_audit_logs.action LIKE '%failed%'
        OR auth_audit_logs.action LIKE '%blocked%'
        OR auth_audit_logs.action LIKE '%locked%'
      THEN 'failure'
      ELSE 'success'
    END,
    auth_audit_logs.user_id,
    auth_audit_logs.username,
    users.display_name,
    users.role,
    'user',
    auth_audit_logs.user_id,
    NULL,
    COALESCE(NULLIF(auth_audit_logs.details, ''), auth_audit_logs.action),
    '{}',
    NULL,
    auth_audit_logs.created_at
  FROM auth_audit_logs
  LEFT JOIN users ON users.id = auth_audit_logs.user_id

  UNION ALL

  SELECT
    'settings:' || settings_audit_logs.id,
    'settings',
    'settings',
    'update_' || settings_audit_logs.category,
    'success',
    settings_audit_logs.actor_id,
    users.username,
    COALESCE(settings_audit_logs.actor_name, users.display_name),
    users.role,
    'settings',
    settings_audit_logs.category,
    NULL,
    upper(substr(settings_audit_logs.category, 1, 1)) || substr(settings_audit_logs.category, 2) || ' settings updated.',
    settings_audit_logs.changes_json,
    NULL,
    settings_audit_logs.created_at
  FROM settings_audit_logs
  LEFT JOIN users ON users.id = settings_audit_logs.actor_id

  UNION ALL

  SELECT
    'backup:' || backup_audit_logs.id,
    'backup',
    'backup',
    backup_audit_logs.action,
    CASE WHEN backup_audit_logs.status = 'completed' THEN 'success' ELSE 'failure' END,
    backup_audit_logs.actor_id,
    users.username,
    COALESCE(backup_audit_logs.actor_name, users.display_name),
    users.role,
    'backup_file',
    NULLIF(backup_audit_logs.target_path, ''),
    NULL,
    COALESCE(NULLIF(backup_audit_logs.message, ''), backup_audit_logs.action),
    '{}',
    NULL,
    backup_audit_logs.created_at
  FROM backup_audit_logs
  LEFT JOIN users ON users.id = backup_audit_logs.actor_id

  UNION ALL

  SELECT
    'license:' || license_events.id,
    'license',
    'license',
    license_events.action,
    license_events.outcome,
    license_events.actor_id,
    users.username,
    COALESCE(license_events.actor_name, users.display_name),
    users.role,
    'license',
    NULL,
    NULL,
    COALESCE(NULLIF(license_events.details, ''), license_events.action),
    '{}',
    NULL,
    license_events.created_at
  FROM license_events
  LEFT JOIN users ON users.id = license_events.actor_id

  UNION ALL

  SELECT
    'payroll:' || payroll_action_logs.id,
    'payroll',
    'payroll',
    payroll_action_logs.action,
    'success',
    NULL,
    NULL,
    payroll_action_logs.actor,
    NULL,
    'payroll_period',
    payroll_action_logs.payroll_period_id,
    NULL,
    COALESCE(NULLIF(payroll_action_logs.notes, ''), payroll_action_logs.action),
    '{}',
    NULL,
    payroll_action_logs.created_at
  FROM payroll_action_logs

  UNION ALL

  SELECT
    'payslip:' || payslip_action_logs.id,
    'payslip',
    'payslips',
    payslip_action_logs.action,
    'success',
    NULL,
    NULL,
    payslip_action_logs.actor,
    NULL,
    'payslip',
    payslip_action_logs.payslip_id,
    NULL,
    COALESCE(NULLIF(payslip_action_logs.notes, ''), payslip_action_logs.action),
    '{}',
    NULL,
    payslip_action_logs.created_at
  FROM payslip_action_logs

  UNION ALL

  SELECT
    'download:' || payslip_download_logs.id,
    'download',
    'payslips',
    'download_pdf',
    'success',
    NULL,
    NULL,
    payslip_download_logs.downloaded_by,
    NULL,
    'payslip',
    payslip_download_logs.payslip_id,
    NULL,
    'Payslip PDF downloaded.',
    '{}',
    payslip_download_logs.file_path,
    payslip_download_logs.downloaded_at
  FROM payslip_download_logs
`;

export async function listAuditLogs(filters: unknown = {}): Promise<AuditListResult> {
  await authorizePermission('audit:view');
  const parsed = parseFilters(filters);
  const db = getDb();
  const where = buildWhere(parsed);
  const offset = (parsed.page - 1) * parsed.page_size;

  const [rows, countRow, summary, sourceRows, moduleRows] = await Promise.all([
    db.all<AuditLogEntry[]>(
      `WITH unified AS (${AUDIT_UNION})
       SELECT * FROM unified
       ${where.sql}
       ORDER BY datetime(created_at) DESC, id DESC
       LIMIT ? OFFSET ?`,
      ...where.params,
      parsed.page_size,
      offset,
    ),
    db.get<{ count: number }>(
      `WITH unified AS (${AUDIT_UNION})
       SELECT COUNT(*) AS count FROM unified ${where.sql}`,
      ...where.params,
    ),
    getSummary(parsed),
    db.all<Array<{ source: string; count: number }>>(
      `WITH unified AS (${AUDIT_UNION})
       SELECT source, COUNT(*) AS count
       FROM unified
       GROUP BY source
       ORDER BY count DESC, source ASC`,
    ),
    db.all<Array<{ module: string; count: number }>>(
      `WITH unified AS (${AUDIT_UNION})
       SELECT module, COUNT(*) AS count
       FROM unified
       GROUP BY module
       ORDER BY count DESC, module ASC`,
    ),
  ]);

  return {
    data: rows,
    total: countRow?.count ?? 0,
    page: parsed.page,
    page_size: parsed.page_size,
    summary: {
      ...summary,
      source_counts: sourceRows,
      module_counts: moduleRows.slice(0, 12),
    },
    options: {
      sources: sourceRows.map((row) => row.source),
      modules: moduleRows.map((row) => row.module),
      outcomes: ['success', 'failure', 'info'],
    },
  };
}

export async function getAuditLog(idValue: unknown): Promise<AuditLogEntry> {
  await authorizePermission('audit:view');
  const id = requireString(idValue, 'Audit log ID');
  const row = await getDb().get<AuditLogEntry>(
    `WITH unified AS (${AUDIT_UNION})
     SELECT * FROM unified WHERE id = ?`,
    id,
  );
  if (!row) throw new Error('Audit log entry was not found.');
  return row;
}

export async function exportAuditLogsCsv(filters: unknown = {}): Promise<string> {
  await authorizePermission('audit:view');
  const parsed = parseFilters({ ...(isRecord(filters) ? filters : {}), page: 1, page_size: 5000 });
  const where = buildWhere(parsed);
  const rows = await getDb().all<AuditLogEntry[]>(
    `WITH unified AS (${AUDIT_UNION})
     SELECT * FROM unified ${where.sql}
     ORDER BY datetime(created_at) DESC, id DESC
     LIMIT 5000`,
    ...where.params,
  );
  const header = [
    'Timestamp', 'Source', 'Module', 'Action', 'Outcome', 'Actor', 'Username',
    'Role', 'Entity Type', 'Entity ID', 'Channel', 'Summary', 'Origin',
  ];
  const lines = [header, ...rows.map((row) => [
    row.created_at,
    row.source,
    row.module,
    row.action,
    row.outcome,
    row.display_name ?? '',
    row.username ?? '',
    row.role ?? '',
    row.entity_type ?? '',
    row.entity_id ?? '',
    row.channel ?? '',
    row.summary,
    row.origin ?? '',
  ])];
  return lines.map((line) => line.map(csvCell).join(',')).join('\r\n');
}

export function isAuditableChannel(channel: string): boolean {
  if (channel.startsWith('audit.')) return false;
  if (
    channel.startsWith('auth.')
    || channel.startsWith('settings.')
    || channel.startsWith('backup.')
    || channel.startsWith('payroll.')
    || channel.startsWith('payslip.')
    || channel.startsWith('user.')
  ) return false;

  const exact = new Set([
    'self.profile.updateContact',
    'self.attendance.createCorrection',
    'self.leave.create',
    'self.leave.cancel',
    'self.payslip.exportPdf',
    'companyProfile.update',
    'companyProfile.chooseLogo',
  ]);
  if (exact.has(channel)) return true;

  return /\.(create|update|delete|setStatus|review|adjust|import|assign|unassign|recordPayment|replaceBrackets)$/.test(channel);
}

export async function recordIpcAudit(input: {
  channel: string;
  args: unknown[];
  outcome: AuditOutcome;
  result?: unknown;
  error?: unknown;
  origin?: string | null;
}): Promise<void> {
  if (!isAuditableChannel(input.channel)) return;
  const db = getDb();
  const actor = await currentUser().catch(() => null);
  const module = channelModule(input.channel);
  const action = channelAction(input.channel);
  const entityType = channelEntityType(input.channel);
  const entityId = findEntityId(input.args, input.result);
  const errorMessage = input.error instanceof Error ? input.error.message : String(input.error ?? '');
  const summary = input.outcome === 'failure'
    ? `${friendly(action)} failed${errorMessage ? `: ${errorMessage}` : '.'}`
    : `${friendly(action)} completed.`;

  await db.run(
    `INSERT INTO application_audit_logs (
       id, user_id, username, display_name, role, module, action,
       entity_type, entity_id, outcome, channel, summary,
       metadata_json, origin, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    `audit_${randomUUID()}`,
    actor?.id ?? null,
    actor?.username ?? null,
    actor?.display_name ?? null,
    actor?.role ?? null,
    module,
    action,
    entityType,
    entityId,
    input.outcome,
    input.channel,
    summary,
    JSON.stringify(safeMetadata(input.args, input.result)),
    input.origin ?? null,
  );
}

async function getSummary(filters: Required<AuditFilters>): Promise<Omit<AuditSummary, 'source_counts' | 'module_counts'>> {
  const db = getDb();
  const where = buildWhere(filters);
  const row = await db.get<{
    total: number;
    last_24_hours: number;
    failures_last_7_days: number;
    active_actors_last_30_days: number;
  }>(
    `WITH unified AS (${AUDIT_UNION})
     SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN datetime(created_at) >= datetime('now', '-1 day') THEN 1 ELSE 0 END) AS last_24_hours,
       SUM(CASE WHEN outcome = 'failure' AND datetime(created_at) >= datetime('now', '-7 days') THEN 1 ELSE 0 END) AS failures_last_7_days,
       COUNT(DISTINCT CASE
         WHEN datetime(created_at) >= datetime('now', '-30 days')
         THEN COALESCE(user_id, username, display_name)
       END) AS active_actors_last_30_days
     FROM unified
     ${where.sql}`,
    ...where.params,
  );
  return {
    total: row?.total ?? 0,
    last_24_hours: row?.last_24_hours ?? 0,
    failures_last_7_days: row?.failures_last_7_days ?? 0,
    active_actors_last_30_days: row?.active_actors_last_30_days ?? 0,
  };
}

function parseFilters(value: unknown): Required<AuditFilters> {
  const input = isRecord(value) ? value : {};
  const source = isAuditSource(input.source) ? input.source : 'all';
  const outcome = isAuditOutcome(input.outcome) ? input.outcome : 'all';
  return {
    search: typeof input.search === 'string' ? input.search.trim() : '',
    source,
    module: typeof input.module === 'string' && input.module.trim() ? input.module.trim() : 'all',
    outcome,
    user_id: typeof input.user_id === 'string' ? input.user_id.trim() : '',
    date_from: normalizeDate(input.date_from),
    date_to: normalizeDate(input.date_to),
    page: clampInteger(input.page, 1, 100_000, 1),
    page_size: clampInteger(input.page_size, 10, 200, 50),
  };
}

function buildWhere(filters: Required<AuditFilters>): { sql: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.search) {
    const pattern = `%${filters.search.toLowerCase()}%`;
    clauses.push(`(
      lower(COALESCE(summary, '')) LIKE ? OR
      lower(COALESCE(action, '')) LIKE ? OR
      lower(COALESCE(display_name, '')) LIKE ? OR
      lower(COALESCE(username, '')) LIKE ? OR
      lower(COALESCE(entity_id, '')) LIKE ? OR
      lower(COALESCE(channel, '')) LIKE ?
    )`);
    params.push(pattern, pattern, pattern, pattern, pattern, pattern);
  }
  if (filters.source !== 'all') {
    clauses.push('source = ?');
    params.push(filters.source);
  }
  if (filters.module !== 'all') {
    clauses.push('module = ?');
    params.push(filters.module);
  }
  if (filters.outcome !== 'all') {
    clauses.push('outcome = ?');
    params.push(filters.outcome);
  }
  if (filters.user_id) {
    clauses.push('user_id = ?');
    params.push(filters.user_id);
  }
  if (filters.date_from) {
    clauses.push('date(created_at) >= date(?)');
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    clauses.push('date(created_at) <= date(?)');
    params.push(filters.date_to);
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function channelModule(channel: string): string {
  const prefix = channel.split('.')[0] ?? 'application';
  const map: Record<string, string> = {
    employee: 'employees',
    attendance: 'timekeeping',
    schedule: 'timekeeping',
    attendanceCorrection: 'timekeeping',
    leaveType: 'leave',
    leaveBalance: 'leave',
    leaveRequest: 'leave',
    earningType: 'earnings',
    earningAssignment: 'earnings',
    earningTransaction: 'earnings',
    deductionType: 'deductions',
    deductionAssignment: 'deductions',
    deductionTransaction: 'deductions',
    loan: 'deductions',
    contributionType: 'contributions',
    contributionTable: 'contributions',
    contributionRecord: 'contributions',
    self: 'employee_portal',
    companyProfile: 'settings',
  };
  return map[prefix] ?? prefix;
}

function channelAction(channel: string): string {
  return channel.split('.').slice(1).join('_') || channel;
}

function channelEntityType(channel: string): string {
  const prefix = channel.split('.')[0] ?? 'record';
  const map: Record<string, string> = {
    attendanceCorrection: 'attendance_correction',
    leaveType: 'leave_type',
    leaveBalance: 'leave_balance',
    leaveRequest: 'leave_request',
    earningType: 'earning_type',
    earningAssignment: 'earning_assignment',
    earningTransaction: 'earning_transaction',
    deductionType: 'deduction_type',
    deductionAssignment: 'deduction_assignment',
    deductionTransaction: 'deduction_transaction',
    contributionType: 'contribution_type',
    contributionTable: 'contribution_table',
    contributionRecord: 'contribution_record',
    companyProfile: 'company_profile',
  };
  return map[prefix] ?? prefix;
}

function findEntityId(args: unknown[], result: unknown): string | null {
  const resultId = isRecord(result) && typeof result.id === 'string' ? result.id : null;
  if (resultId) return resultId;
  for (const arg of args) {
    if (typeof arg === 'string' && arg.trim()) return arg.trim();
    if (isRecord(arg)) {
      for (const key of ['id', 'employee_id', 'payroll_period_id', 'attendance_id', 'leave_request_id']) {
        if (typeof arg[key] === 'string' && arg[key].trim()) return arg[key].trim();
      }
    }
  }
  return null;
}

function safeMetadata(args: unknown[], result: unknown): Record<string, unknown> {
  const metadata: Record<string, unknown> = { argument_count: args.length };
  const payload = args.find(isRecord);
  if (payload && isRecord(payload)) {
    metadata.payload_fields = Object.keys(payload)
      .filter((key) => !/(password|token|hash|salt|bank|account|sss|philhealth|pagibig|tin|email|phone|address)/i.test(key))
      .slice(0, 30);
  }
  if (isRecord(result)) {
    metadata.result_fields = Object.keys(result).slice(0, 30);
    if (typeof result.status === 'string') metadata.result_status = result.status;
  }
  return metadata;
}

function normalizeDate(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : '';
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function isAuditSource(value: unknown): value is AuditSource | 'all' {
  return typeof value === 'string' && [
    'all', 'application', 'authentication', 'settings', 'backup', 'payroll', 'payslip', 'download',
  ].includes(value);
}

function isAuditOutcome(value: unknown): value is AuditOutcome | 'all' {
  return typeof value === 'string' && ['all', 'success', 'failure', 'info'].includes(value);
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function friendly(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
