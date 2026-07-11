import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { DeductionType, DeductionFrequency, EmployeeLoanInput, LoanStatus } from '../../../models/Deductions';
import type { Employee } from '../../../models/Employee';
import { formatCurrency, today } from './deductions-utils';

const emptyForm: EmployeeLoanInput = {
  employee_id: '', deduction_type_id: '', loan_number: '', principal_amount: 0,
  interest_rate: 0, loan_date: today(), first_deduction_date: today(), number_of_installments: 12,
  deduction_frequency: 'semimonthly', status: 'draft', notes: '',
};

export default function LoanFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<EmployeeLoanInput>(emptyForm);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<DeductionType[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [employeeResult, typeResult] = await Promise.all([
          window.api.employee.list({ status: 'active' }),
          window.api.deductionType.list({ category: 'loan', include_inactive: false }),
        ]);
        setEmployees(employeeResult.data); setTypes(typeResult.data);
        if (id) {
          const loan = await window.api.loan.get(id);
          if (!loan) throw new Error('Loan not found.');
          setForm({ employee_id: loan.employee_id, deduction_type_id: loan.deduction_type_id,
            loan_number: loan.loan_number, principal_amount: loan.principal_amount,
            interest_rate: loan.interest_rate, loan_date: loan.loan_date,
            first_deduction_date: loan.first_deduction_date, number_of_installments: loan.number_of_installments,
            deduction_frequency: loan.deduction_frequency, status: loan.status, notes: loan.notes });
        }
      } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to load loan form.'); }
    })();
  }, [id]);

  const total = useMemo(() => form.principal_amount * (1 + form.interest_rate / 100), [form.principal_amount, form.interest_rate]);
  const installment = useMemo(() => form.number_of_installments > 0 ? total / form.number_of_installments : 0, [total, form.number_of_installments]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const loan = id ? await window.api.loan.update(id, form) : await window.api.loan.create(form);
      navigate(`/admin/deductions/loans/${loan.id}`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to save loan.'); }
    finally { setSaving(false); }
  }

  return <section className="deductions-page">
    <div className="deductions-heading"><div><span>Loan setup</span><h2>{id ? 'Edit Employee Loan' : 'Create Employee Loan'}</h2><p>Define principal, interest, installments, schedule, and starting status.</p></div><Link className="deductions-secondary-link" to="/admin/deductions/loans">Back to loans</Link></div>
    {error && <div className="deductions-alert deductions-alert--error">{error}</div>}
    <div className="deductions-summary-grid"><article className="deductions-summary-card"><span>Total payable</span><strong>{formatCurrency(total)}</strong><small>principal plus interest</small></article><article className="deductions-summary-card"><span>Installment</span><strong>{formatCurrency(installment)}</strong><small>estimated per deduction</small></article></div>
    <div className="deductions-form-card"><form className="deductions-form" onSubmit={submit}>
      <div className="deductions-form-grid deductions-form-grid--three">
        <label className="deductions-field"><span>Employee *</span><select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}><option value="">Select employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}</select></label>
        <label className="deductions-field"><span>Loan type *</span><select value={form.deduction_type_id} onChange={(e) => setForm({ ...form, deduction_type_id: e.target.value })}><option value="">Select loan type</option>{types.map((type) => <option key={type.id} value={type.id}>{type.code} — {type.name}</option>)}</select></label>
        <label className="deductions-field"><span>Loan number *</span><input value={form.loan_number} onChange={(e) => setForm({ ...form, loan_number: e.target.value })} /></label>
        <label className="deductions-field"><span>Principal *</span><input type="number" min="0.01" step="0.01" value={form.principal_amount} onChange={(e) => setForm({ ...form, principal_amount: Number(e.target.value) })} /></label>
        <label className="deductions-field"><span>Interest rate (%)</span><input type="number" min="0" max="100" step="0.01" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: Number(e.target.value) })} /></label>
        <label className="deductions-field"><span>Number of installments *</span><input type="number" min="1" step="1" value={form.number_of_installments} onChange={(e) => setForm({ ...form, number_of_installments: Number(e.target.value) })} /></label>
        <label className="deductions-field"><span>Loan date *</span><input type="date" value={form.loan_date} onChange={(e) => setForm({ ...form, loan_date: e.target.value })} /></label>
        <label className="deductions-field"><span>First deduction *</span><input type="date" value={form.first_deduction_date} onChange={(e) => setForm({ ...form, first_deduction_date: e.target.value })} /></label>
        <label className="deductions-field"><span>Frequency</span><select value={form.deduction_frequency} onChange={(e) => setForm({ ...form, deduction_frequency: e.target.value as DeductionFrequency })}><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="semimonthly">Semimonthly</option><option value="monthly">Monthly</option></select></label>
        <label className="deductions-field"><span>Status</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LoanStatus })}><option value="draft">Draft</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      <label className="deductions-field"><span>Notes</span><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
      <div className="deductions-form-actions"><Link className="deductions-button" to="/admin/deductions/loans">Cancel</Link><button className="deductions-button deductions-button--primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save loan'}</button></div>
    </form></div>
  </section>;
}
