import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PayrollRegister } from '../../../models/PayrollPeriod';
import { formatCurrency, formatDate } from './payroll-utils';

export default function PayrollRegisterPage() {
  const { id = '' } = useParams();
  const [register, setRegister] = useState<PayrollRegister | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.api.payroll.register(id).then(setRegister).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Unable to load payroll register.');
    });
  }, [id]);

  function exportCsv() {
    if (!register) return;
    const headers = ['Employee Number', 'Employee Name', 'Department', 'Basic Pay', 'Overtime and Night Differential', 'Other Earnings', 'Gross Income', 'Attendance Deductions', 'Other Deductions', 'Government Deductions', 'Total Deductions', 'Net Pay'];
    const rows = register.employees.map((employee) => [employee.employee_number, employee.employee_name, employee.department, employee.period_basic_pay, employee.overtime_pay + employee.night_differential_pay, employee.other_earnings, employee.gross_income, employee.attendance_deductions, employee.other_deductions, employee.government_deductions, employee.total_deductions, employee.net_pay]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${register.period.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-register.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (error) return <div className="payroll-alert payroll-alert--error">{error}</div>;
  if (!register) return <div className="payroll-empty">Loading payroll register…</div>;

  return <section className="payroll-page"><div className="payroll-heading"><div><span>Payroll report</span><h2>Payroll Register</h2><p>{register.period.name} · {formatDate(register.period.start_date)} to {formatDate(register.period.end_date)}</p></div><div className="payroll-actions"><Link className="payroll-button" to={`/admin/payroll/${register.period.id}`}>Back</Link><button type="button" className="payroll-button payroll-button--primary" onClick={exportCsv}>Export CSV</button></div></div><div className="payroll-summary-grid"><article><span>Basic pay</span><strong>{formatCurrency(register.totals.basic_pay)}</strong></article><article><span>Gross payroll</span><strong>{formatCurrency(register.totals.gross_income)}</strong></article><article><span>Total deductions</span><strong>{formatCurrency(register.totals.total_deductions)}</strong></article><article><span>Net payroll</span><strong>{formatCurrency(register.totals.net_pay)}</strong></article></div><div className="payroll-panel"><div className="payroll-table-wrap"><table className="payroll-table payroll-table--register"><thead><tr><th>Employee</th><th>Basic</th><th>OT / ND</th><th>Other earnings</th><th>Gross</th><th>Attendance</th><th>Other deductions</th><th>Government</th><th>Total deductions</th><th>Net pay</th></tr></thead><tbody>{register.employees.map((employee) => <tr key={employee.id}><td><strong>{employee.employee_name}</strong><span>{employee.employee_number} · {employee.department || 'No department'}</span></td><td>{formatCurrency(employee.period_basic_pay)}</td><td>{formatCurrency(employee.overtime_pay + employee.night_differential_pay)}</td><td>{formatCurrency(employee.other_earnings)}</td><td>{formatCurrency(employee.gross_income)}</td><td>{formatCurrency(employee.attendance_deductions)}</td><td>{formatCurrency(employee.other_deductions)}</td><td>{formatCurrency(employee.government_deductions)}</td><td>{formatCurrency(employee.total_deductions)}</td><td><strong>{formatCurrency(employee.net_pay)}</strong></td></tr>)}</tbody><tfoot><tr><th>Totals</th><th>{formatCurrency(register.totals.basic_pay)}</th><th>{formatCurrency(register.totals.overtime_pay)}</th><th>{formatCurrency(register.totals.other_earnings)}</th><th>{formatCurrency(register.totals.gross_income)}</th><th>{formatCurrency(register.totals.attendance_deductions)}</th><th>{formatCurrency(register.totals.other_deductions)}</th><th>{formatCurrency(register.totals.government_deductions)}</th><th>{formatCurrency(register.totals.total_deductions)}</th><th>{formatCurrency(register.totals.net_pay)}</th></tr></tfoot></table></div></div></section>;
}
