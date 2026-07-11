import { type FormEvent, useEffect, useState } from 'react';
import type { SelfServiceProfile } from '../../../models/SelfService';

export default function EmployeeProfilePage() {
  const [profile, setProfile] = useState<SelfServiceProfile | null>(null);
  const [form, setForm] = useState({ phone: '', address: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void window.api.selfService.profile().then((result) => {
      setProfile(result);
      setForm({ phone: result.employee.phone || '', address: result.employee.address || '' });
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load your profile.');
    }).finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const result = await window.api.selfService.updateContact(form);
      setProfile(result);
      setMessage('Contact information updated successfully.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update contact information.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <section className="self-page"><div className="self-empty">Loading employee profile…</div></section>;
  if (!profile) return <section className="self-page"><div className="self-alert self-alert--error">{error || 'Employee profile is unavailable.'}</div></section>;
  const employee = profile.employee;

  return (
    <section className="self-page" aria-labelledby="self-profile-title">
      <div className="self-heading"><div><span>Employee self-service</span><h1 id="self-profile-title">My Profile</h1><p>Review your employment, salary, bank, and government information.</p></div></div>
      {error && <div className="self-alert self-alert--error">{error}</div>}
      {message && <div className="self-alert self-alert--success">{message}</div>}

      <div className="self-profile-hero"><div className="self-profile-avatar">{employee.first_name?.charAt(0) || employee.name.charAt(0)}</div><div><h2>{employee.name}</h2><p>{employee.employee_number} · {employee.department || 'No department'} · {employee.role_title || 'No position'}</p><span className="self-status self-status--approved">{employee.employment_status}</span></div></div>

      <div className="self-profile-grid">
        <ProfileSection title="Employment information" rows={[
          ['Employee number', employee.employee_number],
          ['Employment date', employee.employment_date || '—'],
          ['Employment status', employee.employment_status],
          ['Salary type', employee.salary_type],
          ['Salary grade', employee.salary_grade || '—'],
          ['Basic salary', formatCurrency(employee.basic_salary)],
        ]} />
        <ProfileSection title="Bank information" rows={[
          ['Bank name', employee.bank_name || '—'],
          ['Bank account', maskValue(employee.bank_account)],
        ]} />
        <ProfileSection title="Government information" rows={[
          ['SSS number', maskValue(employee.sss_number)],
          ['PhilHealth number', maskValue(employee.philhealth_number)],
          ['Pag-IBIG number', maskValue(employee.pagibig_number)],
          ['TIN', maskValue(employee.tin_number)],
        ]} />
        <ProfileSection title="Account information" rows={[
          ['Username', profile.user.username],
          ['Display name', profile.user.display_name],
          ['Account email', profile.user.email || '—'],
          ['Role', profile.user.role.replace(/_/g, ' ')],
        ]} />
      </div>

      <form className="self-panel self-form" onSubmit={(event) => void save(event)}>
        <div className="self-panel__heading"><div><h2>Contact information</h2><p>You may update only your phone number and residential address. Payroll-sensitive information remains read-only.</p></div></div>
        <div className="self-form-grid"><label><span>Email</span><input value={employee.email} disabled /></label><label><span>Phone number</span><input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} maxLength={50} /></label><label className="self-form-span"><span>Address</span><textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} rows={3} maxLength={500} /></label></div>
        <div className="self-form-actions"><button className="self-button" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save contact information'}</button></div>
      </form>
    </section>
  );
}

function ProfileSection({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return <article className="self-profile-card"><h3>{title}</h3><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>;
}

function maskValue(value: string): string {
  if (!value) return '—';
  const clean = value.trim();
  if (clean.length <= 4) return clean;
  return `${'•'.repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0));
}
