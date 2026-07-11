import { useEffect, useState } from 'react';
import type { Employee } from '../../../models/Employee';
import type { EmployeePayrollHistoryRecord } from '../../../models/PayrollPeriod';
import { formatCurrency, formatDate, statusLabel } from '../../admin/payroll/payroll-utils';

export default function EmployeePayrollHistoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [history, setHistory] = useState<EmployeePayrollHistoryRecord[]>([]);
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
    void window.api.payroll.employeeHistory({ employee_id: employeeId }).then((result) => {
      setHistory(result.data);
      setError('');
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Unable to load payroll history.');
    });
  }, [employeeId]);

  return <section className="payroll-page employee-payroll-page"><div className="payroll-heading"><div><span>Employee self-service</span><h2>My Payroll History</h2><p>Review finalized payroll periods, earnings, deductions, and net pay.</p></div><label className="payroll-field"><span>Employee</span><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_number} — {employee.name}</option>)}</select></label></div>{error && <div className="payroll-alert payroll-alert--error">{error}</div>}<div className="payroll-panel">{history.length === 0 ? <div className="payroll-empty">No finalized payroll records are available for this employee.</div> : <div className="payroll-table-wrap"><table className="payroll-table"><thead><tr><th>Payroll period</th><th>Payment date</th><th>Gross income</th><th>Total deductions</th><th>Net pay</th><th>Status</th></tr></thead><tbody>{history.map((record) => <tr key={record.id}><td><strong>{record.period_name}</strong><span>{formatDate(record.start_date)} to {formatDate(record.end_date)}</span></td><td>{formatDate(record.payment_date)}</td><td>{formatCurrency(record.gross_income)}</td><td>{formatCurrency(record.total_deductions)}</td><td><strong>{formatCurrency(record.net_pay)}</strong></td><td><span className={`payroll-status payroll-status--${record.workflow_status}`}>{statusLabel(record.workflow_status)}</span></td></tr>)}</tbody></table></div>}</div></section>;
}
