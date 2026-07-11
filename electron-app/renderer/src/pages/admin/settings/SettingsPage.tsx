import { FormEvent, useEffect, useState } from 'react';
import type { CompanyProfile } from '../../../models/Payslip';
import type {
  BackupPolicy,
  PayrollDefaults,
  SettingsAuditLog,
  SettingsBundle,
  SystemInformation,
} from '../../../models/Settings';

type SettingsTab = 'company' | 'payroll' | 'backup' | 'system';

export default function SettingsPage() {
  const [bundle, setBundle] = useState<SettingsBundle | null>(null);
  const [tab, setTab] = useState<SettingsTab>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setBundle(await window.api.settings.get());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load settings.');
    } finally {
      setLoading(false);
    }
  }

  function updateCompany<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setBundle((current) => current
      ? { ...current, company: { ...current.company, [key]: value } }
      : current);
  }

  function updatePayroll<K extends keyof PayrollDefaults>(key: K, value: PayrollDefaults[K]) {
    setBundle((current) => current
      ? { ...current, payroll: { ...current.payroll, [key]: value } }
      : current);
  }

  function updateBackup<K extends keyof BackupPolicy>(key: K, value: BackupPolicy[K]) {
    setBundle((current) => current
      ? { ...current, backup: { ...current.backup, [key]: value } }
      : current);
  }

  async function saveCompany(event: FormEvent) {
    event.preventDefault();
    if (!bundle) return;
    await save(async () => {
      const company = await window.api.settings.updateCompany(bundle.company);
      return { ...bundle, company };
    }, 'Company profile saved.');
  }

  async function chooseLogo() {
    setError('');
    try {
      const selection = await window.api.companyProfile.chooseLogo();
      if (selection.selected && selection.dataUrl) {
        updateCompany('logo_data_url', selection.dataUrl);
        setMessage(`${selection.fileName || 'Logo'} selected. Save the company profile to keep it.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to select a company logo.');
    }
  }

  async function savePayroll(event: FormEvent) {
    event.preventDefault();
    if (!bundle) return;
    await save(async () => {
      const payroll = await window.api.settings.updatePayroll(bundle.payroll);
      return { ...bundle, payroll };
    }, 'Payroll defaults saved. New payroll periods will use these values.');
  }

  async function chooseBackupDirectory() {
    setError('');
    try {
      const selection = await window.api.settings.chooseBackupDirectory();
      if (selection.selected && selection.path) updateBackup('backup_directory', selection.path);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to choose a backup directory.');
    }
  }

  async function saveBackup(event: FormEvent) {
    event.preventDefault();
    if (!bundle) return;
    await save(async () => {
      const backup = await window.api.settings.updateBackup(bundle.backup);
      return { ...bundle, backup };
    }, 'Backup and retention policy saved.');
  }

  async function save(action: () => Promise<SettingsBundle>, successMessage: string) {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await action();
      const refreshed = await window.api.settings.get();
      setBundle({ ...refreshed, ...updated, audit: refreshed.audit });
      setMessage(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="settings-loading">Loading settings…</div>;

  return (
    <section className="settings-page">
      <div className="settings-heading">
        <div>
          <span>System configuration</span>
          <h2>Settings and Company Configuration</h2>
          <p>Manage company branding, payroll defaults, backup policy, and local system information.</p>
        </div>
      </div>

      {error && <div className="settings-alert settings-alert--error">{error}</div>}
      {message && <div className="settings-alert settings-alert--success">{message}</div>}

      <nav className="settings-tabs" aria-label="Settings sections">
        <TabButton active={tab === 'company'} onClick={() => setTab('company')}>Company</TabButton>
        <TabButton active={tab === 'payroll'} onClick={() => setTab('payroll')}>Payroll Defaults</TabButton>
        <TabButton active={tab === 'backup'} onClick={() => setTab('backup')}>Backup Policy</TabButton>
        <TabButton active={tab === 'system'} onClick={() => setTab('system')}>System</TabButton>
      </nav>

      {!bundle ? (
        <div className="settings-panel settings-empty">Settings could not be loaded.</div>
      ) : (
        <>
          {tab === 'company' && (
            <CompanySettings
              company={bundle.company}
              saving={saving}
              onUpdate={updateCompany}
              onChooseLogo={() => void chooseLogo()}
              onSubmit={saveCompany}
            />
          )}
          {tab === 'payroll' && (
            <PayrollSettings
              payroll={bundle.payroll}
              saving={saving}
              onUpdate={updatePayroll}
              onSubmit={savePayroll}
            />
          )}
          {tab === 'backup' && (
            <BackupSettings
              backup={bundle.backup}
              saving={saving}
              onUpdate={updateBackup}
              onChooseDirectory={() => void chooseBackupDirectory()}
              onSubmit={saveBackup}
            />
          )}
          {tab === 'system' && (
            <SystemSettings system={bundle.system} audit={bundle.audit} />
          )}
        </>
      )}
    </section>
  );
}

function CompanySettings({
  company,
  saving,
  onUpdate,
  onChooseLogo,
  onSubmit,
}: {
  company: CompanyProfile;
  saving: boolean;
  onUpdate: <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => void;
  onChooseLogo: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="settings-panel" onSubmit={onSubmit}>
      <PanelHeading title="Company profile" description="Used on generated payslips and branded payroll documents." />
      <div className="settings-logo-row">
        <div className="settings-logo-preview">
          {company.logo_data_url ? <img src={company.logo_data_url} alt="Company logo" /> : <span>PP</span>}
        </div>
        <div>
          <button className="settings-button" type="button" onClick={onChooseLogo}>Choose logo</button>
          {company.logo_data_url && (
            <button className="settings-link-button" type="button" onClick={() => onUpdate('logo_data_url', '')}>Remove logo</button>
          )}
          <small>PNG, JPEG, or WebP. Maximum 3 MB.</small>
        </div>
      </div>
      <div className="settings-form-grid">
        <label className="settings-field--wide">Company name *<input value={company.company_name} onChange={(event) => onUpdate('company_name', event.target.value)} required /></label>
        <label className="settings-field--wide">Address<textarea rows={3} value={company.address} onChange={(event) => onUpdate('address', event.target.value)} /></label>
        <label>Contact email<input type="email" value={company.contact_email} onChange={(event) => onUpdate('contact_email', event.target.value)} /></label>
        <label>Contact phone<input value={company.contact_phone} onChange={(event) => onUpdate('contact_phone', event.target.value)} /></label>
        <label>Tax identification number<input value={company.tax_id} onChange={(event) => onUpdate('tax_id', event.target.value)} /></label>
        <label className="settings-field--wide">Payslip footer<textarea rows={3} value={company.payslip_footer} onChange={(event) => onUpdate('payslip_footer', event.target.value)} /></label>
      </div>
      <SaveBar saving={saving} label="Save company profile" />
    </form>
  );
}

function PayrollSettings({
  payroll,
  saving,
  onUpdate,
  onSubmit,
}: {
  payroll: PayrollDefaults;
  saving: boolean;
  onUpdate: <K extends keyof PayrollDefaults>(key: K, value: PayrollDefaults[K]) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="settings-panel" onSubmit={onSubmit}>
      <PanelHeading title="Payroll defaults" description="Applied automatically when a new payroll period is created. Existing periods keep their saved assumptions." />
      <div className="settings-form-grid">
        <label>Default frequency<select value={payroll.default_frequency} onChange={(event) => onUpdate('default_frequency', event.target.value as PayrollDefaults['default_frequency'])}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="semimonthly">Semimonthly</option><option value="monthly">Monthly</option></select></label>
        <label>Workdays per month<input type="number" min="1" max="31" step="0.01" value={payroll.workdays_per_month} onChange={(event) => onUpdate('workdays_per_month', Number(event.target.value))} required /></label>
        <label>Hours per day<input type="number" min="0.5" max="24" step="0.01" value={payroll.hours_per_day} onChange={(event) => onUpdate('hours_per_day', Number(event.target.value))} required /></label>
        <label>Overtime multiplier<input type="number" min="1" max="10" step="0.01" value={payroll.overtime_multiplier} onChange={(event) => onUpdate('overtime_multiplier', Number(event.target.value))} required /></label>
        <label>Night differential rate<input type="number" min="0" max="1" step="0.01" value={payroll.night_differential_rate} onChange={(event) => onUpdate('night_differential_rate', Number(event.target.value))} required /><small>Example: 0.10 means 10%.</small></label>
        <label>Payment delay (days)<input type="number" min="0" max="31" step="1" value={payroll.payment_delay_days} onChange={(event) => onUpdate('payment_delay_days', Number(event.target.value))} required /><small>Days after the cutoff end date.</small></label>
      </div>
      <div className="settings-note"><strong>Calculation safety:</strong> Payroll periods store a copy of these values. Changing defaults will not silently recalculate finalized or historical payroll.</div>
      <SaveBar saving={saving} label="Save payroll defaults" />
    </form>
  );
}

function BackupSettings({
  backup,
  saving,
  onUpdate,
  onChooseDirectory,
  onSubmit,
}: {
  backup: BackupPolicy;
  saving: boolean;
  onUpdate: <K extends keyof BackupPolicy>(key: K, value: BackupPolicy[K]) => void;
  onChooseDirectory: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form className="settings-panel" onSubmit={onSubmit}>
      <PanelHeading title="Backup and retention policy" description="Stores the policy that the Backup and Restore module will use." />
      <div className="settings-form-grid">
        <label className="settings-field--wide">Backup directory<div className="settings-path-field"><input value={backup.backup_directory} onChange={(event) => onUpdate('backup_directory', event.target.value)} placeholder="Choose a folder on this computer or external drive" /><button className="settings-button" type="button" onClick={onChooseDirectory}>Browse</button></div></label>
        <label>Backup frequency<select value={backup.backup_frequency} onChange={(event) => onUpdate('backup_frequency', event.target.value as BackupPolicy['backup_frequency'])}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
        <label>Backups to retain<input type="number" min="1" max="100" step="1" value={backup.retention_count} onChange={(event) => onUpdate('retention_count', Number(event.target.value))} required /></label>
        <label className="settings-checkbox"><input type="checkbox" checked={backup.auto_backup_enabled} onChange={(event) => onUpdate('auto_backup_enabled', event.target.checked)} /><span><strong>Enable automatic backups</strong><small>Requires a valid backup directory.</small></span></label>
        <label className="settings-checkbox"><input type="checkbox" checked={backup.include_audit_logs} onChange={(event) => onUpdate('include_audit_logs', event.target.checked)} /><span><strong>Include audit logs</strong><small>Keep security and settings history with backup metadata.</small></span></label>
      </div>
      <div className="settings-note settings-note--warning"><strong>Configuration only:</strong> This page saves the backup policy. Actual backup creation and restoration will be added in the next system phase.</div>
      <SaveBar saving={saving} label="Save backup policy" />
    </form>
  );
}

function SystemSettings({ system, audit }: { system: SystemInformation; audit: SettingsAuditLog[] }) {
  return (
    <div className="settings-system-grid">
      <section className="settings-panel">
        <PanelHeading title="Local system information" description="Runtime and database details for support and troubleshooting." />
        <div className="settings-stat-grid">
          <Stat label="App version" value={system.application_version} />
          <Stat label="Electron" value={system.electron_version} />
          <Stat label="Node.js" value={system.node_version} />
          <Stat label="Database size" value={formatBytes(system.database_size_bytes)} />
          <Stat label="Active employees" value={String(system.active_employees)} />
          <Stat label="Active users" value={String(system.active_users)} />
          <Stat label="Payroll periods" value={String(system.payroll_periods)} />
          <Stat label="Payslips" value={String(system.payslips)} />
        </div>
        <div className="settings-database-path"><span>Database file</span><code>{system.database_path}</code></div>
      </section>

      <section className="settings-panel">
        <PanelHeading title="Settings change history" description="Recent company, payroll-default, and backup-policy changes." />
        {audit.length === 0 ? <div className="settings-empty">No settings changes have been recorded.</div> : (
          <div className="settings-audit-list">
            {audit.map((entry) => (
              <article key={entry.id}>
                <div><strong>{title(entry.category)} settings</strong><span>{entry.actor_name}</span></div>
                <p>{describeChanges(entry.changes)}</p>
                <time>{formatDateTime(entry.created_at)}</time>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PanelHeading({ title, description }: { title: string; description: string }) {
  return <div className="settings-panel__heading"><div><h3>{title}</h3><p>{description}</p></div></div>;
}

function TabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return <button type="button" className={active ? 'settings-tab settings-tab--active' : 'settings-tab'} onClick={onClick}>{children}</button>;
}

function SaveBar({ saving, label }: { saving: boolean; label: string }) {
  return <div className="settings-save-bar"><button className="settings-button settings-button--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : label}</button></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <article className="settings-stat"><span>{label}</span><strong>{value || '—'}</strong></article>;
}

function describeChanges(changes: Record<string, unknown>): string {
  const keys = Object.keys(changes).map((key) => key.replace(/_/g, ' '));
  return keys.length ? `Updated ${keys.join(', ')}.` : 'Settings updated.';
}

function formatBytes(value: number): string {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function title(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
