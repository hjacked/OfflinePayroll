import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  EarningCategory,
  EarningType,
  EarningTypeInput,
} from '../../../models/Earnings';
import {
  categoryLabel,
  earningCategories,
  formatCurrency,
} from './earnings-utils';

const blankForm: EarningTypeInput = {
  code: '',
  name: '',
  category: 'allowance',
  description: '',
  calculation_type: 'fixed',
  default_amount: 0,
  recurrence: 'recurring',
  taxability: 'taxable',
  include_in_gross: true,
  include_in_contribution_basis: false,
  is_active: true,
};

export default function EarningTypesPage() {
  const [types, setTypes] = useState<EarningType[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | EarningCategory>('all');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [form, setForm] = useState<EarningTypeInput>(blankForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await window.api.earningType.list({
        query,
        category,
        include_inactive: includeInactive,
      });
      setTypes(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load earning types.');
    } finally {
      setLoading(false);
    }
  }, [category, includeInactive, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const heading = useMemo(
    () => editingId ? 'Edit earning type' : 'Create earning type',
    [editingId],
  );

  function resetForm() {
    setForm(blankForm);
    setEditingId('');
    setError('');
    setSuccess('');
  }

  function editType(type: EarningType) {
    setEditingId(type.id);
    setForm({
      code: type.code,
      name: type.name,
      category: type.category,
      description: type.description,
      calculation_type: type.calculation_type,
      default_amount: type.default_amount,
      recurrence: type.recurrence,
      taxability: type.taxability,
      include_in_gross: Boolean(type.include_in_gross),
      include_in_contribution_basis: Boolean(type.include_in_contribution_basis),
      is_active: Boolean(type.is_active),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        await window.api.earningType.update(editingId, form);
        setSuccess('Earning type updated.');
      } else {
        await window.api.earningType.create(form);
        setSuccess('Earning type created.');
      }
      setForm(blankForm);
      setEditingId('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save the earning type.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(type: EarningType) {
    try {
      await window.api.earningType.setStatus(type.id, !Boolean(type.is_active));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to change the earning type status.');
    }
  }

  async function removeType(type: EarningType) {
    if (!window.confirm(`Delete ${type.name}? Referenced types will be deactivated instead.`)) return;
    try {
      const result = await window.api.earningType.delete(type.id);
      setSuccess(result.deactivated ? 'Referenced earning type was deactivated.' : 'Earning type deleted.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete the earning type.');
    }
  }

  return (
    <section className="earnings-page">
      <div className="earnings-heading">
        <div>
          <span>Configuration</span>
          <h2>Earning Types</h2>
          <p>Define allowances, bonuses, commissions, reimbursements, and payroll adjustments.</p>
        </div>
        <Link className="earnings-secondary-link" to="/admin/earnings">Back to earnings</Link>
      </div>

      {error && <div className="earnings-alert earnings-alert--error">{error}</div>}
      {success && <div className="earnings-alert earnings-alert--success">{success}</div>}

      <form className="earnings-form-section" onSubmit={submit}>
        <div className="earnings-form-section__heading">
          <div><h3>{heading}</h3><p>Tax and contribution flags are stored for later payroll processing.</p></div>
          {editingId && <button className="earnings-secondary-button" type="button" onClick={resetForm}>Cancel edit</button>}
        </div>
        <div className="earnings-form-grid earnings-form-grid--four">
          <label className="earnings-field"><span>Code *</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} maxLength={20} /></label>
          <label className="earnings-field earnings-field--span-2"><span>Name *</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label className="earnings-field"><span>Category *</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as EarningCategory })}>{earningCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="earnings-field"><span>Calculation</span><select value={form.calculation_type} onChange={(event) => setForm({ ...form, calculation_type: event.target.value as EarningTypeInput['calculation_type'] })}><option value="fixed">Fixed</option><option value="variable">Variable</option></select></label>
          <label className="earnings-field"><span>Default amount</span><input type="number" min="0" step="0.01" value={form.default_amount} onChange={(event) => setForm({ ...form, default_amount: Number(event.target.value) })} /></label>
          <label className="earnings-field"><span>Recurrence</span><select value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value as EarningTypeInput['recurrence'] })}><option value="recurring">Recurring</option><option value="one-time">One-time</option></select></label>
          <label className="earnings-field"><span>Taxability</span><select value={form.taxability} onChange={(event) => setForm({ ...form, taxability: event.target.value as EarningTypeInput['taxability'] })}><option value="taxable">Taxable</option><option value="non-taxable">Non-taxable</option></select></label>
          <label className="earnings-field earnings-field--wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        </div>
        <div className="earnings-checkbox-grid">
          <label className="earnings-checkbox"><input type="checkbox" checked={form.include_in_gross} onChange={(event) => setForm({ ...form, include_in_gross: event.target.checked })} /><span>Include in gross income</span></label>
          <label className="earnings-checkbox"><input type="checkbox" checked={form.include_in_contribution_basis} onChange={(event) => setForm({ ...form, include_in_contribution_basis: event.target.checked })} /><span>Include in contribution basis</span></label>
          <label className="earnings-checkbox"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span>Active</span></label>
        </div>
        <div className="earnings-form-actions"><button className="earnings-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update earning type' : 'Create earning type'}</button></div>
      </form>

      <div className="earnings-toolbar earnings-toolbar--types">
        <label className="earnings-field earnings-field--search"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, name, or description" /></label>
        <label className="earnings-field"><span>Category</span><select value={category} onChange={(event) => setCategory(event.target.value as 'all' | EarningCategory)}><option value="all">All categories</option>{earningCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="earnings-checkbox earnings-checkbox--toolbar"><input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} /><span>Include inactive</span></label>
      </div>

      <div className="earnings-table-card">
        <div className="earnings-table-card__header"><div><h3>Configured earning types</h3><p>{types.length} type{types.length === 1 ? '' : 's'}.</p></div></div>
        {loading ? <div className="earnings-empty-state">Loading earning types…</div> : (
          <div className="earnings-table-wrap">
            <table className="earnings-table earnings-table--types">
              <thead><tr><th>Code and name</th><th>Category</th><th>Default</th><th>Schedule</th><th>Tax</th><th>Payroll basis</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{types.map((type) => (
                <tr key={type.id}>
                  <td><div className="earnings-type-cell"><strong>{type.name}</strong><span>{type.code} · {type.description || 'No description'}</span></div></td>
                  <td>{categoryLabel(type.category)}</td>
                  <td>{type.calculation_type === 'fixed' ? formatCurrency(type.default_amount) : 'Variable'}</td>
                  <td>{type.recurrence === 'recurring' ? 'Recurring' : 'One-time'}</td>
                  <td><span className={`earnings-chip earnings-chip--${type.taxability}`}>{type.taxability === 'taxable' ? 'Taxable' : 'Non-taxable'}</span></td>
                  <td>{type.include_in_contribution_basis ? 'Gross + contribution' : type.include_in_gross ? 'Gross only' : 'Excluded'}</td>
                  <td><span className={`earnings-status earnings-status--${type.is_active ? 'approved' : 'cancelled'}`}>{type.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="earnings-row-actions"><button type="button" onClick={() => editType(type)}>Edit</button><button type="button" onClick={() => void toggleStatus(type)}>{type.is_active ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => void removeType(type)}>Delete</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
