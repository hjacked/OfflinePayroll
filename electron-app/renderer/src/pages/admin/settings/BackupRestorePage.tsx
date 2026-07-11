import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/AuthContext';
import type {
  BackupFileRecord,
  BackupOverview,
  IntegrityResult,
} from '../../../models/Backup';

export default function BackupRestorePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [currentIntegrity, setCurrentIntegrity] = useState<IntegrityResult | null>(null);
  const [externalPath, setExternalPath] = useState('');
  const [externalIntegrity, setExternalIntegrity] = useState<IntegrityResult | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setError('');
    try {
      setOverview(await window.api.backup.overview());
    } catch (caught) {
      setError(errorMessage(caught, 'Unable to load backup information.'));
    }
  }

  async function createBackup() {
    await run('create', async () => {
      const result = await window.api.backup.create(notes);
      setNotes('');
      setMessage(
        result.removed_by_retention > 0
          ? `Backup created. ${result.removed_by_retention} old backup file(s) were removed by the retention policy.`
          : 'Backup created and validated successfully.',
      );
      await load();
    });
  }

  async function checkCurrentIntegrity() {
    await run('integrity', async () => {
      const result = await window.api.backup.integrity();
      setCurrentIntegrity(result);
      setMessage(result.ok ? 'The active payroll database passed the integrity check.' : result.result);
    });
  }

  async function validateBackup(backup: BackupFileRecord) {
    await run(`validate:${backup.id}`, async () => {
      const result = await window.api.backup.validate(backup.id);
      setMessage(result.ok ? `${backup.file_name} passed validation.` : result.result);
      await load();
    });
  }

  async function chooseRestoreFile() {
    await run('choose', async () => {
      const selection = await window.api.backup.chooseRestoreFile();
      if (!selection.selected || !selection.path) return;
      setExternalPath(selection.path);
      const validation = await window.api.backup.validateExternal(selection.path);
      setExternalIntegrity(validation);
      setMessage(validation.ok ? 'The selected backup passed validation.' : validation.result);
    });
  }

  async function restoreFrom(filePath: string) {
    if (!filePath) return;
    await run('restore', async () => {
      const result = await window.api.backup.restore(filePath, notes);
      if (!result.restored) return;
      setMessage(result.message);
      await logout();
      navigate('/login', { replace: true });
    });
  }

  async function deleteBackupFile(backup: BackupFileRecord) {
    const confirmed = window.confirm(
      `Delete ${backup.file_name}? This removes the backup file from disk and cannot be undone.`,
    );
    if (!confirmed) return;
    await run(`delete:${backup.id}`, async () => {
      await window.api.backup.delete(backup.id);
      setMessage('Backup file deleted.');
      await load();
    });
  }

  async function reveal(filePath: string) {
    await run('reveal', async () => {
      await window.api.backup.reveal(filePath);
    });
  }

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught, 'The backup operation failed.'));
    } finally {
      setBusy('');
    }
  }

  const completedBackups = useMemo(
    () => overview?.backups.filter((item) => item.status === 'completed') ?? [],
    [overview],
  );

  return (
    <section className="backup-page">
      <header className="backup-heading">
        <div>
          <span>Data protection</span>
          <h2>Backup and Restore</h2>
          <p>Create validated SQLite backups, restore safely, and review backup history.</p>
        </div>
        <Link className="backup-button" to="/admin/settings">Back to Settings</Link>
      </header>

      {error && <div className="backup-alert backup-alert--error">{error}</div>}
      {message && <div className="backup-alert backup-alert--success">{message}</div>}

      <div className="backup-stat-grid">
        <Stat label="Backup directory" value={overview?.directory || 'Not configured'} />
        <Stat label="Stored backups" value={String(completedBackups.length)} />
        <Stat label="Total backup size" value={formatBytes(overview?.total_size_bytes ?? 0)} />
        <Stat
          label="Automatic backup"
          value={overview?.auto_backup_enabled ? title(overview.backup_frequency) : 'Disabled'}
        />
      </div>

      <div className="backup-grid">
        <section className="backup-panel">
          <PanelHeading
            title="Create a backup"
            description="Creates a consistent copy of the active database and validates it before adding it to history."
          />
          <label className="backup-field">
            Optional note
            <textarea
              rows={3}
              value={notes}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Example: Before monthly payroll processing"
            />
          </label>
          <div className="backup-actions">
            <button
              className="backup-button backup-button--primary"
              type="button"
              disabled={Boolean(busy) || !overview?.directory}
              onClick={() => void createBackup()}
            >
              {busy === 'create' ? 'Creating…' : 'Create backup now'}
            </button>
            <button
              className="backup-button"
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void checkCurrentIntegrity()}
            >
              {busy === 'integrity' ? 'Checking…' : 'Check current database'}
            </button>
          </div>
          {!overview?.directory && (
            <p className="backup-note backup-note--warning">
              Choose and save a backup directory under Settings → Backup Policy first.
            </p>
          )}
          {currentIntegrity && <IntegrityCard result={currentIntegrity} />}
        </section>

        <section className="backup-panel">
          <PanelHeading
            title="Restore from a backup"
            description="The selected file is validated first. A safety backup is created before replacement."
          />
          <div className="backup-path-box">
            <span>Selected file</span>
            <code>{externalPath || 'No external backup selected'}</code>
          </div>
          <div className="backup-actions">
            <button
              className="backup-button"
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void chooseRestoreFile()}
            >
              {busy === 'choose' ? 'Checking…' : 'Choose backup file'}
            </button>
            <button
              className="backup-button backup-button--danger"
              type="button"
              disabled={Boolean(busy) || !externalIntegrity?.ok}
              onClick={() => void restoreFrom(externalPath)}
            >
              {busy === 'restore' ? 'Restoring…' : 'Restore selected file'}
            </button>
          </div>
          {externalIntegrity && <IntegrityCard result={externalIntegrity} />}
          <p className="backup-note backup-note--warning">
            Restore replaces the current database. You will be signed out after a successful restore.
          </p>
        </section>
      </div>

      <section className="backup-panel">
        <PanelHeading
          title="Backup history"
          description={`Retention keeps the newest ${overview?.retention_count ?? 'configured'} manual and automatic backups.`}
        />
        {!overview ? (
          <div className="backup-empty">Loading backup history…</div>
        ) : overview.backups.length === 0 ? (
          <div className="backup-empty">No backups have been created yet.</div>
        ) : (
          <div className="backup-table-wrap">
            <table className="backup-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>File</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Size</th>
                  <th>Integrity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {overview.backups.map((backup) => (
                  <tr key={backup.id}>
                    <td>{formatDateTime(backup.created_at)}</td>
                    <td>
                      <strong>{backup.file_name}</strong>
                      <small>{backup.actor_name}</small>
                    </td>
                    <td>{title(backup.backup_kind)}</td>
                    <td><Status value={backup.status} /></td>
                    <td>{formatBytes(backup.size_bytes)}</td>
                    <td>{backup.integrity_result || 'Not checked'}</td>
                    <td>
                      <div className="backup-row-actions">
                        {backup.status === 'completed' && (
                          <>
                            <button type="button" onClick={() => void validateBackup(backup)}>Validate</button>
                            <button type="button" onClick={() => void reveal(backup.file_path)}>Show file</button>
                            <button type="button" onClick={() => void restoreFrom(backup.file_path)}>Restore</button>
                            <button className="backup-row-action--danger" type="button" onClick={() => void deleteBackupFile(backup)}>Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="backup-panel">
        <PanelHeading
          title="Restore history"
          description="Successful and failed database replacement attempts are recorded here."
        />
        {!overview?.restores.length ? (
          <div className="backup-empty">No restore operations have been recorded.</div>
        ) : (
          <div className="backup-restore-list">
            {overview.restores.map((restore) => (
              <article key={restore.id}>
                <div>
                  <strong>{restore.status === 'completed' ? 'Restore completed' : 'Restore failed'}</strong>
                  <span>{restore.actor_name}</span>
                </div>
                <p>{restore.message || restore.source_path}</p>
                <time>{formatDateTime(restore.created_at)}</time>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function PanelHeading({ title, description }: { title: string; description: string }) {
  return <div className="backup-panel__heading"><h3>{title}</h3><p>{description}</p></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <article className="backup-stat"><span>{label}</span><strong>{value}</strong></article>;
}

function IntegrityCard({ result }: { result: IntegrityResult }) {
  return (
    <div className={result.ok ? 'backup-integrity backup-integrity--ok' : 'backup-integrity backup-integrity--bad'}>
      <strong>{result.ok ? 'Integrity check passed' : 'Integrity check failed'}</strong>
      <span>{result.result}</span>
      <small>{formatBytes(result.size_bytes)} · SHA-256 {result.checksum_sha256.slice(0, 16)}…</small>
    </div>
  );
}

function Status({ value }: { value: string }) {
  return <span className={`backup-status backup-status--${value}`}>{title(value)}</span>;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function title(value: string): string {
  return value
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateTime(value: string): string {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatBytes(value: number): string {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}
