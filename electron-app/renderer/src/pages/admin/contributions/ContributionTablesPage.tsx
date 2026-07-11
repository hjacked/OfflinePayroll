import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ContributionBracketInput,
  ContributionTableStatus,
  ContributionTableVersion,
  ContributionTableVersionInput,
  ContributionType,
} from '../../../models/Contributions';
import { formatCurrency, formatDate, statusLabel, today } from './contribution-utils';

const blankTable: ContributionTableVersionInput = {
  contribution_type_id: '',
  version_name: '',
  effective_from: today(),
  effective_to: '',
  status: 'draft',
  notes: '',
};

const blankBracket = (sortOrder: number): ContributionBracketInput => ({
  min_compensation: 0,
  max_compensation: null,
  employee_fixed: 0,
  employee_rate: 0,
  employee_excess_over: 0,
  employer_fixed: 0,
  employer_rate: 0,
  employer_excess_over: 0,
  notes: '',
  sort_order: sortOrder,
});

export default function ContributionTablesPage() {
  const [types, setTypes] = useState<ContributionType[]>([]);
  const [tables, setTables] = useState<ContributionTableVersion[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<ContributionTableVersionInput>(blankTable);
  const [editingId, setEditingId] = useState('');
  const [brackets, setBrackets] = useState<ContributionBracketInput[]>([blankBracket(0)]);
  const [statusFilter, setStatusFilter] = useState<ContributionTableStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [typeResult, tableResult] = await Promise.all([
        window.api.contributionType.list({ include_inactive: false }),
        window.api.contributionTable.list({ contribution_type_id: typeFilter, status: statusFilter }),
      ]);
      setTypes(typeResult.data);
      setTables(tableResult.data);
      if (!form.contribution_type_id && typeResult.data[0]) {
        setForm((current) => ({ ...current, contribution_type_id: typeResult.data[0].id }));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load contribution tables.');
    }
  }, [form.contribution_type_id, statusFilter, typeFilter]);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => tables.find((item) => item.id === selectedId), [selectedId, tables]);

  async function openTable(item: ContributionTableVersion) {
    setSelectedId(item.id);
    setEditingId(item.id);
    setForm({
      contribution_type_id: item.contribution_type_id,
      version_name: item.version_name,
      effective_from: item.effective_from,
      effective_to: item.effective_to,
      status: item.status,
      notes: item.notes,
    });
    const result = await window.api.contributionTable.get(item.id);
    setBrackets(result?.brackets.map((row) => ({
      min_compensation: row.min_compensation,
      max_compensation: row.max_compensation,
      employee_fixed: row.employee_fixed,
      employee_rate: row.employee_rate,
      employee_excess_over: row.employee_excess_over,
      employer_fixed: row.employer_fixed,
      employer_rate: row.employer_rate,
      employer_excess_over: row.employer_excess_over,
      notes: row.notes,
      sort_order: row.sort_order,
    })) ?? [blankBracket(0)]);
  }

  function newTable() {
    setSelectedId('');
    setEditingId('');
    setForm({ ...blankTable, contribution_type_id: types[0]?.id ?? '' });
    setBrackets([blankBracket(0)]);
    setError('');
    setMessage('');
  }

  async function saveTable(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const saved = editingId
        ? await window.api.contributionTable.update(editingId, form)
        : await window.api.contributionTable.create(form);
      await window.api.contributionTable.replaceBrackets(saved.id, brackets);
      if (form.status === 'active' && saved.status !== 'active') {
        await window.api.contributionTable.setStatus(saved.id, 'active');
      }
      setEditingId(saved.id);
      setSelectedId(saved.id);
      setMessage('Contribution table and brackets saved.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save contribution table.');
    }
  }

  async function changeStatus(item: ContributionTableVersion, status: ContributionTableStatus) {
    setError('');
    try {
      await window.api.contributionTable.setStatus(item.id, status);
      await load();
      if (selectedId === item.id) await openTable({ ...item, status });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to change table status.');
    }
  }

  async function remove(item: ContributionTableVersion) {
    if (!window.confirm(`Delete or archive ${item.version_name}?`)) return;
    setError('');
    try {
      await window.api.contributionTable.delete(item.id);
      if (selectedId === item.id) newTable();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete contribution table.');
    }
  }

  function updateBracket(index: number, key: keyof ContributionBracketInput, value: string) {
    setBrackets((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (key === 'notes') return { ...item, notes: value };
      if (key === 'max_compensation') return { ...item, max_compensation: value === '' ? null : Number(value) };
      return { ...item, [key]: Number(value) };
    }));
  }

  return (
    <section className="contributions-page">
      <div className="contributions-heading"><div><span>Effective-dated configuration</span><h2>Contribution Tables and Brackets</h2><p>Enter official rates and salary brackets from the issuing agency, with clear effective dates.</p></div><button className="contributions-button contributions-button--primary" type="button" onClick={newTable}>New table</button></div>
      <div className="contributions-alert contributions-alert--warning">No statutory rates are hard-coded. Verify every table against the current official agency issuance before activating it.</div>
      {error && <div className="contributions-alert contributions-alert--error">{error}</div>}
      {message && <div className="contributions-alert contributions-alert--success">{message}</div>}

      <div className="contributions-toolbar">
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">All contribution types</option>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContributionTableStatus | 'all')}><option value="all">All statuses</option><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select>
      </div>

      <div className="contributions-two-column contributions-two-column--tables">
        <div className="contributions-panel">
          <div className="contributions-panel__header"><div><h3>Table versions</h3><p>{tables.length} configured versions</p></div></div>
          <div className="contributions-stack">{tables.length === 0 ? <div className="contributions-empty">No contribution tables found.</div> : tables.map((item) => (
            <article className={`contributions-list-card${selectedId === item.id ? ' contributions-list-card--selected' : ''}`} key={item.id}>
              <button type="button" className="contributions-list-card__main" onClick={() => void openTable(item)}>
                <span className="contributions-code">{item.contribution_code}</span><h4>{item.version_name}</h4><p>{item.contribution_name}</p><small>{formatDate(item.effective_from)} to {item.effective_to ? formatDate(item.effective_to) : 'open-ended'} · {item.bracket_count} brackets</small>
              </button>
              <div className="contributions-actions"><span className={`contributions-status contributions-status--${item.status}`}>{statusLabel(item.status)}</span>{item.status !== 'active' && <button className="contributions-button" type="button" onClick={() => void changeStatus(item, 'active')}>Activate</button>}{item.status === 'active' && <button className="contributions-button" type="button" onClick={() => void changeStatus(item, 'archived')}>Archive</button>}<button className="contributions-button contributions-button--danger" type="button" onClick={() => void remove(item)}>Delete</button></div>
            </article>
          ))}</div>
        </div>

        <form className="contributions-panel contributions-form" onSubmit={saveTable}>
          <div className="contributions-panel__header"><div><h3>{editingId ? 'Edit table version' : 'New table version'}</h3><p>{selected ? `${selected.contribution_name} · ${selected.version_name}` : 'Configure dates, status, and bracket formula.'}</p></div></div>
          <div className="contributions-form-grid">
            <label><span>Contribution type</span><select value={form.contribution_type_id} onChange={(event) => setForm({ ...form, contribution_type_id: event.target.value })} required><option value="">Select type</option>{types.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
            <label><span>Version name</span><input value={form.version_name} onChange={(event) => setForm({ ...form, version_name: event.target.value })} placeholder="e.g. Official table 2026" required /></label>
            <label><span>Effective from</span><input type="date" value={form.effective_from} onChange={(event) => setForm({ ...form, effective_from: event.target.value })} required /></label>
            <label><span>Effective to</span><input type="date" value={form.effective_to} onChange={(event) => setForm({ ...form, effective_to: event.target.value })} /></label>
            <label><span>Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ContributionTableStatus })}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
            <label className="contributions-field--wide"><span>Notes / source reference</span><textarea rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Official circular, resolution, or source reference" /></label>
          </div>

          <div className="contributions-bracket-header"><div><h4>Calculation brackets</h4><p>Share = fixed amount + rate × compensation above the excess base.</p></div><button type="button" className="contributions-button" onClick={() => setBrackets((current) => [...current, blankBracket(current.length)])}>Add bracket</button></div>
          <div className="contributions-brackets">{brackets.map((bracket, index) => (
            <article className="contributions-bracket" key={index}>
              <div className="contributions-bracket__title"><strong>Bracket {index + 1}</strong>{brackets.length > 1 && <button type="button" onClick={() => setBrackets((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>}</div>
              <div className="contributions-form-grid contributions-form-grid--compact">
                <label><span>Minimum compensation</span><input type="number" min="0" step="0.01" value={bracket.min_compensation} onChange={(event) => updateBracket(index, 'min_compensation', event.target.value)} /></label>
                <label><span>Maximum compensation</span><input type="number" min="0" step="0.01" value={bracket.max_compensation ?? ''} placeholder="No maximum" onChange={(event) => updateBracket(index, 'max_compensation', event.target.value)} /></label>
                <label><span>Employee fixed</span><input type="number" min="0" step="0.01" value={bracket.employee_fixed} onChange={(event) => updateBracket(index, 'employee_fixed', event.target.value)} /></label>
                <label><span>Employee rate %</span><input type="number" min="0" step="0.0001" value={bracket.employee_rate} onChange={(event) => updateBracket(index, 'employee_rate', event.target.value)} /></label>
                <label><span>Employee excess base</span><input type="number" min="0" step="0.01" value={bracket.employee_excess_over} onChange={(event) => updateBracket(index, 'employee_excess_over', event.target.value)} /></label>
                <label><span>Employer fixed</span><input type="number" min="0" step="0.01" value={bracket.employer_fixed} onChange={(event) => updateBracket(index, 'employer_fixed', event.target.value)} /></label>
                <label><span>Employer rate %</span><input type="number" min="0" step="0.0001" value={bracket.employer_rate} onChange={(event) => updateBracket(index, 'employer_rate', event.target.value)} /></label>
                <label><span>Employer excess base</span><input type="number" min="0" step="0.01" value={bracket.employer_excess_over} onChange={(event) => updateBracket(index, 'employer_excess_over', event.target.value)} /></label>
                <label className="contributions-field--wide"><span>Notes</span><input value={bracket.notes} onChange={(event) => updateBracket(index, 'notes', event.target.value)} /></label>
              </div>
              <small>Example employee share at minimum: {formatCurrency(bracket.employee_fixed + Math.max(bracket.min_compensation - bracket.employee_excess_over, 0) * bracket.employee_rate / 100)}</small>
            </article>
          ))}</div>
          <div className="contributions-actions"><button type="submit" className="contributions-button contributions-button--primary">Save table and brackets</button><button type="button" className="contributions-button" onClick={newTable}>Reset</button></div>
        </form>
      </div>
    </section>
  );
}
