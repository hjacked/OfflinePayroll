import { useEffect, useMemo, useState } from 'react';
import type { ContributionRecord } from '../../../models/Contributions';
import type { Employee } from '../../../models/Employee';
import { formatCurrency, formatDate, monthStart, statusLabel, today } from '../../admin/contributions/contribution-utils';

export default function EmployeeContributionsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const result = await window.api.employee.list({ status: 'active' });
        setEmployees(result.data);
        if (result.data[0]) setEmployeeId(result.data[0].id);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load employees.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    void (async () => {
      try {
        const result = await window.api.contributionRecord.list({
          employee_id: employeeId,
          status: 'all',
          date_from: monthStart(),
          date_to: today(),
        });
        setRecords(result.data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load contributions.');
      }
    })();
  }, [employeeId]);

  const totals = useMemo(() => records.reduce((current, record) => ({
    employee: current.employee + (record.status === 'cancelled' ? 0 : record.employee_share),
    employer: current.employer + (record.status === 'cancelled' ? 0 : record.employer_share),
    total: current.total + (record.status === 'cancelled' ? 0 : record.total_contribution),
  }), { employee: 0, employer: 0, total: 0 }), [records]);

  return (
    <section className="contributions-page employee-contributions-page">
      <div className="contributions-heading">
        <div><span>Employee self-service</span><h2>My Government Contributions</h2><p>Review recorded employee deductions, employer shares, and government membership details.</p></div>
        <label className="contributions-field"><span>Employee</span><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}</select></label>
      </div>
      {error && <div className="contributions-alert contributions-alert--error">{error}</div>}
      <div className="contributions-summary-grid"><article><span>Employee share</span><strong>{formatCurrency(totals.employee)}</strong><small>current month</small></article><article><span>Employer share</span><strong>{formatCurrency(totals.employer)}</strong><small>current month</small></article><article><span>Total contributions</span><strong>{formatCurrency(totals.total)}</strong><small>{records.length} records</small></article><article><span>Missing IDs</span><strong>{records.filter((record) => record.missing_government_number).length}</strong><small>contact HR to correct</small></article></div>
      <div className="contributions-panel"><div className="contributions-panel__header"><div><h3>Contribution history</h3><p>Current-month statutory contribution records.</p></div></div>{records.length === 0 ? <div className="contributions-empty">No contribution records are available for this employee.</div> : <div className="contributions-table-wrap"><table className="contributions-table"><thead><tr><th>Date</th><th>Contribution</th><th>Compensation basis</th><th>Employee share</th><th>Employer share</th><th>Government number</th><th>Status</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{formatDate(record.contribution_date)}</td><td><strong>{record.contribution_name}</strong><span>{record.table_version_name}</span></td><td>{formatCurrency(record.compensation_basis)}</td><td>{formatCurrency(record.employee_share)}</td><td>{formatCurrency(record.employer_share)}</td><td>{record.government_number || <span className="contributions-missing">Missing</span>}</td><td><span className={`contributions-status contributions-status--${record.status}`}>{statusLabel(record.status)}</span></td></tr>)}</tbody></table></div>}</div>
    </section>
  );
}
