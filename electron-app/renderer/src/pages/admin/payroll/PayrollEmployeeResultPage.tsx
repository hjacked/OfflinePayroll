import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PayrollEmployeeResult, PayrollPeriod } from '../../../models/PayrollPeriod';
import { formatCurrency, formatDate } from './payroll-utils';

export default function PayrollEmployeeResultPage() {
  const { id = '', employeeId = '' } = useParams();
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [result, setResult] = useState<PayrollEmployeeResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [periodResult, employeeResult] = await Promise.all([
          window.api.payroll.get(id),
          window.api.payroll.employeeResult(id, employeeId),
        ]);
        if (!periodResult || !employeeResult) throw new Error('Payroll employee result was not found.');
        setPeriod(periodResult);
        setResult(employeeResult);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load employee payroll result.');
      }
    })();
  }, [employeeId, id]);

  const groups = useMemo(() => {
    const items = result?.line_items ?? [];
    return {
      earnings: items.filter((item) => item.item_type === 'earning'),
      deductions: items.filter((item) => item.item_type === 'deduction' || item.item_type === 'contribution'),
      employer: items.filter((item) => item.item_type === 'employer-contribution'),
    };
  }, [result]);

  if (error) return <div className="payroll-alert payroll-alert--error">{error}</div>;
  if (!period || !result) return <div className="payroll-empty">Loading employee payroll result…</div>;

  return (
    <section className="payroll-page">
      <div className="payroll-heading"><div><span>Employee payroll</span><h2>{result.employee_name}</h2><p>{result.employee_number} · {period.name} · {formatDate(period.payment_date)}</p></div><Link className="payroll-button" to={`/admin/payroll/${period.id}`}>Back to payroll</Link></div>
      <div className="payroll-summary-grid"><article><span>Gross income</span><strong>{formatCurrency(result.gross_income)}</strong><small>all earnings</small></article><article><span>Total deductions</span><strong>{formatCurrency(result.total_deductions)}</strong><small>attendance, loans, deductions, statutory</small></article><article><span>Net pay</span><strong>{formatCurrency(result.net_pay)}</strong><small>employee payable</small></article><article><span>Employer contributions</span><strong>{formatCurrency(result.employer_contributions)}</strong><small>company liability</small></article></div>
      <div className="payroll-two-column">
        <div className="payroll-panel"><div className="payroll-panel__header"><div><h3>Attendance summary</h3><p>Attendance data used in this calculation.</p></div></div><dl className="payroll-details"><div><dt>Attendance records</dt><dd>{result.attendance_days}</dd></div><div><dt>Paid days</dt><dd>{result.paid_days}</dd></div><div><dt>Absent / unpaid days</dt><dd>{result.absent_days}</dd></div><div><dt>Paid leave days</dt><dd>{result.paid_leave_days}</dd></div><div><dt>Regular hours</dt><dd>{result.regular_hours}</dd></div><div><dt>Overtime hours</dt><dd>{result.overtime_hours}</dd></div><div><dt>Late minutes</dt><dd>{result.late_minutes}</dd></div><div><dt>Undertime minutes</dt><dd>{result.undertime_minutes}</dd></div></dl></div>
        <div className="payroll-panel"><div className="payroll-panel__header"><div><h3>Compensation bases</h3><p>Values used for taxable and contribution calculations.</p></div></div><dl className="payroll-details"><div><dt>Salary type</dt><dd>{result.salary_type}</dd></div><div><dt>Master basic salary</dt><dd>{formatCurrency(result.basic_salary)}</dd></div><div><dt>Period basic pay</dt><dd>{formatCurrency(result.period_basic_pay)}</dd></div><div><dt>Taxable income</dt><dd>{formatCurrency(result.taxable_income)}</dd></div><div><dt>Contribution basis</dt><dd>{formatCurrency(result.contribution_basis)}</dd></div><div><dt>Validation</dt><dd><span className={`payroll-validation payroll-validation--${result.validation_status}`}>{result.validation_status}</span></dd></div></dl></div>
      </div>
      <LineItemPanel title="Earnings" description="Basic pay, overtime, allowances, bonuses, and other income." items={groups.earnings} />
      <LineItemPanel title="Deductions" description="Attendance deductions, assignments, loans, and employee government shares." items={groups.deductions} />
      <LineItemPanel title="Employer Contributions" description="Employer statutory contribution shares recorded outside employee deductions." items={groups.employer} />
    </section>
  );
}

function LineItemPanel({ title, description, items }: { title: string; description: string; items: NonNullable<PayrollEmployeeResult['line_items']> }) {
  return <div className="payroll-panel"><div className="payroll-panel__header"><div><h3>{title}</h3><p>{description}</p></div><strong>{formatCurrency(items.reduce((sum, item) => sum + item.amount, 0))}</strong></div>{items.length === 0 ? <div className="payroll-empty">No items.</div> : <div className="payroll-table-wrap"><table className="payroll-table"><thead><tr><th>Code</th><th>Description</th><th>Source</th><th>Taxable</th><th>Amount</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.code || '—'}</td><td><strong>{item.name}</strong></td><td>{item.source_type}</td><td>{item.taxable ? 'Yes' : 'No'}</td><td><strong>{formatCurrency(item.amount)}</strong></td></tr>)}</tbody></table></div>}</div>;
}
