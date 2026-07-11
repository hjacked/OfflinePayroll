import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DeductionCategory, DeductionType, DeductionTypeInput } from '../../../models/Deductions';
import { categoryLabel, deductionCategories, formatCurrency } from './deductions-utils';

const emptyInput: DeductionTypeInput = {
  code: '', name: '', category: 'other', description: '', calculation_type: 'fixed',
  default_amount: 0, default_percentage: 0, recurrence: 'one-time', priority: 100, is_active: true,
};

export default function DeductionTypesPage() {
  const [types, setTypes] = useState<DeductionType[]>([]);
  const [form, setForm] = useState<DeductionTypeInput>(emptyInput);
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | DeductionCategory>('all');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await window.api.deductionType.list({ query, category, include_inactive: includeInactive });
      setTypes(result.data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load deduction types.'); }
  }, [query, category, includeInactive]);

  useEffect(() => { void load(); }, [load]);

  const title = useMemo(() => editingId ? 'Edit deduction type' : 'Create deduction type', [editingId]);

  function edit(type: DeductionType) {
    setEditingId(type.id);
    setForm({
      code: type.code, name: type.name, category: type.category, description: type.description,
      calculation_type: type.calculation_type, default_amount: type.default_amount,
      default_percentage: type.default_percentage, recurrence: type.recurrence,
      priority: type.priority, is_active: Boolean(type.is_active),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      if (editingId) await window.api.deductionType.update(editingId, form);
      else await window.api.deductionType.create(form);
      setEditingId(''); setForm(emptyInput); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save deduction type.'); }
  }

  async function toggle(type: DeductionType) {
    try { await window.api.deductionType.setStatus(type.id, !type.is_active); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update status.'); }
  }

  async function remove(type: DeductionType) {
    if (!window.confirm(`Delete ${type.name}? Referenced types will be deactivated instead.`)) return;
    try { await window.api.deductionType.delete(type.id); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete deduction type.'); }
  }

  return <section className="deductions-page">
    <div className="deductions-heading"><div><span>Configuration</span><h2>Deduction Types</h2><p>Define loan, company, insurance, cooperative, and other authorized deductions.</p></div><Link className="deductions-secondary-link" to="/admin/deductions">Back to deductions</Link></div>
    {error && <div className="deductions-alert deductions-alert--error">{error}</div>}
    <div className="deductions-form-card">
      <div className="deductions-form-card__header"><div><h3>{title}</h3><p>Defaults are used when creating assignments and transactions.</p></div></div>
      <form className="deductions-form" onSubmit={submit}>
        <div className="deductions-form-grid deductions-form-grid--three">
          <label className="deductions-field"><span>Code *</span><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
          <label className="deductions-field"><span>Name *</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="deductions-field"><span>Category *</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DeductionCategory })}>{deductionCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="deductions-field"><span>Calculation</span><select value={form.calculation_type} onChange={(e) => setForm({ ...form, calculation_type: e.target.value as 'fixed' | 'percentage' })}><option value="fixed">Fixed amount</option><option value="percentage">Percentage</option></select></label>
          <label className="deductions-field"><span>Default amount</span><input type="number" min="0" step="0.01" value={form.default_amount} onChange={(e) => setForm({ ...form, default_amount: Number(e.target.value) })} /></label>
          <label className="deductions-field"><span>Default percentage</span><input type="number" min="0" max="100" step="0.01" value={form.default_percentage} onChange={(e) => setForm({ ...form, default_percentage: Number(e.target.value) })} /></label>
          <label className="deductions-field"><span>Recurrence</span><select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value as 'recurring' | 'one-time' })}><option value="recurring">Recurring</option><option value="one-time">One-time</option></select></label>
          <label className="deductions-field"><span>Priority</span><input type="number" min="0" step="1" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></label>
          <label className="deductions-checkbox"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
        </div>
        <label className="deductions-field"><span>Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className="deductions-form-actions">{editingId && <button className="deductions-button" type="button" onClick={() => { setEditingId(''); setForm(emptyInput); }}>Cancel edit</button>}<button className="deductions-button deductions-button--primary" type="submit">{editingId ? 'Save changes' : 'Create type'}</button></div>
      </form>
    </div>
    <div className="deductions-toolbar">
      <label className="deductions-field"><span>Search</span><input value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <label className="deductions-field"><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value as 'all' | DeductionCategory)}><option value="all">All categories</option>{deductionCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="deductions-checkbox"><input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Show inactive</label>
    </div>
    <div className="deductions-table-card"><div className="deductions-table-wrap"><table className="deductions-table"><thead><tr><th>Type</th><th>Category</th><th>Calculation</th><th>Default</th><th>Recurrence</th><th>Status</th><th>Actions</th></tr></thead><tbody>{types.map((type) => <tr key={type.id}><td><div className="deductions-type-cell"><strong>{type.name}</strong><span>{type.code}</span></div></td><td>{categoryLabel(type.category)}</td><td>{type.calculation_type}</td><td>{type.calculation_type === 'percentage' ? `${type.default_percentage}%` : formatCurrency(type.default_amount)}</td><td>{type.recurrence}</td><td><span className={`deductions-status deductions-status--${type.is_active ? 'active' : 'cancelled'}`}>{type.is_active ? 'Active' : 'Inactive'}</span></td><td><div className="deductions-row-actions"><button type="button" onClick={() => edit(type)}>Edit</button><button type="button" onClick={() => void toggle(type)}>{type.is_active ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => void remove(type)}>Delete</button></div></td></tr>)}</tbody></table></div></div>
  </section>;
}
