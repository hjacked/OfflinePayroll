import { app } from 'electron';
import crypto from 'node:crypto';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import {
  access,
  copyFile,
  mkdir,
  rename,
  rm,
  stat,
  unlink,
} from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { closeDb, getDatabasePath, getDb, initDb } from '../db';
import { authorizePermission } from './auth-service';
import { getBackupPolicy } from './settings-service';

export type BackupKind = 'manual' | 'automatic' | 'safety';
export type BackupFileStatus = 'completed' | 'failed' | 'deleted';
export type RestoreStatus = 'completed' | 'failed';

export interface BackupFileRecord {
  id: string;
  file_name: string;
  file_path: string;
  backup_kind: BackupKind;
  status: BackupFileStatus;
  size_bytes: number;
  checksum_sha256: string;
  integrity_result: string;
  include_audit_logs: boolean;
  actor_id: string;
  actor_name: string;
  notes: string;
  created_at: string;
  validated_at: string | null;
}

export interface RestoreRecord {
  id: string;
  source_path: string;
  source_checksum_sha256: string;
  safety_backup_path: string;
  actor_id: string;
  actor_name: string;
  status: RestoreStatus;
  message: string;
  created_at: string;
}

export interface IntegrityResult {
  ok: boolean;
  result: string;
  checked_at: string;
  file_path: string;
  size_bytes: number;
  checksum_sha256: string;
}

export interface BackupOverview {
  directory: string;
  auto_backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  retention_count: number;
  include_audit_logs: boolean;
  latest_backup: BackupFileRecord | null;
  backups: BackupFileRecord[];
  restores: RestoreRecord[];
  total_size_bytes: number;
  next_automatic_backup_at: string | null;
}

export interface BackupCreationResult {
  backup: BackupFileRecord;
  removed_by_retention: number;
}

export interface RestoreResult {
  restored: true;
  source_path: string;
  safety_backup_path: string;
  integrity: IntegrityResult;
  message: string;
}

interface ActorIdentity {
  id: string;
  display_name: string;
}

interface BackupHistoryRow {
  id: string;
  file_name: string;
  file_path: string;
  backup_kind: BackupKind;
  status: BackupFileStatus;
  size_bytes: number;
  checksum_sha256: string;
  integrity_result: string;
  include_audit_logs: number;
  actor_id: string | null;
  actor_name: string | null;
  notes: string | null;
  created_at: string;
  validated_at: string | null;
}

interface RestoreHistoryRow {
  id: string;
  source_path: string;
  source_checksum_sha256: string;
  safety_backup_path: string;
  actor_id: string | null;
  actor_name: string | null;
  status: RestoreStatus;
  message: string | null;
  created_at: string;
}

let scheduler: NodeJS.Timeout | null = null;
let automaticBackupRunning = false;

export async function getBackupOverview(): Promise<BackupOverview> {
  await authorizePermission('settings:manage');
  const policy = await getBackupPolicy();
  const backups = await listBackupHistory(200);
  const restores = await listRestoreHistory(50);
  const latest = backups.find((item) => item.status === 'completed') ?? null;
  const totalSize = backups
    .filter((item) => item.status === 'completed')
    .reduce((sum, item) => sum + item.size_bytes, 0);

  return {
    directory: policy.backup_directory,
    auto_backup_enabled: policy.auto_backup_enabled,
    backup_frequency: policy.backup_frequency,
    retention_count: policy.retention_count,
    include_audit_logs: policy.include_audit_logs,
    latest_backup: latest,
    backups,
    restores,
    total_size_bytes: totalSize,
    next_automatic_backup_at: await getNextAutomaticBackupAt(policy.backup_frequency),
  };
}

export async function createManualBackup(notesValue: unknown = ''): Promise<BackupCreationResult> {
  const actor = await authorizePermission('settings:manage');
  return createBackupInternal('manual', actor, optionalString(notesValue));
}

export async function validateManagedBackup(idValue: unknown): Promise<IntegrityResult> {
  const actor = await authorizePermission('settings:manage');
  const id = requireString(idValue, 'Backup');
  const row = await getDb().get<BackupHistoryRow>(
    `SELECT * FROM backup_history WHERE id = ?`,
    id,
  );
  if (!row) throw new Error('The selected backup record no longer exists.');
  const result = await validateDatabaseFile(row.file_path);
  await getDb().run(
    `UPDATE backup_history
        SET integrity_result = ?, checksum_sha256 = ?, size_bytes = ?,
            validated_at = datetime('now')
      WHERE id = ?`,
    result.result,
    result.checksum_sha256,
    result.size_bytes,
    id,
  );
  await writeBackupAudit(
    'validate',
    actor,
    result.ok ? 'completed' : 'failed',
    row.file_path,
    result.result,
  );
  return result;
}

export async function validateExternalBackup(filePathValue: unknown): Promise<IntegrityResult> {
  const actor = await authorizePermission('settings:manage');
  const filePath = requireString(filePathValue, 'Backup file');
  const result = await validateDatabaseFile(filePath);
  await writeBackupAudit(
    'validate_external',
    actor,
    result.ok ? 'completed' : 'failed',
    filePath,
    result.result,
  );
  return result;
}

export async function checkCurrentDatabaseIntegrity(): Promise<IntegrityResult> {
  const actor = await authorizePermission('settings:manage');
  const result = await validateOpenDatabase();
  await writeBackupAudit(
    'integrity_check',
    actor,
    result.ok ? 'completed' : 'failed',
    result.file_path,
    result.result,
  );
  return result;
}

export async function deleteBackup(idValue: unknown): Promise<{ id: string; deleted: true }> {
  const actor = await authorizePermission('settings:manage');
  const id = requireString(idValue, 'Backup');
  const row = await getDb().get<BackupHistoryRow>(
    `SELECT * FROM backup_history WHERE id = ?`,
    id,
  );
  if (!row) throw new Error('The selected backup record no longer exists.');
  if (row.status === 'deleted') return { id, deleted: true };
  assertSafeBackupPath(row.file_path);

  await rm(row.file_path, { force: true });
  await getDb().run(
    `UPDATE backup_history
        SET status = 'deleted', notes = trim(COALESCE(notes, '') || ' File deleted.')
      WHERE id = ?`,
    id,
  );
  await writeBackupAudit('delete', actor, 'completed', row.file_path, 'Backup file deleted.');
  return { id, deleted: true };
}

export async function restoreDatabase(
  filePathValue: unknown,
  notesValue: unknown = '',
): Promise<RestoreResult> {
  const actor = await authorizePermission('settings:manage');
  const sourcePath = path.resolve(requireString(filePathValue, 'Backup file'));
  const notes = optionalString(notesValue);
  const currentPath = path.resolve(getDatabasePath());
  if (sourcePath === currentPath) {
    throw new Error('The active payroll database cannot be restored over itself.');
  }

  const integrity = await validateDatabaseFile(sourcePath);
  if (!integrity.ok) {
    await writeBackupAudit('restore', actor, 'failed', sourcePath, integrity.result);
    throw new Error(`The selected file failed validation: ${integrity.result}`);
  }

  const safety = await createBackupInternal(
    'safety',
    actor,
    `Automatic safety backup before restoring ${path.basename(sourcePath)}.`,
    true,
  );

  const tempPath = `${currentPath}.restore-${Date.now()}.tmp`;
  const previousPath = `${currentPath}.pre-restore-${Date.now()}.tmp`;
  let currentMoved = false;

  try {
    await copyFile(sourcePath, tempPath);
    await closeDb();
    await removeDatabaseSidecars(currentPath);

    try {
      await rename(currentPath, previousPath);
      currentMoved = true;
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }

    await rename(tempPath, currentPath);
    await initDb();

    const restoredIntegrity = await validateOpenDatabase();
    if (!restoredIntegrity.ok) {
      throw new Error(`Restored database failed integrity checking: ${restoredIntegrity.result}`);
    }

    await insertBackupHistoryIfMissing(safety.backup);
    const restoredActorId = await existingActorId(actor.id);
    await getDb().run(
      `INSERT INTO backup_restore_logs (
        id, source_path, source_checksum_sha256, safety_backup_path,
        actor_id, actor_name, status, message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now'))`,
      createId('restore'),
      sourcePath,
      integrity.checksum_sha256,
      safety.backup.file_path,
      restoredActorId,
      actor.display_name,
      notes || 'Database restored successfully.',
    );
    await writeBackupAudit(
      'restore',
      actor,
      'completed',
      sourcePath,
      `Database restored. Safety backup: ${safety.backup.file_path}`,
    );

    if (currentMoved) await rm(previousPath, { force: true });
    return {
      restored: true,
      source_path: sourcePath,
      safety_backup_path: safety.backup.file_path,
      integrity: restoredIntegrity,
      message: 'Database restored successfully. Sign in again to continue.',
    };
  } catch (error) {
    await closeDb().catch(() => undefined);
    await rm(currentPath, { force: true }).catch(() => undefined);
    if (currentMoved) {
      await rename(previousPath, currentPath).catch(() => undefined);
    }
    await rm(tempPath, { force: true }).catch(() => undefined);
    await initDb().catch(() => undefined);

    const message = error instanceof Error ? error.message : 'Database restore failed.';
    try {
      await getDb().run(
        `INSERT INTO backup_restore_logs (
          id, source_path, source_checksum_sha256, safety_backup_path,
          actor_id, actor_name, status, message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'failed', ?, datetime('now'))`,
        createId('restore'),
        sourcePath,
        integrity.checksum_sha256,
        safety.backup.file_path,
        actor.id,
        actor.display_name,
        message,
      );
      await writeBackupAudit('restore', actor, 'failed', sourcePath, message);
    } catch {
      // Preserve the original restore error if the original database also cannot reopen.
    }
    throw error;
  } finally {
    await rm(tempPath, { force: true }).catch(() => undefined);
  }
}

export async function initializeBackupScheduler(): Promise<void> {
  if (scheduler) return;
  await runAutomaticBackupIfDue().catch((error) => {
    console.error('Automatic backup check failed:', error);
  });
  scheduler = setInterval(() => {
    void runAutomaticBackupIfDue().catch((error) => {
      console.error('Automatic backup check failed:', error);
    });
  }, 60 * 60 * 1000);
  scheduler.unref?.();
}

export async function runAutomaticBackupIfDue(): Promise<void> {
  if (automaticBackupRunning) return;
  const policy = await getBackupPolicy();
  if (!policy.auto_backup_enabled || !policy.backup_directory) return;

  const dueAt = await getNextAutomaticBackupAt(policy.backup_frequency);
  if (dueAt && new Date(dueAt).getTime() > Date.now()) return;

  automaticBackupRunning = true;
  try {
    await createBackupInternal(
      'automatic',
      { id: '', display_name: 'System' },
      'Scheduled automatic backup.',
    );
  } finally {
    automaticBackupRunning = false;
  }
}

async function createBackupInternal(
  kind: BackupKind,
  actor: ActorIdentity,
  notes: string,
  forceAuditLogs = false,
): Promise<BackupCreationResult> {
  const policy = await getBackupPolicy();
  const directory = policy.backup_directory
    ? path.resolve(policy.backup_directory)
    : kind === 'safety'
      ? path.join(app.getPath('userData'), 'backups')
      : '';

  if (!directory) {
    throw new Error('Choose and save a backup directory in Settings before creating a backup.');
  }

  await mkdir(directory, { recursive: true });
  await access(directory, fsConstants.W_OK);

  const fileName = `payroll-backup-${formatTimestamp(new Date())}-${kind}.sqlite`;
  const filePath = path.join(directory, fileName);
  const id = createId('backup');
  const includeAuditLogs = forceAuditLogs ? true : policy.include_audit_logs;

  try {
    const escapedDestination = filePath.replace(/'/g, "''");
    await getDb().exec('PRAGMA wal_checkpoint(FULL);');
    await getDb().exec(`VACUUM INTO '${escapedDestination}';`);

    if (!includeAuditLogs) await stripAuditLogs(filePath);
    const integrity = await validateDatabaseFile(filePath);
    if (!integrity.ok) throw new Error(`Backup validation failed: ${integrity.result}`);

    await getDb().run(
      `INSERT INTO backup_history (
        id, file_name, file_path, backup_kind, status, size_bytes,
        checksum_sha256, integrity_result, include_audit_logs,
        actor_id, actor_name, notes, created_at, validated_at
      ) VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id,
      fileName,
      filePath,
      kind,
      integrity.size_bytes,
      integrity.checksum_sha256,
      integrity.result,
      includeAuditLogs ? 1 : 0,
      actor.id || null,
      actor.display_name,
      notes,
    );
    await writeBackupAudit('create', actor, 'completed', filePath, `${kind} backup created.`);

    const removed = kind === 'safety' ? 0 : await applyRetentionPolicy(directory, policy.retention_count);
    const backup = await getBackupById(id);
    if (!backup) throw new Error('The created backup could not be loaded from history.');
    return { backup, removed_by_retention: removed };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Backup creation failed.';
    await rm(filePath, { force: true }).catch(() => undefined);
    await getDb().run(
      `INSERT OR REPLACE INTO backup_history (
        id, file_name, file_path, backup_kind, status, size_bytes,
        checksum_sha256, integrity_result, include_audit_logs,
        actor_id, actor_name, notes, created_at
      ) VALUES (?, ?, ?, ?, 'failed', 0, '', ?, ?, ?, ?, ?, datetime('now'))`,
      id,
      fileName,
      filePath,
      kind,
      message,
      includeAuditLogs ? 1 : 0,
      actor.id || null,
      actor.display_name,
      notes,
    ).catch(() => undefined);
    await writeBackupAudit('create', actor, 'failed', filePath, message).catch(() => undefined);
    throw error;
  }
}

async function validateOpenDatabase(): Promise<IntegrityResult> {
  const filePath = getDatabasePath();
  const rows = await getDb().all<Array<Record<string, string>>>('PRAGMA quick_check;');
  const result = readIntegrityResult(rows);
  const fileStat = await stat(filePath);
  return {
    ok: result.toLowerCase() === 'ok',
    result,
    checked_at: new Date().toISOString(),
    file_path: filePath,
    size_bytes: fileStat.size,
    checksum_sha256: await checksumFile(filePath),
  };
}

async function validateDatabaseFile(filePathValue: string): Promise<IntegrityResult> {
  const filePath = path.resolve(filePathValue);
  await access(filePath, fsConstants.R_OK);
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) throw new Error('The selected backup path is not a file.');
  if (fileStat.size < 100) throw new Error('The selected backup file is empty or incomplete.');

  const validationDb = await open({
    filename: filePath,
    driver: sqlite3.Database,
  });
  try {
    await validationDb.exec('PRAGMA query_only = ON;');
    const rows = await validationDb.all<Array<Record<string, string>>>('PRAGMA quick_check;');
    const result = readIntegrityResult(rows);
    const required = await validationDb.all<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('employees', 'payroll_periods', 'users')`,
    );
    const requiredNames = new Set(required.map((item) => item.name));
    const missing = ['employees', 'payroll_periods', 'users'].filter((name) => !requiredNames.has(name));
    const finalResult = missing.length
      ? `Missing required payroll tables: ${missing.join(', ')}`
      : result;
    return {
      ok: result.toLowerCase() === 'ok' && missing.length === 0,
      result: finalResult,
      checked_at: new Date().toISOString(),
      file_path: filePath,
      size_bytes: fileStat.size,
      checksum_sha256: await checksumFile(filePath),
    };
  } finally {
    await validationDb.close();
  }
}

async function stripAuditLogs(filePath: string): Promise<void> {
  const backupDb = await open({ filename: filePath, driver: sqlite3.Database });
  try {
    const tables = await backupDb.all<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master
        WHERE type = 'table'
          AND name IN (
            'application_audit_logs', 'auth_audit_logs', 'settings_audit_logs',
            'payroll_action_logs', 'payslip_action_logs', 'payslip_download_logs',
            'backup_audit_logs', 'backup_restore_logs', 'license_events'
          )`,
    );
    await backupDb.exec('BEGIN;');
    try {
      for (const table of tables) {
        await backupDb.exec(`DELETE FROM ${table.name};`);
      }
      await backupDb.exec('COMMIT;');
    } catch (error) {
      await backupDb.exec('ROLLBACK;');
      throw error;
    }
  } finally {
    await backupDb.close();
  }
}

async function applyRetentionPolicy(directory: string, retentionCount: number): Promise<number> {
  const rows = await getDb().all<BackupHistoryRow[]>(
    `SELECT * FROM backup_history
      WHERE status = 'completed'
        AND backup_kind IN ('manual', 'automatic')
      ORDER BY datetime(created_at) DESC`,
  );
  const removable = rows.filter((row) => path.dirname(path.resolve(row.file_path)) === directory)
    .slice(retentionCount);
  let removed = 0;
  for (const row of removable) {
    assertSafeBackupPath(row.file_path);
    await rm(row.file_path, { force: true });
    await getDb().run(`UPDATE backup_history SET status = 'deleted' WHERE id = ?`, row.id);
    removed += 1;
  }
  if (removed > 0) {
    await writeBackupAudit(
      'retention_cleanup',
      { id: '', display_name: 'System' },
      'completed',
      directory,
      `${removed} old backup file(s) removed.`,
    );
  }
  return removed;
}

async function listBackupHistory(limit: number): Promise<BackupFileRecord[]> {
  const rows = await getDb().all<BackupHistoryRow[]>(
    `SELECT * FROM backup_history ORDER BY datetime(created_at) DESC LIMIT ?`,
    Math.max(1, Math.min(500, limit)),
  );
  return rows.map(mapBackupRow);
}

async function listRestoreHistory(limit: number): Promise<RestoreRecord[]> {
  const rows = await getDb().all<RestoreHistoryRow[]>(
    `SELECT * FROM backup_restore_logs ORDER BY datetime(created_at) DESC LIMIT ?`,
    Math.max(1, Math.min(200, limit)),
  );
  return rows.map((row) => ({
    id: row.id,
    source_path: row.source_path,
    source_checksum_sha256: row.source_checksum_sha256,
    safety_backup_path: row.safety_backup_path,
    actor_id: row.actor_id || '',
    actor_name: row.actor_name || 'System',
    status: row.status,
    message: row.message || '',
    created_at: row.created_at,
  }));
}

async function getBackupById(id: string): Promise<BackupFileRecord | null> {
  const row = await getDb().get<BackupHistoryRow>(`SELECT * FROM backup_history WHERE id = ?`, id);
  return row ? mapBackupRow(row) : null;
}

async function insertBackupHistoryIfMissing(backup: BackupFileRecord): Promise<void> {
  const actorId = await existingActorId(backup.actor_id);
  await getDb().run(
    `INSERT OR IGNORE INTO backup_history (
      id, file_name, file_path, backup_kind, status, size_bytes,
      checksum_sha256, integrity_result, include_audit_logs,
      actor_id, actor_name, notes, created_at, validated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    backup.id,
    backup.file_name,
    backup.file_path,
    backup.backup_kind,
    backup.status,
    backup.size_bytes,
    backup.checksum_sha256,
    backup.integrity_result,
    backup.include_audit_logs ? 1 : 0,
    actorId,
    backup.actor_name,
    backup.notes,
    backup.created_at,
    backup.validated_at,
  );
}

async function writeBackupAudit(
  action: string,
  actor: ActorIdentity,
  status: 'completed' | 'failed',
  targetPath: string,
  message: string,
): Promise<void> {
  const actorId = await existingActorId(actor.id);
  await getDb().run(
    `INSERT INTO backup_audit_logs (
      id, action, status, target_path, actor_id, actor_name, message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    createId('backup_audit'),
    action,
    status,
    targetPath,
    actorId,
    actor.display_name,
    message,
  );
}

async function existingActorId(actorId: string): Promise<string | null> {
  if (!actorId) return null;
  const row = await getDb().get<{ id: string }>('SELECT id FROM users WHERE id = ?', actorId);
  return row?.id ?? null;
}

async function getNextAutomaticBackupAt(
  frequency: 'daily' | 'weekly' | 'monthly',
): Promise<string | null> {
  const row = await getDb().get<{ created_at: string }>(
    `SELECT created_at FROM backup_history
      WHERE backup_kind = 'automatic' AND status = 'completed'
      ORDER BY datetime(created_at) DESC LIMIT 1`,
  );
  if (!row) return null;
  const latest = parseSqliteDate(row.created_at);
  if (!latest) return null;
  const next = new Date(latest);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

async function checksumFile(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const contents = await import('node:fs').then(({ createReadStream }) => createReadStream(filePath));
  await new Promise<void>((resolve, reject) => {
    contents.on('data', (chunk) => hash.update(chunk));
    contents.on('error', reject);
    contents.on('end', resolve);
  });
  return hash.digest('hex');
}

async function removeDatabaseSidecars(databasePath: string): Promise<void> {
  await Promise.all([
    rm(`${databasePath}-wal`, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
  ]);
}

function mapBackupRow(row: BackupHistoryRow): BackupFileRecord {
  return {
    id: row.id,
    file_name: row.file_name,
    file_path: row.file_path,
    backup_kind: row.backup_kind,
    status: row.status,
    size_bytes: Number(row.size_bytes),
    checksum_sha256: row.checksum_sha256,
    integrity_result: row.integrity_result,
    include_audit_logs: Boolean(row.include_audit_logs),
    actor_id: row.actor_id || '',
    actor_name: row.actor_name || 'System',
    notes: row.notes || '',
    created_at: row.created_at,
    validated_at: row.validated_at,
  };
}

function readIntegrityResult(rows: Array<Record<string, string>>): string {
  if (!rows.length) return 'No integrity result returned.';
  const values = rows.flatMap((row) => Object.values(row));
  return values.join('; ') || 'No integrity result returned.';
}

function assertSafeBackupPath(filePath: string): void {
  const resolved = path.resolve(filePath);
  if (resolved === path.resolve(getDatabasePath())) {
    throw new Error('The active payroll database cannot be deleted.');
  }
  if (!path.basename(resolved).toLowerCase().endsWith('.sqlite')) {
    throw new Error('Only managed SQLite backup files may be deleted.');
  }
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
    '-',
    String(date.getMilliseconds()).padStart(3, '0'),
  ].join('');
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 2000) : '';
}

function parseSqliteDate(value: string): Date | null {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isMissingFileError(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}
