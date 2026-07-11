import { useCallback, useEffect, useState } from 'react';
import type {
  ContributionCalculationMethod,
  ContributionType,
  ContributionTypeInput,
  GovernmentNumberField,
} from '../../../models/Contributions';

const blank: ContributionTypeInput = {
  code: '',
  name: '',
  authority: '',
  description: '',
  calculation_method: 'bracket',
  government_number_field: 'none',
  employee_share_enabled: 1,
  employer_share_enabled: 1,
  is_tax: 0,
  is_active: 1,
};

export default function ContributionTypesPage() {
  const [types, setTypes] = useState<ContributionType[]>([]);
  const [form, setForm] = useState<ContributionTypeInput>(blank);
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await window.api.contributionType.list({ query, include_inactive: showInactive });
      setTypes(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load contribution types.');
    }
  }, [query, showInactive]);

  useEffect(() => { void load(); }, [load]);

  function edit(item: ContributionType) {
    setEditingId(item.id);
    setForm({
      code: item.code,
      name: item.name,
      authority: item.authority,
      description: item.description,
      calculation_method: item.calculation_method,
      government_number_field: item.government_number_field,
      employee_share_enabled: item.employee_share_enabled,
      employer_share_enabled: item.employer_share_enabled,
      is_tax: item.is_tax,
      is_active: item.is_active,
    });
    setError('');
    setMessage('');
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      if (editingId) {
        await window.api.contributionType.update(editingId, form);
        setMessage('Contribution type updated.');
      } else {
        await window.api.contributionType.create(form);
        setMessage('Contribution type created.');
      }
      setEditingId('');
      setForm(blank);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save contribution type.');
    }
  }

  async function toggle(item: ContributionType) {
    setError('');
    try {
      await window.api.contributionType.setStatus(item.id, !item.is_active);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to change status.');
    }
  }

  async function remove(item: ContributionType) {
    if (!window.confirm(`Delete or deactivate ${item.name}?`)) return;
    setError('');
    try {
      await window.api.contributionType.delete(item.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete contribution type.');
    }
  }

  return (
    <section className="contributions-page">
      <div className="contributions-heading"><div><span>Configuration</span><h2>Contribution Types</h2><p>Define agencies, calculation methods, and required employee identification fields.</p></div></div>
      {error && <div className="contributions-alert contributions-alert--error">{error}</div>}
      {message && <div className="contributions-alert contributions-alert--success">{message}</div>}

      <div className="contributions-two-column">
        <form className="contributions-panel contributions-form" onSubmit={save}>
          <div className="contributions-panel__header"><div><h3>{editingId ? 'Edit contribution type' : 'New contribution type'}</h3><p>Rates are configured separately in effective-dated tables.</p></div></div>
          <div className="contributions-form-grid">
            <label><span>Code</span><input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required /></label>
            <label><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label className="contributions-field--wide"><span>Authority</span><input value={form.authority} onChange={(event) => setForm({ ...form, authority: event.target.value })} required /></label>
            <label><span>Calculation method</span><select value={form.calculation_method} onChange={(event) => setForm({ ...form, calculation_method: event.target.value as ContributionCalculationMethod })}><option value="bracket">Bracket</option><option value="percentage">Percentage</option><option value="fixed">Fixed</option><option value="tax-bracket">Tax bracket</option></select></label>
            <label><span>Government number</span><select value={form.government_number_field} onChange={(event) => setForm({ ...form, government_number_field: event.target.value as GovernmentNumberField })}><option value="none">None</option><option value="sss_number">SSS number</option><option value="philhealth_number">PhilHealth number</option><option value="pagibig_number">Pag-IBIG number</option><option value="tin_number">TIN</option></select></label>
            <label className="contributions-field--wide"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} /></label>
          </div>
          <div className="contributions-check-grid">
            <label><input type="checkbox" checked={Boolean(form.employee_share_enabled)} onChange={(event) => setForm({ ...form, employee_share_enabled: event.target.checked ? 1 : 0 })} /> Employee share</label>
            <label><input type="checkbox" checked={Boolean(form.employer_share_enabled)} onChange={(event) => setForm({ ...form, employer_share_enabled: event.target.checked ? 1 : 0 })} /> Employer share</label>
            <label><input type="checkbox" checked={Boolean(form.is_tax)} onChange={(event) => setForm({ ...form, is_tax: event.target.checked ? 1 : 0 })} /> Tax deduction</label>
            <label><input type="checkbox" checked={Boolean(form.is_active)} onChange={(event) => setForm({ ...form, is_active: event.target.checked ? 1 : 0 })} /> Active</label>
          </div>
          <div className="contributions-actions"><button className="contributions-button contributions-button--primary" type="submit">{editingId ? 'Save changes' : 'Create type'}</button>{editingId && <button className="contributions-button" type="button" onClick={() => { setEditingId(''); setForm(blank); }}>Cancel</button>}</div>
        </form>

        <div className="contributions-panel">
          <div className="contributions-panel__header"><div><h3>Configured types</h3><p>Seeded types contain no statutory rates.</p></div></div>
          <div className="contributions-toolbar"><input placeholder="Search types…" value={query} onChange={(event) => setQuery(event.target.value)} /><label><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Include inactive</label></div>
          <div className="contributions-stack">{types.map((item) => (
            <article className="contributions-list-card" key={item.id}>
              <div><span className="contributions-code">{item.code}</span><h4>{item.name}</h4><p>{item.authority}</p><small>{item.calculation_method} · {item.is_active ? 'Active' : 'Inactive'}</small></div>
              <div className="contributions-actions"><button className="contributions-button" type="button" onClick={() => edit(item)}>Edit</button><button className="contributions-button" type="button" onClick={() => void toggle(item)}>{item.is_active ? 'Deactivate' : 'Activate'}</button><button className="contributions-button contributions-button--danger" type="button" onClick={() => void remove(item)}>Delete</button></div>
            </article>
          ))}</div>
        </div>
      </div>
    </section>
  );
}
