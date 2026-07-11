import { useEffect, useState } from 'react';
import { useLicense } from '../../../license/LicenseContext';
import type { DeveloperInformation, LicenseEvent } from '../../../models/License';

export function DeveloperInformationPanel({ developer }: { developer: DeveloperInformation }) {
  const entries = [
    ['Application', developer.application_name],
    ['Version', developer.application_version],
    ['Developer', developer.developer_name],
    ['Support email', developer.support_email],
    ['Support phone', developer.support_phone || 'Not configured'],
    ['Website', developer.website],
    ['Build date', developer.build_date],
    ['Copyright', developer.copyright_notice],
  ];

  return (
    <section className="settings-panel">
      <div className="settings-panel__heading">
        <div>
          <h3>Developer information</h3>
          <p>Product ownership, support, release, and version information displayed to administrators.</p>
        </div>
      </div>
      <div className="developer-grid">
        {entries.map(([label, value]) => (
          <article className="developer-card" key={label}>
            <span>{label}</span>
            {label === 'Website' && value.startsWith('http') ? (
              <a href={value} target="_blank" rel="noreferrer">{value}</a>
            ) : label === 'Support email' && value.includes('@') ? (
              <a href={`mailto:${value}`}>{value}</a>
            ) : (
              <strong>{value || '—'}</strong>
            )}
          </article>
        ))}
      </div>
      <div className="settings-note">
        Edit <code>electron-app/main/developer-info.ts</code> before producing the final installer.
      </div>
    </section>
  );
}

export function LicenseSettingsPanel() {
  const { license, loading, error: licenseError, refresh } = useLicense();
  const [events, setEvents] = useState<LicenseEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setEvents(await window.api.license.events(30));
    } catch {
      setEvents([]);
    }
  }

  async function activate() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await window.api.license.activateFile();
      if (result.activated) {
        await refresh();
        await loadEvents();
        setMessage('License activated successfully.');
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to activate the license.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm('Remove the signed license and return to the original local trial state?')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await window.api.license.remove();
      await refresh();
      await loadEvents();
      setMessage('Signed license removed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to remove the license.');
    } finally {
      setBusy(false);
    }
  }

  async function copyId() {
    try {
      await window.api.license.copyInstallationId();
      setMessage('Installation ID copied to the clipboard.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to copy the installation ID.');
    }
  }

  async function exportDiagnostics() {
    try {
      const result = await window.api.license.exportDiagnostics();
      if (result.saved) setMessage(`License diagnostics saved to ${result.filePath}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to export license diagnostics.');
    }
  }

  if (loading) return <div className="settings-panel settings-loading">Loading license status…</div>;
  if (!license) {
    return <div className="settings-panel settings-alert settings-alert--error">{licenseError || 'License status is unavailable.'}</div>;
  }

  const statusDanger = license.status !== 'active';
  return (
    <section className="settings-panel">
      <div className="settings-panel__heading">
        <div>
          <h3>License and edition</h3>
          <p>Manage the automatic trial or activate a signed Trial, Full Perpetual, or Full Subscription license.</p>
        </div>
        <span className={statusDanger ? 'license-status-pill license-status-pill--danger' : 'license-status-pill'}>
          {license.status.replace(/_/g, ' ')}
        </span>
      </div>

      {error && <div className="settings-alert settings-alert--error">{error}</div>}
      {message && <div className="settings-alert settings-alert--success">{message}</div>}
      <div className={statusDanger ? 'settings-note settings-note--warning' : 'settings-note'}>{license.message}</div>

      <div className="license-status-grid">
        <Status label="Edition" value={formatEdition(license.edition)} />
        <Status label="Customer" value={license.customer_name || 'Automatic local trial'} />
        <Status label="Expires" value={license.expires_at ? formatDate(license.expires_at) : 'Never'} />
        <Status label="Employee usage" value={license.max_employees === null ? `${license.active_employees} / Unlimited` : `${license.active_employees} / ${license.max_employees}`} />
      </div>

      <div className="license-installation">
        <strong>Installation ID</strong>
        <code>{license.installation_id}</code>
        <small>Send this ID to the developer when requesting a machine-locked license.</small>
      </div>

      <div className="license-feature-list">
        {license.features.map((feature) => <span key={feature}>{feature.replace(/_/g, ' ')}</span>)}
      </div>

      <div className="license-actions">
        <button className="settings-button settings-button--primary" type="button" disabled={busy} onClick={() => void activate()}>
          {busy ? 'Working…' : 'Activate license file'}
        </button>
        <button className="settings-button" type="button" onClick={() => void copyId()}>Copy installation ID</button>
        <button className="settings-button" type="button" onClick={() => void exportDiagnostics()}>Export diagnostics</button>
        {license.source === 'signed_license' && (
          <button className="settings-link-button" type="button" disabled={busy} onClick={() => void remove()}>Remove signed license</button>
        )}
      </div>

      <div className="settings-panel__heading" style={{ marginTop: 24 }}>
        <div><h3>License activity</h3><p>Recent activation and validation events.</p></div>
      </div>
      {events.length === 0 ? (
        <div className="settings-empty">No license events have been recorded.</div>
      ) : (
        <div className="license-event-list">
          {events.map((event) => (
            <article key={event.id}>
              <div><strong>{event.action.replace(/_/g, ' ')}</strong><span>{event.outcome}</span></div>
              <span>{event.details}</span>
              <time>{formatDateTime(event.created_at)}</time>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return <article className="license-status-card"><span>{label}</span><strong>{value || '—'}</strong></article>;
}

function formatEdition(value: string): string {
  return value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}
