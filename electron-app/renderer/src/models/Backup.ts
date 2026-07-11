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

export interface BackupFileSelection {
  selected: boolean;
  path?: string;
}
