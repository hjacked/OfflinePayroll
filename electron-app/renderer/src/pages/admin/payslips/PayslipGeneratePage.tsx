import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  CompanyProfile,
  PayslipGenerationResult,
  PayslipOptions,
} from '../../../models/Payslip';
import { formatDate } from './payslip-utils';

const blankProfile: CompanyProfile = {
  id: 'default',
  company_name: 'PayPayroll Offline',
  address: '',
  contact_email: '',
  contact_phone: '',
  tax_id: '',
  logo_data_url: '',
  payslip_footer: '',
  updated_at: '',
};

export default function PayslipGeneratePage() {
  const [options, setOptions] = useState<PayslipOptions>({ periods: [], employees: [] });
  const [profile, setProfile] = useState<CompanyProfile>(blankProfile);
  const [periodId, setPeriodId] = useState('');
  const [actor, setActor] = useState('Payroll Administrator');
  const [force, setForce] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<PayslipGenerationResult | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [optionResult, companyResult] = await Promise.all([
          window.api.payslip.options(),
          window.api.companyProfile.get(),
        ]);
        setOptions(optionResult);
        setProfile(companyResult);
        if (optionResult.periods[0]) setPeriodId(optionResult.periods[0].id);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load payslip setup.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedPeriod = useMemo(
    () => options.periods.find((period) => period.id === periodId),
    [options.periods, periodId],
  );

  async function saveCompany(event: FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setError('');
    setMessage('');
    try {
      const updated = await window.api.companyProfile.update(profile);
      setProfile(updated);
      setMessage('Company payslip profile saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save company profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function chooseLogo() {
    setError('');
    try {
      const selection = await window.api.companyProfile.chooseLogo();
      if (selection.selected && selection.dataUrl) {
        setProfile((current) => ({ ...current, logo_data_url: selection.dataUrl || '' }));
        setMessage(`${selection.fileName || 'Logo'} selected. Save the company profile to keep it.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to select a company logo.');
    }
  }

  async function generate() {
    if (!periodId) {
      setError('Select a finalized or locked payroll period.');
      return;
    }
    setGenerating(true);
    setError('');
    setMessage('');
    try {
      const generated = await window.api.payslip.generate({
        period_id: periodId,
        actor,
        force,
      });
      setResult(generated);
      setMessage(
        `Generation complete: ${generated.created} created, ${generated.updated} updated, and ${generated.skipped} skipped.`,
      );
      const refreshed = await window.api.payslip.options();
      setOptions(refreshed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to generate payslips.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <section className="payslip-page"><div className="payslip-empty">Loading payslip setup…</div></section>;
  }

  return (
    <section className="payslip-page">
      <div className="payslip-heading">
        <div>
          <span>Payroll documents</span>
          <h1>Generate Payslips</h1>
          <p>Create frozen payslip snapshots from finalized or locked payroll results.</p>
        </div>
        <Link className="payslip-button payslip-button--secondary" to="/admin/payslips">
          Back to payslips
        </Link>
      </div>

      {error && <div className="payslip-alert payslip-alert--error">{error}</div>}
      {message && <div className="payslip-alert payslip-alert--success">{message}</div>}

      <div className="payslip-setup-grid">
        <form className="payslip-panel payslip-company-form" onSubmit={saveCompany}>
          <div className="payslip-panel__header">
            <div>
              <h2>Company payslip profile</h2>
              <p>This information is copied into every generated payslip snapshot.</p>
            </div>
          </div>

          <div className="payslip-logo-editor">
            <div className="payslip-logo-preview">
              {profile.logo_data_url ? (
                <img src={profile.logo_data_url} alt="Company logo preview" />
              ) : (
                <span>PP</span>
              )}
            </div>
            <div>
              <button type="button" className="payslip-button payslip-button--secondary" onClick={() => void chooseLogo()}>
                Choose logo
              </button>
              {profile.logo_data_url && (
                <button
                  type="button"
                  className="payslip-link-button payslip-link-button--danger"
                  onClick={() => setProfile((current) => ({ ...current, logo_data_url: '' }))}
                >
                  Remove logo
                </button>
              )}
              <small>PNG, JPEG, or WebP. Maximum 3 MB.</small>
            </div>
          </div>

          <div className="payslip-form-grid">
            <label className="payslip-field payslip-field--wide">
              <span>Company name *</span>
              <input
                required
                value={profile.company_name}
                onChange={(event) => setProfile((current) => ({ ...current, company_name: event.target.value }))}
              />
            </label>
            <label className="payslip-field payslip-field--wide">
              <span>Address</span>
              <textarea
                rows={2}
                value={profile.address}
                onChange={(event) => setProfile((current) => ({ ...current, address: event.target.value }))}
              />
            </label>
            <label className="payslip-field">
              <span>Contact email</span>
              <input
                type="email"
                value={profile.contact_email}
                onChange={(event) => setProfile((current) => ({ ...current, contact_email: event.target.value }))}
              />
            </label>
            <label className="payslip-field">
              <span>Contact phone</span>
              <input
                value={profile.contact_phone}
                onChange={(event) => setProfile((current) => ({ ...current, contact_phone: event.target.value }))}
              />
            </label>
            <label className="payslip-field">
              <span>Tax ID / TIN</span>
              <input
                value={profile.tax_id}
                onChange={(event) => setProfile((current) => ({ ...current, tax_id: event.target.value }))}
              />
            </label>
            <label className="payslip-field payslip-field--wide">
              <span>Footer note</span>
              <textarea
                rows={3}
                value={profile.payslip_footer}
                onChange={(event) => setProfile((current) => ({ ...current, payslip_footer: event.target.value }))}
              />
            </label>
          </div>
          <button type="submit" className="payslip-button" disabled={savingProfile}>
            {savingProfile ? 'Saving…' : 'Save company profile'}
          </button>
        </form>

        <div className="payslip-panel payslip-generation-card">
          <div className="payslip-panel__header">
            <div>
              <h2>Generation batch</h2>
              <p>Only finalized and locked payroll periods are eligible.</p>
            </div>
          </div>

          <label className="payslip-field">
            <span>Payroll period</span>
            <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
              <option value="">Select a period</option>
              {options.periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name} — {period.result_count} employees
                </option>
              ))}
            </select>
          </label>

          {selectedPeriod && (
            <div className="payslip-period-card">
              <strong>{selectedPeriod.name}</strong>
              <span>{formatDate(selectedPeriod.start_date)} – {formatDate(selectedPeriod.end_date)}</span>
              <dl>
                <div><dt>Payment date</dt><dd>{formatDate(selectedPeriod.payment_date)}</dd></div>
                <div><dt>Payroll results</dt><dd>{selectedPeriod.result_count}</dd></div>
                <div><dt>Existing payslips</dt><dd>{selectedPeriod.payslip_count}</dd></div>
                <div><dt>Published</dt><dd>{selectedPeriod.published_count}</dd></div>
              </dl>
            </div>
          )}

          <label className="payslip-field">
            <span>Generated by</span>
            <input value={actor} onChange={(event) => setActor(event.target.value)} />
          </label>

          <label className="payslip-checkbox">
            <input type="checkbox" checked={force} onChange={(event) => setForce(event.target.checked)} />
            <span>
              Regenerate existing snapshots
              <small>Published payslips are skipped unless this option is selected.</small>
            </span>
          </label>

          <button type="button" className="payslip-button payslip-button--full" disabled={generating || !periodId} onClick={() => void generate()}>
            {generating ? 'Generating…' : 'Generate batch'}
          </button>

          {result && (
            <div className="payslip-generation-result">
              <strong>{result.total} payslip records now exist for this period.</strong>
              <div>
                <span>Created <b>{result.created}</b></span>
                <span>Updated <b>{result.updated}</b></span>
                <span>Skipped <b>{result.skipped}</b></span>
              </div>
              <Link to={`/admin/payslips?period=${periodId}`}>Review generated payslips</Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
