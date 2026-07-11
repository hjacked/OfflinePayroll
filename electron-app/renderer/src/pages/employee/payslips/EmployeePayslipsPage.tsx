import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Employee } from '../../../models/Employee';
import type { Payslip } from '../../../models/Payslip';
import { formatCurrency, formatDate } from '../../admin/payslips/payslip-utils';

export default function EmployeePayslipsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const result = await window.api.employee.list({ status: 'active' });
        setEmployees(result.data);
        if (result.data[0]) setEmployeeId(result.data[0].id);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load employee profiles.');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    setError('');
    void window.api.payslip.employeeList(employeeId).then((result) => {
      setPayslips(result.data);
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Unable to load published payslips.');
    }).finally(() => setLoading(false));
  }, [employeeId]);

  const employee = employees.find((item) => item.id === employeeId);

  return (
    <section className="payslip-page employee-payslip-page">
      <div className="payslip-heading">
        <div>
          <span>Employee self-service</span>
          <h1>My Payslips</h1>
          <p>View, print, and download published payroll documents.</p>
        </div>
        <label className="payslip-field employee-payslip-selector">
          <span>Employee profile</span>
          <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            {employees.map((item) => (
              <option key={item.id} value={item.id}>
                {item.employee_number} — {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {employee && (
        <div className="employee-payslip-identity">
          <div>
            <strong>{employee.name}</strong>
            <span>{employee.department || 'No department'} · {employee.role_title || 'No position'}</span>
          </div>
          <span>{payslips.length} published payslip{payslips.length === 1 ? '' : 's'}</span>
        </div>
      )}

      {error && <div className="payslip-alert payslip-alert--error">{error}</div>}

      <div className="payslip-panel">
        {loading ? (
          <div className="payslip-empty">Loading published payslips…</div>
        ) : payslips.length === 0 ? (
          <div className="payslip-empty">No published payslips are available for this employee.</div>
        ) : (
          <div className="employee-payslip-grid">
            {payslips.map((payslip) => (
              <article className="employee-payslip-card" key={payslip.id}>
                <div>
                  <span>{payslip.period_name}</span>
                  <strong>{formatCurrency(payslip.net_pay)}</strong>
                  <small>Net pay</small>
                </div>
                <dl>
                  <div><dt>Payment date</dt><dd>{formatDate(payslip.payment_date)}</dd></div>
                  <div><dt>Gross income</dt><dd>{formatCurrency(payslip.gross_income)}</dd></div>
                  <div><dt>Deductions</dt><dd>{formatCurrency(payslip.total_deductions)}</dd></div>
                  <div><dt>Reference</dt><dd>{payslip.reference_number}</dd></div>
                </dl>
                <Link className="payslip-button payslip-button--full" to={`/employee/payslips/${payslip.id}?employee=${employeeId}`}>
                  View payslip
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>

      <p className="employee-payslip-note">
        Development note: the employee selector represents the signed-in employee until authentication is added.
      </p>
    </section>
  );
}
