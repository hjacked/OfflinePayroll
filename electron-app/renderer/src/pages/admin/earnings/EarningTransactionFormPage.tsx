import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Employee } from '../../../models/Employee';
import type {
  EarningAssignment,
  EarningTransactionInput,
  EarningType,
} from '../../../models/Earnings';
import { formatCurrency, today } from './earnings-utils';

const blankForm: EarningTransactionInput = {
  employee_id: '',
  earning_type_id: '',
  assignment_id: '',
  transaction_date: today(),
  payroll_period_id: '',
  amount: 0,
  reference: '',
  notes: '',
  status: 'draft',
};

export default function EarningTransactionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState<EarningTransactionInput>(blankForm);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<EarningType[]>([]);
  const [assignments, setAssignments] = useState<EarningAssignment[]>([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [employeeResult, typeResult, assignmentResult] = await Promise.all([
          window.api.employee.list({ status: 'active' }),
          window.api.earningType.list({ include_inactive: true }),
          window.api.earningAssignment.list({ include_inactive: true }),
        ]);
        if (!active) return;
        setEmployees(employeeResult.data);
        setTypes(typeResult.data);
        setAssignments(assignmentResult.data);
        if (id) {
          const transaction = await window.api.earningTransaction.get(id);
          if (!transaction) throw new Error('Earning transaction was not found.');
          if (!active) return;
          setForm({
            employee_id: transaction.employee_id,
            earning_type_id: transaction.earning_type_id,
            assignment_id: transaction.assignment_id,
            transaction_date: transaction.transaction_date,
            payroll_period_id: transaction.payroll_period_id,
            amount: transaction.amount,
            reference: transaction.reference,
            notes: transaction.notes,
            status: transaction.status,
          });
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : 'Unable to load the form.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const matchingAssignments = useMemo(
    () => assignments.filter((assignment) =>
      (!form.employee_id || assignment.employee_id === form.employee_id)
      && (!form.earning_type_id || assignment.earning_type_id === form.earning_type_id)
      && assignment.is_active,
    ),
    [assignments, form.earning_type_id, form.employee_id],
  );

  const selectedType = useMemo(
    () => types.find((type) => type.id === form.earning_type_id),
    [form.earning_type_id, types],
  );

  function chooseType(typeId: string) {
    const type = types.find((item) => item.id === typeId);
    setForm((current) => ({
      ...current,
      earning_type_id: typeId,
      assignment_id: '',
      amount: type?.calculation_type === 'fixed' ? type.default_amount : current.amount,
    }));
  }

  function chooseAssignment(assignmentId: string) {
    const assignment = assignments.find((item) => item.id === assignmentId);
    if (!assignment) {
      setForm((current) => ({ ...current, assignment_id: '' }));
      return;
    }
    setForm((current) => ({
      ...current,
      assignment_id: assignment.id,
      employee_id: assignment.employee_id,
      earning_type_id: assignment.earning_type_id,
      amount: assignment.amount,
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = id
        ? await window.api.earningTransaction.update(id, form)
        : await window.api.earningTransaction.create(form);
      navigate(`/admin/earnings/${saved.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save the earning transaction.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="earnings-empty-state">Loading earning transaction…</div>;

  return (
    <section className="earnings-page">
      <div className="earnings-heading">
        <div>
          <span>{editing ? 'Update record' : 'New payroll input'}</span>
          <h2>{editing ? 'Edit Earning Transaction' : 'Add Earning Transaction'}</h2>
          <p>Record one-time income or stage a recurring assignment amount for payroll.</p>
        </div>
        <Link className="earnings-secondary-link" to={id ? `/admin/earnings/${id}` : '/admin/earnings'}>Cancel</Link>
      </div>

      {error && <div className="earnings-alert earnings-alert--error">{error}</div>}

      <form className="earnings-form-section" onSubmit={submit}>
        <div className="earnings-form-section__heading"><div><h3>Transaction details</h3><p>Approved transactions will be available to the payroll engine in a later phase.</p></div></div>
        <div className="earnings-form-grid earnings-form-grid--three">
          <label className="earnings-field"><span>Employee *</span><select value={form.employee_id} onChange={(event) => setForm({ ...form, employee_id: event.target.value, assignment_id: '' })}><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}</select></label>
          <label className="earnings-field"><span>Earning type *</span><select value={form.earning_type_id} onChange={(event) => chooseType(event.target.value)}><option value="">Select earning type</option>{types.filter((type) => type.is_active || type.id === form.earning_type_id).map((type) => <option key={type.id} value={type.id}>{type.code} — {type.name}</option>)}</select></label>
          <label className="earnings-field"><span>Assignment</span><select value={form.assignment_id} onChange={(event) => chooseAssignment(event.target.value)}><option value="">No assignment</option>{matchingAssignments.map((assignment) => <option key={assignment.id} value={assignment.id}>{assignment.employee_name} — {assignment.earning_name} ({formatCurrency(assignment.amount)})</option>)}</select></label>
          <label className="earnings-field"><span>Transaction date *</span><input type="date" value={form.transaction_date} onChange={(event) => setForm({ ...form, transaction_date: event.target.value })} /></label>
          <label className="earnings-field"><span>Amount *</span><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} /></label>
          <label className="earnings-field"><span>Status</span><select value={form.status} disabled={form.status === 'cancelled'} onChange={(event) => setForm({ ...form, status: event.target.value as EarningTransactionInput['status'] })}><option value="draft">Draft</option><option value="approved">Approved</option>{form.status === 'cancelled' && <option value="cancelled">Cancelled</option>}</select></label>
          <label className="earnings-field"><span>Reference</span><input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} placeholder="Voucher, memo, receipt, or batch reference" /></label>
          <label className="earnings-field"><span>Payroll period ID</span><input value={form.payroll_period_id} onChange={(event) => setForm({ ...form, payroll_period_id: event.target.value })} placeholder="Optional until payroll periods are configured" /></label>
          <label className="earnings-field earnings-field--wide"><span>Notes</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        </div>
        {selectedType && <div className="earnings-inline-note">{selectedType.name} · {selectedType.taxability === 'taxable' ? 'Taxable' : 'Non-taxable'} · {selectedType.include_in_gross ? 'Included in gross' : 'Excluded from gross'} · {selectedType.include_in_contribution_basis ? 'Included in contribution basis' : 'Excluded from contribution basis'}</div>}
        <div className="earnings-form-actions"><button className="earnings-primary-button" type="submit" disabled={saving || form.status === 'cancelled'}>{saving ? 'Saving…' : editing ? 'Update transaction' : 'Create transaction'}</button></div>
      </form>
    </section>
  );
}
