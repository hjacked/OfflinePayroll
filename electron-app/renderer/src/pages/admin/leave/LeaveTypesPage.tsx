import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LeaveType, LeaveTypeInput } from '../../../models/Leave';
import { formatDays, getErrorMessage } from './utils';

const emptyForm: LeaveTypeInput = {
  code: '',
  name: '',
  description: '',
  is_paid: true,
  track_balance: true,
  annual_credit: 0,
  allow_half_day: true,
  require_attachment: false,
  advance_notice_days: 0,
  allow_carry_over: false,
  max_carry_over: 0,
  min_service_months: 0,
  gender_eligibility: 'all',
  is_active: true,
};

export default function LeaveTypesPage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LeaveTypeInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.leaveType.list({ include_inactive: true });
      setTypes(result.data);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load leave types.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function editType(leaveType: LeaveType): void {
    setEditingId(leaveType.id);
    setForm({
      code: leaveType.code,
      name: leaveType.name,
      description: leaveType.description,
      is_paid: leaveType.is_paid === 1,
      track_balance: leaveType.track_balance === 1,
      annual_credit: leaveType.annual_credit,
      allow_half_day: leaveType.allow_half_day === 1,
      require_attachment: leaveType.require_attachment === 1,
      advance_notice_days: leaveType.advance_notice_days,
      allow_carry_over: leaveType.allow_carry_over === 1,
      max_carry_over: leaveType.max_carry_over,
      min_service_months: leaveType.min_service_months,
      gender_eligibility: leaveType.gender_eligibility,
      is_active: leaveType.is_active === 1,
    });
    setSuccess(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm(): void {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (editingId) {
        await window.api.leaveType.update(editingId, form);
        setSuccess('Leave type updated.');
      } else {
        await window.api.leaveType.create(form);
        setSuccess('Leave type created.');
      }
      resetForm();
      await load();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to save the leave type.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(leaveType: LeaveType): Promise<void> {
    const confirmed = window.confirm(
      `Remove ${leaveType.name}? Referenced leave types are deactivated instead of permanently deleted.`,
    );
    if (!confirmed) return;
    setError(null);
    setSuccess(null);
    try {
      const result = await window.api.leaveType.delete(leaveType.id);
      setSuccess(result.deactivated
        ? `${leaveType.name} was deactivated because it has related records.`
        : `${leaveType.name} was deleted.`);
      if (editingId === leaveType.id) resetForm();
      await load();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to remove the leave type.'));
    }
  }

  return (
    <section className="admin-page leave-page" aria-labelledby="leave-types-title">
      <div className="admin-page-heading leave-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Leave configuration</span>
          <h2 id="leave-types-title">Leave Types</h2>
          <p>Configure paid status, credit tracking, half-day rules, attachments, and eligibility.</p>
        </div>
        <div className="leave-heading__actions">
          <Link className="leave-secondary-link" to="/admin/leave-management/balances">Leave balances</Link>
          <Link className="leave-secondary-link" to="/admin/leave-management">Back to requests</Link>
        </div>
      </div>

      {error && <div className="leave-alert leave-alert--error">{error}</div>}
      {success && <div className="leave-alert leave-alert--success">{success}</div>}

      <form className="leave-form-section" onSubmit={(event) => void handleSubmit(event)}>
        <div className="leave-form-section__heading">
          <h3>{editingId ? 'Edit leave type' : 'Add leave type'}</h3>
          <p>Annual credit is used only when balance tracking is enabled.</p>
        </div>
        <div className="leave-form-grid leave-form-grid--three">
          <Field label="Code" required>
            <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required />
          </Field>
          <Field label="Name" required>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </Field>
          <Field label="Gender eligibility">
            <select value={form.gender_eligibility} onChange={(event) => setForm((current) => ({ ...current, gender_eligibility: event.target.value as LeaveTypeInput['gender_eligibility'] }))}>
              <option value="all">All employees</option>
              <option value="female">Female employees</option>
              <option value="male">Male employees</option>
            </select>
          </Field>
          <Field label="Description" wide>
            <textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <Field label="Annual credit">
            <input type="number" min="0" step="0.5" value={form.annual_credit} disabled={!form.track_balance} onChange={(event) => setForm((current) => ({ ...current, annual_credit: Number(event.target.value) }))} />
          </Field>
          <Field label="Advance notice days">
            <input type="number" min="0" step="1" value={form.advance_notice_days} onChange={(event) => setForm((current) => ({ ...current, advance_notice_days: Number(event.target.value) }))} />
          </Field>
          <Field label="Minimum service months">
            <input type="number" min="0" step="1" value={form.min_service_months} onChange={(event) => setForm((current) => ({ ...current, min_service_months: Number(event.target.value) }))} />
          </Field>
          <Field label="Maximum carry-over">
            <input type="number" min="0" step="0.5" value={form.max_carry_over} disabled={!form.allow_carry_over} onChange={(event) => setForm((current) => ({ ...current, max_carry_over: Number(event.target.value) }))} />
          </Field>
        </div>

        <div className="leave-checkbox-grid">
          <Checkbox label="Paid leave" checked={form.is_paid} onChange={(checked) => setForm((current) => ({ ...current, is_paid: checked }))} />
          <Checkbox label="Track balance" checked={form.track_balance} onChange={(checked) => setForm((current) => ({ ...current, track_balance: checked, annual_credit: checked ? current.annual_credit : 0 }))} />
          <Checkbox label="Allow half day" checked={form.allow_half_day} onChange={(checked) => setForm((current) => ({ ...current, allow_half_day: checked }))} />
          <Checkbox label="Require attachment" checked={form.require_attachment} onChange={(checked) => setForm((current) => ({ ...current, require_attachment: checked }))} />
          <Checkbox label="Allow carry-over" checked={form.allow_carry_over} onChange={(checked) => setForm((current) => ({ ...current, allow_carry_over: checked, max_carry_over: checked ? current.max_carry_over : 0 }))} />
          <Checkbox label="Active" checked={form.is_active} onChange={(checked) => setForm((current) => ({ ...current, is_active: checked }))} />
        </div>

        <div className="leave-form-actions">
          {editingId && <button className="leave-secondary-button" type="button" onClick={resetForm}>Cancel edit</button>}
          <button className="leave-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add leave type'}</button>
        </div>
      </form>

      <div className="leave-table-card">
        <div className="leave-table-card__header">
          <div><h3>Configured leave types</h3><p>{types.length} leave type{types.length === 1 ? '' : 's'}.</p></div>
        </div>
        {loading ? (
          <div className="leave-empty-state">Loading leave types…</div>
        ) : (
          <div className="leave-table-wrap">
            <table className="leave-table leave-table--compact">
              <thead><tr><th>Code</th><th>Name</th><th>Credits</th><th>Rules</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {types.map((leaveType) => (
                  <tr key={leaveType.id}>
                    <td><strong>{leaveType.code}</strong></td>
                    <td><div className="leave-type-cell"><strong>{leaveType.name}</strong><span>{leaveType.description || 'No description'}</span></div></td>
                    <td>{leaveType.track_balance ? `${formatDays(leaveType.annual_credit)} / year` : 'Not tracked'}</td>
                    <td>{leaveType.is_paid ? 'Paid' : 'Unpaid'} · {leaveType.allow_half_day ? 'Half-day' : 'Full-day only'}{leaveType.require_attachment ? ' · Attachment' : ''}</td>
                    <td><span className={`leave-status ${leaveType.is_active ? 'leave-status--approved' : 'leave-status--cancelled'}`}>{leaveType.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td><div className="leave-row-actions"><button type="button" onClick={() => editType(leaveType)}>Edit</button><button className="leave-row-actions__danger" type="button" onClick={() => void handleDelete(leaveType)}>Remove</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, required = false, wide = false, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return <label className={`leave-field${wide ? ' leave-field--wide' : ''}`}><span>{label}{required && <em> *</em>}</span>{children}</label>;
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="leave-checkbox"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}
