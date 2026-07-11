import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DeductionAssignment, DeductionAssignmentInput, DeductionType } from '../../../models/Deductions';
import type { Employee } from '../../../models/Employee';
import { formatCurrency, formatDate, today } from './deductions-utils';

const emptyForm: DeductionAssignmentInput = {
  employee_id: '', deduction_type_id: '', amount: 0, percentage: 0,
  effective_from: today(), effective_to: '', notes: '', is_active: true,
};

export default function DeductionAssignmentsPage() {
  const [assignments, setAssignments] = useState<DeductionAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<DeductionType[]>([]);
  const [form, setForm] = useState<DeductionAssignmentInput>(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [assignmentResult, employeeResult, typeResult] = await Promise.all([
        window.api.deductionAssignment.list({ query, include_inactive: includeInactive }),
        window.api.employee.list({ status: 'active' }),
        window.api.deductionType.list({ include_inactive: false }),
      ]);
      setAssignments(assignmentResult.data);
      setEmployees(employeeResult.data);
      setTypes(typeResult.data.filter((type) => type.category !== 'loan'));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load assignments.'); }
  }, [query, includeInactive]);

  useEffect(() => { void load(); }, [load]);

  function selectType(id: string) {
    const type = types.find((item) => item.id === id);
    setForm((current) => ({ ...current, deduction_type_id: id, amount: type?.default_amount ?? 0, percentage: type?.default_percentage ?? 0 }));
  }

  function edit(item: DeductionAssignment) {
    setEditingId(item.id);
    setForm({ employee_id: item.employee_id, deduction_type_id: item.deduction_type_id,
      amount: item.amount, percentage: item.percentage, effective_from: item.effective_from,
      effective_to: item.effective_to, notes: item.notes, is_active: Boolean(item.is_active) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      if (editingId) await window.api.deductionAssignment.update(editingId, form);
      else await window.api.deductionAssignment.create(form);
      setEditingId(''); setForm(emptyForm); await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save assignment.'); }
  }

  async function toggle(item: DeductionAssignment) {
    try { await window.api.deductionAssignment.setStatus(item.id, !item.is_active); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to update assignment.'); }
  }

  async function remove(item: DeductionAssignment) {
    if (!window.confirm('Delete this recurring deduction assignment? Referenced assignments will be deactivated.')) return;
    try { await window.api.deductionAssignment.delete(item.id); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to delete assignment.'); }
  }

  return <section className="deductions-page">
    <div className="deductions-heading"><div><span>Recurring deductions</span><h2>Employee Deduction Assignments</h2><p>Assign recurring non-loan deductions with effective dates.</p></div><Link className="deductions-secondary-link" to="/admin/deductions">Back to deductions</Link></div>
    {error && <div className="deductions-alert deductions-alert--error">{error}</div>}
    <div className="deductions-form-card"><div className="deductions-form-card__header"><div><h3>{editingId ? 'Edit assignment' : 'Create assignment'}</h3><p>Loan repayments are managed separately in Employee Loans.</p></div></div>
      <form className="deductions-form" onSubmit={submit}>
        <div className="deductions-form-grid deductions-form-grid--three">
          <label className="deductions-field"><span>Employee *</span><select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}</select></label>
          <label className="deductions-field"><span>Deduction type *</span><select value={form.deduction_type_id} onChange={(e) => selectType(e.target.value)}><option value="">Select type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.code} — {type.name}</option>)}</select></label>
          <label className="deductions-field"><span>Amount</span><input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></label>
          <label className="deductions-field"><span>Percentage</span><input type="number" min="0" max="100" step="0.01" value={form.percentage} onChange={(e) => setForm({ ...form, percentage: Number(e.target.value) })} /></label>
          <label className="deductions-field"><span>Effective from *</span><input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} /></label>
          <label className="deductions-field"><span>Effective to</span><input type="date" value={form.effective_to} onChange={(e) => setForm({ ...form, effective_to: e.target.value })} /></label>
        </div>
        <label className="deductions-field"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        <label className="deductions-checkbox"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active assignment</label>
        <div className="deductions-form-actions">{editingId && <button className="deductions-button" type="button" onClick={() => { setEditingId(''); setForm(emptyForm); }}>Cancel edit</button>}<button className="deductions-button deductions-button--primary" type="submit">{editingId ? 'Save changes' : 'Create assignment'}</button></div>
      </form>
    </div>
    <div className="deductions-toolbar"><label className="deductions-field"><span>Search</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Employee or deduction type" /></label><label className="deductions-checkbox"><input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> Show inactive</label></div>
    <div className="deductions-table-card"><div className="deductions-table-wrap"><table className="deductions-table"><thead><tr><th>Employee</th><th>Deduction</th><th>Value</th><th>Effective dates</th><th>Status</th><th>Actions</th></tr></thead><tbody>{assignments.map((item) => <tr key={item.id}><td><div className="deductions-person-cell"><strong>{item.employee_name}</strong><span>{item.employee_number} · {item.department || 'No department'}</span></div></td><td><div className="deductions-type-cell"><strong>{item.deduction_name}</strong><span>{item.deduction_code}</span></div></td><td>{item.calculation_type === 'percentage' ? `${item.percentage}%` : formatCurrency(item.amount)}</td><td>{formatDate(item.effective_from)} – {formatDate(item.effective_to)}</td><td><span className={`deductions-status deductions-status--${item.is_active ? 'active' : 'cancelled'}`}>{item.is_active ? 'Active' : 'Inactive'}</span></td><td><div className="deductions-row-actions"><button type="button" onClick={() => edit(item)}>Edit</button><button type="button" onClick={() => void toggle(item)}>{item.is_active ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => void remove(item)}>Delete</button></div></td></tr>)}</tbody></table></div></div>
  </section>;
}
