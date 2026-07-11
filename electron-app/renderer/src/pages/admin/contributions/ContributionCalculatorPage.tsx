import { useEffect, useMemo, useState } from 'react';
import type { ContributionCalculationResult, ContributionType } from '../../../models/Contributions';
import type { Employee } from '../../../models/Employee';
import { formatCurrency, today } from './contribution-utils';

export default function ContributionCalculatorPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<ContributionType[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [date, setDate] = useState(today());
  const [basis, setBasis] = useState(0);
  const [result, setResult] = useState<ContributionCalculationResult | null>(null);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'approved'>('draft');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [employeeResult, typeResult] = await Promise.all([
          window.api.employee.list({ status: 'active' }),
          window.api.contributionType.list({ include_inactive: false }),
        ]);
        setEmployees(employeeResult.data);
        setTypes(typeResult.data);
        if (employeeResult.data[0]) {
          setEmployeeId(employeeResult.data[0].id);
          setBasis(employeeResult.data[0].basic_salary || 0);
        }
        if (typeResult.data[0]) setTypeId(typeResult.data[0].id);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load calculator data.');
      }
    })();
  }, []);

  const employee = useMemo(() => employees.find((item) => item.id === employeeId), [employeeId, employees]);
  const type = useMemo(() => types.find((item) => item.id === typeId), [typeId, types]);

  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const calculated = await window.api.contribution.calculate({
        employee_id: employeeId,
        contribution_type_id: typeId,
        contribution_date: date,
        compensation_basis: basis,
      });
      setResult(calculated);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : 'Unable to calculate contribution.');
    }
  }

  async function save() {
    if (!result) return;
    setError('');
    setMessage('');
    try {
      await window.api.contributionRecord.create({
        employee_id: result.employee_id,
        contribution_type_id: result.contribution_type_id,
        contribution_date: result.contribution_date,
        compensation_basis: result.compensation_basis,
        table_version_id: result.table_version_id,
        reference,
        notes,
        status,
      });
      setMessage('Contribution record saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save contribution record.');
    }
  }

  return (
    <section className="contributions-page">
      <div className="contributions-heading"><div><span>Calculation preview</span><h2>Contribution Calculator</h2><p>Preview employee and employer shares using the active table effective on the selected date.</p></div></div>
      {error && <div className="contributions-alert contributions-alert--error">{error}</div>}
      {message && <div className="contributions-alert contributions-alert--success">{message}</div>}

      <div className="contributions-two-column">
        <form className="contributions-panel contributions-form" onSubmit={calculate}>
          <div className="contributions-panel__header"><div><h3>Calculation input</h3><p>The employee basic salary is used as the initial compensation basis and can be adjusted.</p></div></div>
          <div className="contributions-form-grid">
            <label><span>Employee</span><select value={employeeId} onChange={(event) => { const next = event.target.value; setEmployeeId(next); const selected = employees.find((item) => item.id === next); if (selected) setBasis(selected.basic_salary || 0); }} required><option value="">Select employee</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.employee_number} — {item.name}</option>)}</select></label>
            <label><span>Contribution type</span><select value={typeId} onChange={(event) => setTypeId(event.target.value)} required><option value="">Select contribution</option>{types.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</select></label>
            <label><span>Contribution date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
            <label><span>Compensation basis</span><input type="number" min="0" step="0.01" value={basis} onChange={(event) => setBasis(Number(event.target.value))} required /></label>
          </div>
          <div className="contributions-actions"><button className="contributions-button contributions-button--primary" type="submit">Calculate</button></div>
          {employee && <div className="contributions-identity"><strong>{employee.name}</strong><span>{employee.department || 'No department'} · {employee.role_title || 'No position'}</span></div>}
          {type && <div className="contributions-note">Active method: <strong>{type.calculation_method}</strong>. Required ID field: <strong>{type.government_number_field}</strong>.</div>}
        </form>

        <div className="contributions-panel">
          <div className="contributions-panel__header"><div><h3>Calculation result</h3><p>Review the table version and bracket before saving.</p></div></div>
          {!result ? <div className="contributions-empty">Run a calculation to view the contribution breakdown.</div> : (
            <>
              {result.missing_government_number && <div className="contributions-alert contributions-alert--warning">The employee government number is missing. You may save a draft, but correct the employee record before approval or remittance.</div>}
              <div className="contributions-result-grid">
                <article><span>Compensation basis</span><strong>{formatCurrency(result.compensation_basis)}</strong></article>
                <article><span>Employee share</span><strong>{formatCurrency(result.employee_share)}</strong></article>
                <article><span>Employer share</span><strong>{formatCurrency(result.employer_share)}</strong></article>
                <article><span>Total contribution</span><strong>{formatCurrency(result.total_contribution)}</strong></article>
              </div>
              <dl className="contributions-details"><div><dt>Employee</dt><dd>{result.employee_number} — {result.employee_name}</dd></div><div><dt>Contribution</dt><dd>{result.contribution_code} — {result.contribution_name}</dd></div><div><dt>Table</dt><dd>{result.table_version_name}</dd></div><div><dt>Government number</dt><dd>{result.government_number || 'Missing'}</dd></div><div><dt>Bracket range</dt><dd>{formatCurrency(result.bracket.min_compensation)} to {result.bracket.max_compensation === null ? 'No maximum' : formatCurrency(result.bracket.max_compensation)}</dd></div></dl>
              <div className="contributions-form-grid">
                <label><span>Record status</span><select value={status} onChange={(event) => setStatus(event.target.value as 'draft' | 'approved')}><option value="draft">Draft</option><option value="approved">Approved</option></select></label>
                <label><span>Reference</span><input value={reference} onChange={(event) => setReference(event.target.value)} /></label>
                <label className="contributions-field--wide"><span>Notes</span><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
              </div>
              <div className="contributions-actions"><button className="contributions-button contributions-button--primary" type="button" onClick={() => void save()}>Save contribution record</button></div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
