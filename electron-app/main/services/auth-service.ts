import crypto from 'node:crypto';
import { deleteSecure, loadSecure, saveSecure } from '../secureStore';
import { getDb } from '../db';

export type UserRole =
  | 'administrator'
  | 'hr_officer'
  | 'payroll_officer'
  | 'supervisor'
  | 'employee';

export interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: UserRole;
  employee_id: string | null;
  employee_name: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  permissions: string[];
}

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: UserRole;
  employee_id: string | null;
  employee_name: string | null;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  is_active: number;
  must_change_password: number;
  failed_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PersistedSession {
  user_id: string;
  expires_at: string;
}

const PASSWORD_ITERATIONS = 310_000;
const PASSWORD_KEY_LENGTH = 32;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const SESSION_HOURS = 8;
const REMEMBER_SESSION_DAYS = 7;
const SESSION_STORAGE_KEY = 'payroll-auth-session';

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  administrator: ['*'],
  hr_officer: [
    'dashboard:view',
    'employees:view',
    'employees:manage',
    'timekeeping:view',
    'timekeeping:manage',
    'leave:view',
    'leave:manage',
    'earnings:manage',
    'deductions:manage',
    'reports:view',
    'payslips:view',
    'employee_portal:view',
  ],
  payroll_officer: [
    'dashboard:view',
    'employees:view',
    'timekeeping:view',
    'leave:view',
    'earnings:manage',
    'deductions:manage',
    'contributions:manage',
    'payroll:manage',
    'reports:view',
    'payslips:manage',
    'employee_portal:view',
  ],
  supervisor: [
    'dashboard:view',
    'employees:view',
    'timekeeping:view',
    'timekeeping:manage',
    'leave:view',
    'leave:manage',
    'employee_portal:view',
  ],
  employee: ['employee_portal:view'],
};

let currentSession: PersistedSession | null = null;

export async function initializeAuth(): Promise<void> {
  await seedDefaultAdministrator();
  await restoreSession();
}

export async function login(payload: unknown): Promise<AuthUser> {
  const input = requireObject(payload, 'Login details');
  const username = normalizeUsername(input.username);
  const password = requireString(input.password, 'Password');
  const remember = Boolean(input.remember);
  const db = getDb();

  const row = await getUserRowByUsername(username);
  if (!row) {
    await writeAudit(null, username, 'login_failed', 'Unknown username.');
    throw new Error('Invalid username or password.');
  }

  if (!row.is_active) {
    await writeAudit(row.id, username, 'login_blocked', 'Inactive account.');
    throw new Error('This account is inactive. Contact an administrator.');
  }

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    await writeAudit(row.id, username, 'login_blocked', 'Account is temporarily locked.');
    throw new Error(`Too many failed attempts. Try again after ${formatLocalDateTime(row.locked_until)}.`);
  }

  const valid = verifyPassword(password, row.password_salt, row.password_hash, row.password_iterations);
  if (!valid) {
    const attempts = row.failed_attempts + 1;
    const lockedUntil = attempts >= MAX_FAILED_ATTEMPTS
      ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
      : null;

    await db.run(
      `UPDATE users
          SET failed_attempts = ?,
              locked_until = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
      attempts >= MAX_FAILED_ATTEMPTS ? 0 : attempts,
      lockedUntil,
      row.id,
    );

    await writeAudit(row.id, username, 'login_failed', lockedUntil ? 'Account locked.' : 'Incorrect password.');
    throw new Error(
      lockedUntil
        ? `Too many failed attempts. The account is locked for ${LOCK_MINUTES} minutes.`
        : 'Invalid username or password.',
    );
  }

  await db.run(
    `UPDATE users
        SET failed_attempts = 0,
            locked_until = NULL,
            last_login_at = datetime('now'),
            updated_at = datetime('now')
      WHERE id = ?`,
    row.id,
  );

  const expiresAt = new Date(
    Date.now() + (remember ? REMEMBER_SESSION_DAYS * 24 : SESSION_HOURS) * 60 * 60 * 1000,
  ).toISOString();
  currentSession = { user_id: row.id, expires_at: expiresAt };
  await saveSecure(SESSION_STORAGE_KEY, JSON.stringify(currentSession));
  await writeAudit(row.id, username, 'login_success', remember ? 'Remembered session.' : 'Standard session.');

  const user = await getUser(row.id);
  if (!user) throw new Error('The authenticated account could not be loaded.');
  return user;
}

export async function logout(): Promise<{ success: true }> {
  const session = currentSession;
  currentSession = null;
  await deleteSecure(SESSION_STORAGE_KEY);
  if (session) {
    const user = await getUser(session.user_id);
    if (user) await writeAudit(user.id, user.username, 'logout', 'User signed out.');
  }
  return { success: true };
}

export async function currentUser(): Promise<AuthUser | null> {
  if (!currentSession) return null;
  if (new Date(currentSession.expires_at).getTime() <= Date.now()) {
    currentSession = null;
    await deleteSecure(SESSION_STORAGE_KEY);
    return null;
  }

  const user = await getUser(currentSession.user_id);
  if (!user || !user.is_active) {
    currentSession = null;
    await deleteSecure(SESSION_STORAGE_KEY);
    return null;
  }
  return user;
}

export async function changePassword(payload: unknown): Promise<AuthUser> {
  const actor = await requireAuthenticatedUser();
  const input = requireObject(payload, 'Password change');
  const currentPassword = requireString(input.current_password, 'Current password');
  const newPassword = validatePassword(input.new_password);
  const db = getDb();
  const row = await getUserRowById(actor.id);
  if (!row) throw new Error('The user account no longer exists.');

  if (!verifyPassword(currentPassword, row.password_salt, row.password_hash, row.password_iterations)) {
    await writeAudit(actor.id, actor.username, 'password_change_failed', 'Current password did not match.');
    throw new Error('The current password is incorrect.');
  }

  if (currentPassword === newPassword) {
    throw new Error('The new password must be different from the current password.');
  }

  const password = createPasswordHash(newPassword);
  await db.run(
    `UPDATE users
        SET password_hash = ?,
            password_salt = ?,
            password_iterations = ?,
            must_change_password = 0,
            password_changed_at = datetime('now'),
            updated_at = datetime('now')
      WHERE id = ?`,
    password.hash,
    password.salt,
    password.iterations,
    actor.id,
  );
  await writeAudit(actor.id, actor.username, 'password_changed', 'Password changed by account owner.');

  const updated = await getUser(actor.id);
  if (!updated) throw new Error('The updated account could not be loaded.');
  return updated;
}

export async function listUsers(filters: unknown = {}): Promise<{ data: AuthUser[]; total: number }> {
  await requirePermission('users:manage');
  const input = isRecord(filters) ? filters : {};
  const search = typeof input.search === 'string' ? input.search.trim() : '';
  const role = isUserRole(input.role) ? input.role : null;
  const active = input.active === true ? 1 : input.active === false ? 0 : null;
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  if (search) {
    where.push(`(lower(users.username) LIKE ? OR lower(users.display_name) LIKE ? OR lower(users.email) LIKE ? OR lower(COALESCE(employees.name, '')) LIKE ?)`);
    const pattern = `%${search.toLowerCase()}%`;
    params.push(pattern, pattern, pattern, pattern);
  }
  if (role) {
    where.push('users.role = ?');
    params.push(role);
  }
  if (active !== null) {
    where.push('users.is_active = ?');
    params.push(active);
  }

  const rows = await db.all<UserRow[]>(
    `SELECT users.*, employees.name AS employee_name
       FROM users
       LEFT JOIN employees ON employees.id = users.employee_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY users.is_active DESC, users.display_name COLLATE NOCASE ASC`,
    ...params,
  );
  return { data: rows.map(sanitizeUser), total: rows.length };
}

export async function getUser(id: string): Promise<AuthUser | null> {
  const row = await getUserRowById(id);
  return row ? sanitizeUser(row) : null;
}

export async function createUser(payload: unknown): Promise<AuthUser> {
  const actor = await requirePermission('users:manage');
  const input = parseUserInput(payload, true);
  const password = createPasswordHash(input.password!);
  const db = getDb();
  const id = `user_${crypto.randomUUID()}`;

  await assertUniqueUser(input.username, input.email, input.employee_id, null);
  await validateEmployeeLink(input.role, input.employee_id);

  await db.run(
    `INSERT INTO users (
      id, username, display_name, email, role, employee_id,
      password_hash, password_salt, password_iterations,
      is_active, must_change_password, failed_attempts,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, datetime('now'), datetime('now'))`,
    id,
    input.username,
    input.display_name,
    input.email,
    input.role,
    input.employee_id,
    password.hash,
    password.salt,
    password.iterations,
    input.is_active ? 1 : 0,
  );
  await writeAudit(actor.id, actor.username, 'user_created', `Created ${input.username} (${input.role}).`);

  const user = await getUser(id);
  if (!user) throw new Error('The created account could not be loaded.');
  return user;
}

export async function updateUser(id: string, payload: unknown): Promise<AuthUser> {
  const actor = await requirePermission('users:manage');
  const existing = await getUserRowById(id);
  if (!existing) throw new Error('The user account was not found.');
  const input = parseUserInput(payload, false);

  await assertUniqueUser(input.username, input.email, input.employee_id, id);
  await validateEmployeeLink(input.role, input.employee_id);
  await protectLastAdministrator(existing, input.role, input.is_active);

  const db = getDb();
  await db.run(
    `UPDATE users
        SET username = ?,
            display_name = ?,
            email = ?,
            role = ?,
            employee_id = ?,
            is_active = ?,
            updated_at = datetime('now')
      WHERE id = ?`,
    input.username,
    input.display_name,
    input.email,
    input.role,
    input.employee_id,
    input.is_active ? 1 : 0,
    id,
  );
  await writeAudit(actor.id, actor.username, 'user_updated', `Updated ${input.username}.`);

  const user = await getUser(id);
  if (!user) throw new Error('The updated account could not be loaded.');
  return user;
}

export async function setUserStatus(id: string, active: boolean): Promise<AuthUser> {
  const actor = await requirePermission('users:manage');
  const target = await getUserRowById(id);
  if (!target) throw new Error('The user account was not found.');
  if (!active && actor.id === id) throw new Error('You cannot deactivate your own account.');
  await protectLastAdministrator(target, target.role, active);

  await getDb().run(
    `UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    active ? 1 : 0,
    id,
  );
  await writeAudit(actor.id, actor.username, active ? 'user_activated' : 'user_deactivated', target.username);

  const user = await getUser(id);
  if (!user) throw new Error('The updated account could not be loaded.');
  return user;
}

export async function resetUserPassword(id: string, payload: unknown): Promise<AuthUser> {
  const actor = await requirePermission('users:manage');
  const target = await getUserRowById(id);
  if (!target) throw new Error('The user account was not found.');
  const input = requireObject(payload, 'Password reset');
  const newPassword = validatePassword(input.new_password);
  const password = createPasswordHash(newPassword);

  await getDb().run(
    `UPDATE users
        SET password_hash = ?,
            password_salt = ?,
            password_iterations = ?,
            must_change_password = 1,
            failed_attempts = 0,
            locked_until = NULL,
            password_changed_at = datetime('now'),
            updated_at = datetime('now')
      WHERE id = ?`,
    password.hash,
    password.salt,
    password.iterations,
    id,
  );
  await writeAudit(actor.id, actor.username, 'password_reset', `Reset password for ${target.username}.`);

  const user = await getUser(id);
  if (!user) throw new Error('The updated account could not be loaded.');
  return user;
}

export async function getRoleOptions(): Promise<Array<{ value: UserRole; label: string; permissions: string[] }>> {
  await requireAuthenticatedUser();
  const labels: Record<UserRole, string> = {
    administrator: 'Administrator',
    hr_officer: 'HR Officer',
    payroll_officer: 'Payroll Officer',
    supervisor: 'Supervisor',
    employee: 'Employee',
  };
  return (Object.keys(labels) as UserRole[]).map((role) => ({
    value: role,
    label: labels[role],
    permissions: ROLE_PERMISSIONS[role],
  }));
}

export async function listAuthAuditLogs(limitValue: unknown = 100): Promise<{ data: unknown[]; total: number }> {
  await requirePermission('users:manage');
  const limit = Math.max(1, Math.min(500, Number(limitValue) || 100));
  const rows = await getDb().all(
    `SELECT auth_audit_logs.*, users.display_name
       FROM auth_audit_logs
       LEFT JOIN users ON users.id = auth_audit_logs.user_id
       ORDER BY auth_audit_logs.created_at DESC
       LIMIT ?`,
    limit,
  );
  return { data: rows, total: rows.length };
}

export function hasPermission(user: AuthUser, permission: string): boolean {
  if (user.permissions.includes('*') || user.permissions.includes(permission)) return true;
  if (permission.endsWith(':view')) {
    return user.permissions.includes(permission.replace(':view', ':manage'));
  }
  return false;
}

export async function authorizePermission(permission: string): Promise<AuthUser> {
  return requirePermission(permission);
}

async function requirePermission(permission: string): Promise<AuthUser> {
  const user = await requireAuthenticatedUser();
  if (!hasPermission(user, permission)) throw new Error('You do not have permission to perform this action.');
  return user;
}

async function requireAuthenticatedUser(): Promise<AuthUser> {
  const user = await currentUser();
  if (!user) throw new Error('Authentication is required.');
  return user;
}

async function seedDefaultAdministrator(): Promise<void> {
  const db = getDb();
  const count = await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM users;');
  if ((count?.count ?? 0) > 0) return;

  const password = createPasswordHash('Admin@12345');
  await db.run(
    `INSERT INTO users (
      id, username, display_name, email, role, employee_id,
      password_hash, password_salt, password_iterations,
      is_active, must_change_password, failed_attempts,
      created_at, updated_at
    ) VALUES (
      'user_default_admin', 'admin', 'System Administrator', '', 'administrator', NULL,
      ?, ?, ?, 1, 1, 0, datetime('now'), datetime('now')
    )`,
    password.hash,
    password.salt,
    password.iterations,
  );
  await writeAudit('user_default_admin', 'admin', 'default_admin_created', 'Initial administrator account seeded.');
}

async function restoreSession(): Promise<void> {
  try {
    const raw = await loadSecure(SESSION_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PersistedSession;
    if (!parsed.user_id || !parsed.expires_at || new Date(parsed.expires_at).getTime() <= Date.now()) {
      await deleteSecure(SESSION_STORAGE_KEY);
      return;
    }
    currentSession = parsed;
    const user = await getUser(parsed.user_id);
    if (!user || !user.is_active) {
      currentSession = null;
      await deleteSecure(SESSION_STORAGE_KEY);
    }
  } catch {
    currentSession = null;
    await deleteSecure(SESSION_STORAGE_KEY);
  }
}

async function getUserRowByUsername(username: string): Promise<UserRow | undefined> {
  return getDb().get<UserRow>(
    `SELECT users.*, employees.name AS employee_name
       FROM users
       LEFT JOIN employees ON employees.id = users.employee_id
      WHERE lower(users.username) = lower(?)`,
    username,
  );
}

async function getUserRowById(id: string): Promise<UserRow | undefined> {
  return getDb().get<UserRow>(
    `SELECT users.*, employees.name AS employee_name
       FROM users
       LEFT JOIN employees ON employees.id = users.employee_id
      WHERE users.id = ?`,
    id,
  );
}

function sanitizeUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    email: row.email,
    role: row.role,
    employee_id: row.employee_id,
    employee_name: row.employee_name,
    is_active: Boolean(row.is_active),
    must_change_password: Boolean(row.must_change_password),
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    permissions: ROLE_PERMISSIONS[row.role] ?? [],
  };
}

function createPasswordHash(password: string): { hash: string; salt: string; iterations: number } {
  validatePassword(password);
  const salt = crypto.randomBytes(16).toString('base64');
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, 'sha256').toString('base64');
  return { hash, salt, iterations: PASSWORD_ITERATIONS };
}

function verifyPassword(password: string, salt: string, expectedHash: string, iterations: number): boolean {
  const actual = crypto.pbkdf2Sync(password, salt, iterations, PASSWORD_KEY_LENGTH, 'sha256');
  const expected = Buffer.from(expectedHash, 'base64');
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}

function validatePassword(value: unknown): string {
  const password = requireString(value, 'Password');
  if (password.length < 10) throw new Error('Password must contain at least 10 characters.');
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw new Error('Password must include uppercase, lowercase, number, and special characters.');
  }
  return password;
}

function parseUserInput(payload: unknown, creating: boolean): {
  username: string;
  display_name: string;
  email: string;
  role: UserRole;
  employee_id: string | null;
  is_active: boolean;
  password?: string;
} {
  const input = requireObject(payload, 'User account');
  const username = normalizeUsername(input.username);
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new Error('Username must be 3–40 characters using letters, numbers, dots, underscores, or dashes.');
  }
  const displayName = requireString(input.display_name, 'Display name');
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (!isUserRole(input.role)) throw new Error('Select a valid user role.');
  const employeeId = typeof input.employee_id === 'string' && input.employee_id.trim()
    ? input.employee_id.trim()
    : null;
  const result = {
    username,
    display_name: displayName,
    email,
    role: input.role,
    employee_id: employeeId,
    is_active: input.is_active !== false,
    password: undefined as string | undefined,
  };
  if (creating) result.password = validatePassword(input.password);
  return result;
}

async function assertUniqueUser(username: string, email: string, employeeId: string | null, excludeId: string | null): Promise<void> {
  const db = getDb();
  const row = await db.get<{ username_count: number; email_count: number; employee_count: number }>(
    `SELECT
      SUM(CASE WHEN lower(username) = lower(?) AND id <> COALESCE(?, '') THEN 1 ELSE 0 END) AS username_count,
      SUM(CASE WHEN ? <> '' AND lower(email) = lower(?) AND id <> COALESCE(?, '') THEN 1 ELSE 0 END) AS email_count,
      SUM(CASE WHEN ? IS NOT NULL AND employee_id = ? AND id <> COALESCE(?, '') THEN 1 ELSE 0 END) AS employee_count
     FROM users`,
    username,
    excludeId,
    email,
    email,
    excludeId,
    employeeId,
    employeeId,
    excludeId,
  );
  if ((row?.username_count ?? 0) > 0) throw new Error('That username is already in use.');
  if ((row?.email_count ?? 0) > 0) throw new Error('That email address is already in use.');
  if ((row?.employee_count ?? 0) > 0) throw new Error('That employee is already linked to another user account.');
}

async function validateEmployeeLink(role: UserRole, employeeId: string | null): Promise<void> {
  if (role === 'employee' && !employeeId) throw new Error('Employee accounts must be linked to an employee record.');
  if (!employeeId) return;
  const employee = await getDb().get<{ id: string; is_active: number }>(
    'SELECT id, is_active FROM employees WHERE id = ?',
    employeeId,
  );
  if (!employee) throw new Error('The selected employee record was not found.');
  if (!employee.is_active) throw new Error('The selected employee record is inactive.');
}

async function protectLastAdministrator(existing: UserRow, nextRole: UserRole, nextActive: boolean): Promise<void> {
  const removesAdministrator = existing.role === 'administrator' && (nextRole !== 'administrator' || !nextActive);
  if (!removesAdministrator) return;
  const count = await getDb().get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM users WHERE role = 'administrator' AND is_active = 1`,
  );
  if ((count?.count ?? 0) <= 1) throw new Error('At least one active administrator account is required.');
}

async function writeAudit(userId: string | null, username: string, action: string, details: string): Promise<void> {
  await getDb().run(
    `INSERT INTO auth_audit_logs (id, user_id, username, action, details, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    `authlog_${crypto.randomUUID()}`,
    userId,
    username,
    action,
    details,
  );
}

function normalizeUsername(value: unknown): string {
  return requireString(value, 'Username').trim().toLowerCase();
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} are required.`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'administrator'
    || value === 'hr_officer'
    || value === 'payroll_officer'
    || value === 'supervisor'
    || value === 'employee';
}

function formatLocalDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
