import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  DeductionAssignment,
  DeductionTransactionInput,
  DeductionTransactionStatus,
  DeductionType,
  EmployeeLoan,
} from '../../../models/Deductions';
import type { Employee } from '../../../models/Employee';
import { today } from './deductions-utils';

const emptyForm: DeductionTransactionInput = {
  employee_id: '', deduction_type_id: '', assignment_id: '', loan_id: '',
  transaction_date: today(), payroll_period_id: '', amount: 0,
  reference: '', notes: '', status: 'draft',
};

export default function DeductionTransactionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<DeductionTransactionInput>(emptyForm);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<DeductionType[]>([]);
  const [assignments, setAssignments] = useState<DeductionAssignment[]>([]);
  const [loans, setLoans] = useState<EmployeeLoan[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [employeeResult, typeResult] = await Promise.all([
          window.api.employee.list({ status: 'active' }),
          window.api.deductionType.list({ include_inactive: false }),
        ]);
        setEmployees(employeeResult.data);
        setTypes(typeResult.data);
        if (id) {
          const transaction = await window.api.deductionTransaction.get(id);
          if (!transaction) throw new Error('Deduction transaction not found.');
          setForm({
            employee_id: transaction.employee_id,
            deduction_type_id: transaction.deduction_type_id,
            assignment_id: transaction.assignment_id,
            loan_id: transaction.loan_id,
            transaction_date: transaction.transaction_date,
            payroll_period_id: transaction.payroll_period_id,
            amount: transaction.amount,
            reference: transaction.reference,
            notes: transaction.notes,
            status: transaction.status,
          });
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load deduction form.');
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!form.employee_id) {
      setAssignments([]);
      setLoans([]);
      return;
    }
    void (async () => {
      try {
        const [assignmentResult, loanResult] = await Promise.all([
          window.api.deductionAssignment.list({ employee_id: form.employee_id, include_inactive: false }),
          window.api.loan.list({ employee_id: form.employee_id, status: 'active' }),
        ]);
        setAssignments(assignmentResult.data);
        setLoans(loanResult.data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load employee deductions.');
      }
    })();
  }, [form.employee_id]);

  function selectAssignment(idValue: string) {
    const item = assignments.find((assignment) => assignment.id === idValue);
    if (!item) {
      setForm({ ...form, assignment_id: '', loan_id: '' });
      return;
    }
    setForm({
      ...form,
      assignment_id: item.id,
      loan_id: '',
      deduction_type_id: item.deduction_type_id,
      amount: item.amount,
    });
  }

  function selectLoan(idValue: string) {
    const loan = loans.find((item) => item.id === idValue);
    if (!loan) {
      setForm({ ...form, loan_id: '' });
      return;
    }
    setForm({
      ...form,
      loan_id: loan.id,
      assignment_id: '',
      deduction_type_id: loan.deduction_type_id,
      amount: Math.min(loan.installment_amount, loan.outstanding_balance),
    });
  }

  function selectType(idValue: string) {
    const type = types.find((item) => item.id === idValue);
    setForm({
      ...form,
      deduction_type_id: idValue,
      assignment_id: '',
      loan_id: '',
      amount: type?.default_amount ?? form.amount,
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const transaction = id
        ? await window.api.deductionTransaction.update(id, form)
        : await window.api.deductionTransaction.create(form);
      navigate(`/admin/deductions/${transaction.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save deduction.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="deductions-page">
      <div className="deductions-heading">
        <div><span>Deduction entry</span><h2>{id ? 'Edit Deduction' : 'Add Deduction'}</h2><p>Create a draft or approved payroll deduction transaction.</p></div>
        <Link className="deductions-secondary-link" to="/admin/deductions">Back to deductions</Link>
      </div>
      {error && <div className="deductions-alert deductions-alert--error">{error}</div>}
      <div className="deductions-form-card">
        <form className="deductions-form" onSubmit={submit}>
          <div className="deductions-form-grid deductions-form-grid--three">
            <label className="deductions-field"><span>Employee *</span><select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value, assignment_id: '', loan_id: '' })}><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}</select></label>
            <label className="deductions-field"><span>Recurring assignment</span><select value={form.assignment_id} onChange={(e) => selectAssignment(e.target.value)}><option value="">None</option>{assignments.map((item) => <option key={item.id} value={item.id}>{item.deduction_code} — {item.deduction_name}</option>)}</select></label>
            <label className="deductions-field"><span>Active loan</span><select value={form.loan_id} onChange={(e) => selectLoan(e.target.value)}><option value="">None</option>{loans.map((loan) => <option key={loan.id} value={loan.id}>{loan.loan_number} — {loan.deduction_name}</option>)}</select></label>
            <label className="deductions-field"><span>Deduction type *</span><select value={form.deduction_type_id} onChange={(e) => selectType(e.target.value)}><option value="">Select type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.code} — {type.name}</option>)}</select></label>
            <label className="deductions-field"><span>Transaction date *</span><input type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} /></label>
            <label className="deductions-field"><span>Amount *</span><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></label>
            <label className="deductions-field"><span>Reference</span><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></label>
            <label className="deductions-field"><span>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as DeductionTransactionStatus })}><option value="draft">Draft</option><option value="approved">Approved</option></select></label>
          </div>
          <label className="deductions-field"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <div className="deductions-form-actions"><Link className="deductions-button" to="/admin/deductions">Cancel</Link><button className="deductions-button deductions-button--primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save deduction'}</button></div>
        </form>
      </div>
    </section>
  );
}
