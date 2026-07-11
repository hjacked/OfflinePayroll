import { useEffect, useMemo, useState } from 'react';
import type {
  AuditFilters,
  AuditListResult,
  AuditLogEntry,
  AuditOutcome,
  AuditSource,
} from '../../../models/Audit';

const PAGE_SIZE = 50;

const initialFilters: AuditFilters = {
  search: '',
  source: 'all',
  module: 'all',
  outcome: 'all',
  date_from: '',
  date_to: '',
  page: 1,
  page_size: PAGE_SIZE,
};

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditFilters>(initialFilters);
  const [result, setResult] = useState<AuditListResult | null>(null);
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), filters.search ? 250 : 0);
    return () => window.clearTimeout(handle);
  }, [
    filters.search,
    filters.source,
    filters.module,
    filters.outcome,
    filters.date_from,
    filters.date_to,
    filters.page,
  ]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setResult(await window.api.audit.list(filters));
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to load audit logs.'));
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? Number(value) : 1 }));
  }

  async function openDetails(entry: AuditLogEntry) {
    setError('');
    try {
      setSelected(await window.api.audit.get(entry.id));
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to load the audit-log details.'));
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError('');
    setMessage('');
    try {
      const response = await window.api.audit.exportCsv({ ...filters, page: 1 });
      if (response.saved) setMessage(`Audit logs exported to ${response.filePath ?? 'the selected file'}.`);
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to export audit logs.'));
    } finally {
      setExporting(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));
  const currentPage = Number(filters.page ?? 1);
  const metadata = useMemo(() => parseMetadata(selected?.metadata_json), [selected]);

  return (
    <section className="audit-page">
      <header className="audit-heading">
        <div>
          <span>Security and accountability</span>
          <h2>Centralized Audit Logs</h2>
          <p>Review authentication, payroll, employee, settings, backup, payslip, and system activity.</p>
        </div>
        <div className="audit-heading__actions">
          <button className="audit-button" type="button" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="audit-button audit-button--primary" type="button" onClick={() => void exportCsv()} disabled={exporting || !result?.total}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </header>

      {error && <div className="audit-alert audit-alert--error">{error}</div>}
      {message && <div className="audit-alert audit-alert--success">{message}</div>}

      <div className="audit-stat-grid">
        <Stat label="Matching events" value={formatNumber(result?.summary.total ?? 0)} />
        <Stat label="Last 24 hours" value={formatNumber(result?.summary.last_24_hours ?? 0)} />
        <Stat label="Failures in 7 days" value={formatNumber(result?.summary.failures_last_7_days ?? 0)} tone={(result?.summary.failures_last_7_days ?? 0) > 0 ? 'danger' : 'normal'} />
        <Stat label="Active actors in 30 days" value={formatNumber(result?.summary.active_actors_last_30_days ?? 0)} />
      </div>

      <section className="audit-panel audit-filters" aria-label="Audit filters">
        <label>
          Search
          <input
            type="search"
            value={filters.search ?? ''}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Action, actor, channel, entity, or summary"
          />
        </label>
        <label>
          Source
          <select value={filters.source ?? 'all'} onChange={(event) => updateFilter('source', event.target.value as AuditSource | 'all')}>
            <option value="all">All sources</option>
            {(result?.options.sources ?? []).map((source) => <option key={source} value={source}>{title(source)}</option>)}
          </select>
        </label>
        <label>
          Module
          <select value={filters.module ?? 'all'} onChange={(event) => updateFilter('module', event.target.value)}>
            <option value="all">All modules</option>
            {(result?.options.modules ?? []).map((module) => <option key={module} value={module}>{title(module)}</option>)}
          </select>
        </label>
        <label>
          Outcome
          <select value={filters.outcome ?? 'all'} onChange={(event) => updateFilter('outcome', event.target.value as AuditOutcome | 'all')}>
            <option value="all">All outcomes</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="info">Information</option>
          </select>
        </label>
        <label>
          From
          <input type="date" value={filters.date_from ?? ''} onChange={(event) => updateFilter('date_from', event.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={filters.date_to ?? ''} onChange={(event) => updateFilter('date_to', event.target.value)} />
        </label>
        <button className="audit-button audit-button--quiet" type="button" onClick={() => setFilters(initialFilters)}>
          Clear filters
        </button>
      </section>

      <div className="audit-content-grid">
        <section className="audit-panel audit-table-panel">
          <div className="audit-panel__heading">
            <div>
              <h3>Activity history</h3>
              <p>{result ? `${formatNumber(result.total)} event(s) match the current filters.` : 'Loading activity history.'}</p>
            </div>
          </div>

          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Module</th>
                  <th>Action</th>
                  <th>Outcome</th>
                  <th>Summary</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {!loading && (result?.data.length ?? 0) === 0 && (
                  <tr><td colSpan={7}><div className="audit-empty">No audit events match the selected filters.</div></td></tr>
                )}
                {loading && (
                  <tr><td colSpan={7}><div className="audit-empty">Loading audit events…</div></td></tr>
                )}
                {!loading && result?.data.map((entry) => (
                  <tr key={entry.id}>
                    <td><time dateTime={entry.created_at}>{formatDateTime(entry.created_at)}</time><small>{title(entry.source)}</small></td>
                    <td><strong>{entry.display_name || entry.username || 'System'}</strong><small>{entry.role ? title(entry.role) : 'Automated action'}</small></td>
                    <td><span className="audit-module">{title(entry.module)}</span></td>
                    <td><code>{entry.action}</code></td>
                    <td><OutcomeBadge outcome={entry.outcome} /></td>
                    <td className="audit-summary-cell">{entry.summary}</td>
                    <td><button className="audit-link-button" type="button" onClick={() => void openDetails(entry)}>Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="audit-pagination">
            <span>Page {currentPage} of {pageCount}</span>
            <div>
              <button className="audit-button" type="button" disabled={currentPage <= 1 || loading} onClick={() => updateFilter('page', currentPage - 1)}>Previous</button>
              <button className="audit-button" type="button" disabled={currentPage >= pageCount || loading} onClick={() => updateFilter('page', currentPage + 1)}>Next</button>
            </div>
          </footer>
        </section>

        <aside className="audit-panel audit-breakdown">
          <div className="audit-panel__heading"><div><h3>Module activity</h3><p>Most active areas across all recorded sources.</p></div></div>
          <div className="audit-breakdown-list">
            {(result?.summary.module_counts ?? []).map((item) => (
              <button key={item.module} type="button" onClick={() => updateFilter('module', item.module)}>
                <span>{title(item.module)}</span><strong>{formatNumber(item.count)}</strong>
              </button>
            ))}
            {(result?.summary.module_counts.length ?? 0) === 0 && <div className="audit-empty">No module activity is available.</div>}
          </div>
        </aside>
      </div>

      {selected && (
        <div className="audit-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <section className="audit-modal" role="dialog" aria-modal="true" aria-labelledby="audit-details-title" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><span>{title(selected.source)} event</span><h3 id="audit-details-title">{title(selected.action)}</h3></div>
              <button type="button" className="audit-modal__close" onClick={() => setSelected(null)} aria-label="Close audit details">×</button>
            </header>
            <div className="audit-detail-grid">
              <Detail label="Timestamp" value={formatDateTime(selected.created_at)} />
              <Detail label="Outcome" value={title(selected.outcome)} />
              <Detail label="Actor" value={selected.display_name || selected.username || 'System'} />
              <Detail label="Role" value={selected.role ? title(selected.role) : 'Automated action'} />
              <Detail label="Module" value={title(selected.module)} />
              <Detail label="Channel" value={selected.channel || 'Not applicable'} mono />
              <Detail label="Entity type" value={selected.entity_type ? title(selected.entity_type) : 'Not specified'} />
              <Detail label="Entity ID" value={selected.entity_id || 'Not specified'} mono />
              <Detail label="Origin" value={selected.origin || 'Local application'} mono wide />
              <Detail label="Summary" value={selected.summary} wide />
            </div>
            <div className="audit-metadata">
              <h4>Recorded metadata</h4>
              {Object.keys(metadata).length > 0 ? <pre>{JSON.stringify(metadata, null, 2)}</pre> : <p>No additional metadata was recorded.</p>}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'danger' }) {
  return <article className={`audit-stat${tone === 'danger' ? ' audit-stat--danger' : ''}`}><span>{label}</span><strong>{value}</strong></article>;
}

function OutcomeBadge({ outcome }: { outcome: AuditOutcome }) {
  return <span className={`audit-outcome audit-outcome--${outcome}`}>{title(outcome)}</span>;
}

function Detail({ label, value, mono = false, wide = false }: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return <div className={`${wide ? 'audit-detail--wide' : ''}`}><span>{label}</span><strong className={mono ? 'audit-mono' : ''}>{value}</strong></div>;
}

function parseMetadata(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return { raw: value };
  }
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatDateTime(value: string): string {
  const normalized = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function title(value: string): string {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
