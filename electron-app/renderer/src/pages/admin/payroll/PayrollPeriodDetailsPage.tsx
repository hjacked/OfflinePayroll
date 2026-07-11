import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { PayrollPeriodDetails } from '../../../models/PayrollPeriod';
import { formatCurrency, formatDate, statusLabel } from './payroll-utils';

export default function PayrollPeriodDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState<PayrollPeriodDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await window.api.payroll.details(id);
      if (!result) throw new Error('Payroll period was not found.');
      setDetails(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load payroll period.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function act(action: 'calculate' | 'approve' | 'finalize' | 'lock' | 'cancel') {
    if ((action === 'finalize' || action === 'lock' || action === 'cancel') && !window.confirm(`Continue with ${action}?`)) return;
    setWorking(true);
    setError('');
    setMessage('');
    try {
      if (action === 'calculate') await window.api.payroll.calculate(id, 'Payroll Officer');
      else if (action === 'approve') await window.api.payroll.approve(id, 'Payroll Officer');
      else if (action === 'finalize') await window.api.payroll.finalize(id, 'Payroll Officer');
      else if (action === 'lock') await window.api.payroll.lock(id, 'Payroll Officer');
      else await window.api.payroll.cancel(id, 'Payroll Officer');
      setMessage(`Payroll ${action} completed successfully.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to ${action} payroll.`);
    } finally {
      setWorking(false);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this payroll period? This cannot be undone.')) return;
    try {
      await window.api.payroll.deletePeriod(id);
      navigate('/admin/payroll');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete payroll period.');
    }
  }

  if (loading) return <div className="payroll-empty">Loading payroll period…</div>;
  if (!details) return <div className="payroll-alert payroll-alert--error">{error || 'Payroll period was not found.'}</div>;
  const { period, employees, issues } = details;

  return (
    <section className="payroll-page">
      <div className="payroll-heading">
        <div><span>Payroll period</span><h2>{period.name}</h2><p>{formatDate(period.start_date)} to {formatDate(period.end_date)} · Payment {formatDate(period.payment_date)}</p></div>
        <div className="payroll-actions"><Link className="payroll-button" to="/admin/payroll">Back</Link>{['draft', 'calculated'].includes(period.workflow_status) && <Link className="payroll-button" to={`/admin/payroll/${period.id}/edit`}>Edit</Link>}<Link className="payroll-button" to={`/admin/payroll/${period.id}/register`}>Payroll register</Link></div>
      </div>

      {error && <div className="payroll-alert payroll-alert--error">{error}</div>}
      {message && <div className="payroll-alert payroll-alert--success">{message}</div>}

      <div className="payroll-period-banner">
        <div><span>Status</span><strong className={`payroll-status payroll-status--${period.workflow_status}`}>{statusLabel(period.workflow_status)}</strong></div>
        <div><span>Employees</span><strong>{period.employee_count}</strong></div>
        <div><span>Gross income</span><strong>{formatCurrency(period.gross_total)}</strong></div>
        <div><span>Total deductions</span><strong>{formatCurrency(period.deduction_total)}</strong></div>
        <div><span>Net payroll</span><strong>{formatCurrency(period.net_total)}</strong></div>
      </div>

      <div className="payroll-actions payroll-workflow-actions">
        {['draft', 'calculated'].includes(period.workflow_status) && <button className="payroll-button payroll-button--primary" disabled={working} onClick={() => void act('calculate')}>{period.workflow_status === 'calculated' ? 'Recalculate payroll' : 'Calculate payroll'}</button>}
        {period.workflow_status === 'calculated' && <button className="payroll-button payroll-button--primary" disabled={working || period.validation_error_count > 0} onClick={() => void act('approve')}>Approve payroll</button>}
        {period.workflow_status === 'approved' && <button className="payroll-button payroll-button--primary" disabled={working} onClick={() => void act('finalize')}>Finalize and post</button>}
        {period.workflow_status === 'finalized' && <button className="payroll-button payroll-button--primary" disabled={working} onClick={() => void act('lock')}>Lock payroll</button>}
        {['draft', 'calculated', 'approved'].includes(period.workflow_status) && <button className="payroll-button payroll-button--danger" disabled={working} onClick={() => void act('cancel')}>Cancel period</button>}
        {['draft', 'calculated'].includes(period.workflow_status) && <button className="payroll-button payroll-button--danger" disabled={working} onClick={() => void remove()}>Delete</button>}
      </div>

      <div className="payroll-two-column">
        <div className="payroll-panel">
          <div className="payroll-panel__header"><div><h3>Validation</h3><p>Errors block approval. Warnings should be reviewed.</p></div><span className="payroll-validation-summary">{period.validation_error_count} errors · {period.validation_warning_count} warnings</span></div>
          {issues.length === 0 ? <div className="payroll-empty">No validation issues.</div> : <div className="payroll-issue-list">{issues.map((issue) => <article className={`payroll-issue payroll-issue--${issue.severity}`} key={issue.id}><strong>{issue.employee_name}</strong><span>{issue.code}</span><p>{issue.message}</p></article>)}</div>}
        </div>
        <div className="payroll-panel">
          <div className="payroll-panel__header"><div><h3>Calculation settings</h3><p>Assumptions applied to this period.</p></div></div>
          <dl className="payroll-details"><div><dt>Frequency</dt><dd>{period.frequency}</dd></div><div><dt>Workdays / month</dt><dd>{period.workdays_per_month}</dd></div><div><dt>Hours / day</dt><dd>{period.hours_per_day}</dd></div><div><dt>Overtime multiplier</dt><dd>{period.overtime_multiplier}</dd></div><div><dt>Night differential</dt><dd>{(period.night_differential_rate * 100).toFixed(2)}%</dd></div><div><dt>Employer contributions</dt><dd>{formatCurrency(period.employer_contribution_total)}</dd></div></dl>
        </div>
      </div>

      <div className="payroll-panel">
        <div className="payroll-panel__header"><div><h3>Employee payroll results</h3><p>Open an employee to inspect earnings, deductions, attendance, and contribution details.</p></div></div>
        {employees.length === 0 ? <div className="payroll-empty">Calculate payroll to create employee results.</div> : <div className="payroll-table-wrap"><table className="payroll-table"><thead><tr><th>Employee</th><th>Basic pay</th><th>Other earnings</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Validation</th></tr></thead><tbody>{employees.map((employee) => <tr key={employee.id}><td><Link to={`/admin/payroll/${period.id}/employees/${employee.employee_id}`}><strong>{employee.employee_name}</strong></Link><span>{employee.employee_number} · {employee.department || 'No department'}</span></td><td>{formatCurrency(employee.period_basic_pay)}</td><td>{formatCurrency(employee.overtime_pay + employee.night_differential_pay + employee.other_earnings)}</td><td>{formatCurrency(employee.gross_income)}</td><td>{formatCurrency(employee.total_deductions)}</td><td><strong>{formatCurrency(employee.net_pay)}</strong></td><td><span className={`payroll-validation payroll-validation--${employee.validation_status}`}>{employee.validation_status}</span></td></tr>)}</tbody></table></div>}
      </div>

      {details.actions.length > 0 && <div className="payroll-panel"><div className="payroll-panel__header"><div><h3>Activity log</h3><p>Workflow actions recorded for this payroll period.</p></div></div><div className="payroll-action-list">{details.actions.map((action) => <article key={action.id}><strong>{action.action}</strong><span>{action.actor || 'System'} · {action.created_at}</span><p>{action.notes}</p></article>)}</div></div>}
    </section>
  );
}
