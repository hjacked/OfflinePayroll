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

export interface AuditExportResult {
  saved: boolean;
  filePath?: string;
}
