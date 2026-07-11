import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Employee } from '../../../models/Employee';
import type {
  EarningAssignment,
  EarningAssignmentInput,
  EarningType,
} from '../../../models/Earnings';
import { formatCurrency, formatDate, today } from './earnings-utils';

const blankForm: EarningAssignmentInput = {
  employee_id: '',
  earning_type_id: '',
  amount: 0,
  effective_from: today(),
  effective_to: '',
  notes: '',
  is_active: true,
};

export default function EarningAssignmentsPage() {
  const [assignments, setAssignments] = useState<EarningAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<EarningType[]>([]);
  const [query, setQuery] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [form, setForm] = useState<EarningAssignmentInput>(blankForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [assignmentResult, employeeResult, typeResult] = await Promise.all([
        window.api.earningAssignment.list({
          query,
          employee_id: employeeFilter,
          earning_type_id: typeFilter,
          include_inactive: includeInactive,
        }),
        window.api.employee.list({ status: 'active' }),
        window.api.earningType.list({ include_inactive: true }),
      ]);
      setAssignments(assignmentResult.data);
      setEmployees(employeeResult.data);
      setTypes(typeResult.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load assignments.');
    } finally {
      setLoading(false);
    }
  }, [employeeFilter, includeInactive, query, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedType = useMemo(
    () => types.find((type) => type.id === form.earning_type_id),
    [form.earning_type_id, types],
  );

  function resetForm() {
    setForm(blankForm);
    setEditingId('');
    setError('');
    setSuccess('');
  }

  function chooseType(id: string) {
    const selected = types.find((type) => type.id === id);
    setForm((current) => ({
      ...current,
      earning_type_id: id,
      amount: selected && selected.calculation_type === 'fixed'
        ? selected.default_amount
        : current.amount,
    }));
  }

  function editAssignment(assignment: EarningAssignment) {
    setEditingId(assignment.id);
    setForm({
      employee_id: assignment.employee_id,
      earning_type_id: assignment.earning_type_id,
      amount: assignment.amount,
      effective_from: assignment.effective_from,
      effective_to: assignment.effective_to,
      notes: assignment.notes,
      is_active: Boolean(assignment.is_active),
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
        await window.api.earningAssignment.update(editingId, form);
        setSuccess('Employee earning assignment updated.');
      } else {
        await window.api.earningAssignment.create(form);
        setSuccess('Employee earning assignment created.');
      }
      setForm(blankForm);
      setEditingId('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save the assignment.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(assignment: EarningAssignment) {
    try {
      await window.api.earningAssignment.setStatus(
        assignment.id,
        !Boolean(assignment.is_active),
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update assignment status.');
    }
  }

  async function removeAssignment(assignment: EarningAssignment) {
    if (!window.confirm('Delete this earning assignment? Referenced assignments are deactivated instead.')) return;
    try {
      const result = await window.api.earningAssignment.delete(assignment.id);
      setSuccess(result.deactivated ? 'Referenced assignment was deactivated.' : 'Assignment deleted.');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete the assignment.');
    }
  }

  return (
    <section className="earnings-page">
      <div className="earnings-heading">
        <div>
          <span>Recurring employee income</span>
          <h2>Earning Assignments</h2>
          <p>Assign regular allowances and recurring income with effective dates.</p>
        </div>
        <div className="earnings-heading__actions">
          <Link className="earnings-secondary-link" to="/admin/earnings/types">Earning types</Link>
          <Link className="earnings-secondary-link" to="/admin/earnings">Back to earnings</Link>
        </div>
      </div>

      {error && <div className="earnings-alert earnings-alert--error">{error}</div>}
      {success && <div className="earnings-alert earnings-alert--success">{success}</div>}

      <form className="earnings-form-section" onSubmit={submit}>
        <div className="earnings-form-section__heading">
          <div><h3>{editingId ? 'Edit assignment' : 'Create assignment'}</h3><p>Overlapping active assignments for the same employee and earning type are blocked.</p></div>
          {editingId && <button className="earnings-secondary-button" type="button" onClick={resetForm}>Cancel edit</button>}
        </div>
        <div className="earnings-form-grid earnings-form-grid--three">
          <label className="earnings-field"><span>Employee *</span><select value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value })}><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}</select></label>
          <label className="earnings-field"><span>Earning type *</span><select value={form.earning_type_id} onChange={(event) => chooseType(event.target.value)}><option value="">Select earning type</option>{types.filter((type) => type.is_active || type.id === form.earning_type_id).map((type) => <option key={type.id} value={type.id}>{type.code} — {type.name}</option>)}</select></label>
          <label className="earnings-field"><span>Amount *</span><input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></label>
          <label className="earnings-field"><span>Effective from *</span><input type="date" value={form.effective_from} onChange={(event) => setForm({ ...form, effective_from: event.target.value })} /></label>
          <label className="earnings-field"><span>Effective to</span><input type="date" value={form.effective_to} onChange={(event) => setForm({ ...form, effective_to: event.target.value })} /></label>
          <label className="earnings-checkbox earnings-checkbox--standalone"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /><span>Active assignment</span></label>
          <label className="earnings-field earnings-field--wide"><span>Notes</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        </div>
        {selectedType && <div className="earnings-inline-note">{selectedType.name}: {selectedType.recurrence === 'recurring' ? 'Recurring' : 'One-time'} · {selectedType.taxability === 'taxable' ? 'Taxable' : 'Non-taxable'} · default {formatCurrency(selectedType.default_amount)}</div>}
        <div className="earnings-form-actions"><button className="earnings-primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update assignment' : 'Create assignment'}</button></div>
      </form>

      <div className="earnings-toolbar earnings-toolbar--assignments">
        <label className="earnings-field earnings-field--search"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Employee, department, or earning type" /></label>
        <label className="earnings-field"><span>Employee</span><select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}><option value="">All employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
        <label className="earnings-field"><span>Earning type</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">All earning types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
        <label className="earnings-checkbox earnings-checkbox--toolbar"><input type="checkbox" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} /><span>Include inactive</span></label>
      </div>

      <div className="earnings-table-card">
        <div className="earnings-table-card__header"><div><h3>Employee assignments</h3><p>{assignments.length} assignment{assignments.length === 1 ? '' : 's'}.</p></div></div>
        {loading ? <div className="earnings-empty-state">Loading assignments…</div> : assignments.length === 0 ? <div className="earnings-empty-state">No assignments match the selected filters.</div> : (
          <div className="earnings-table-wrap">
            <table className="earnings-table">
              <thead><tr><th>Employee</th><th>Earning</th><th>Amount</th><th>Effective period</th><th>Tax</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td><div className="earnings-person-cell"><strong>{assignment.employee_name}</strong><span>{assignment.employee_number} · {assignment.department || 'No department'}</span></div></td>
                  <td><div className="earnings-type-cell"><strong>{assignment.earning_name}</strong><span>{assignment.earning_code}</span></div></td>
                  <td className="earnings-amount">{formatCurrency(assignment.amount)}</td>
                  <td>{formatDate(assignment.effective_from)} — {assignment.effective_to ? formatDate(assignment.effective_to) : 'No end date'}</td>
                  <td><span className={`earnings-chip earnings-chip--${assignment.taxability}`}>{assignment.taxability === 'taxable' ? 'Taxable' : 'Non-taxable'}</span></td>
                  <td><span className={`earnings-status earnings-status--${assignment.is_active ? 'approved' : 'cancelled'}`}>{assignment.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><div className="earnings-row-actions"><button type="button" onClick={() => editAssignment(assignment)}>Edit</button><button type="button" onClick={() => void toggleStatus(assignment)}>{assignment.is_active ? 'Deactivate' : 'Activate'}</button><button type="button" onClick={() => void removeAssignment(assignment)}>Delete</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
