import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Payslip, PayslipOptions } from '../../../models/Payslip';
import { formatCurrency, formatDate } from './payslip-utils';

export default function PayslipPublishPage() {
  const [options, setOptions] = useState<PayslipOptions>({ periods: [], employees: [] });
  const [periodId, setPeriodId] = useState('');
  const [actor, setActor] = useState('Payroll Administrator');
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void window.api.payslip.options().then((result) => {
      setOptions(result);
      if (result.periods[0]) setPeriodId(result.periods[0].id);
    }).catch((caught: unknown) => {
      setError(caught instanceof Error ? caught.message : 'Unable to load payroll periods.');
    });
  }, []);

  const load = useCallback(async () => {
    if (!periodId) {
      setPayslips([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await window.api.payslip.list({ period_id: periodId });
      setPayslips(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load the publication queue.');
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    void load();
  }, [load]);

  const draftCount = useMemo(
    () => payslips.filter((payslip) => payslip.status === 'draft').length,
    [payslips],
  );
  const publishedCount = payslips.length - draftCount;
  const period = options.periods.find((item) => item.id === periodId);

  async function publishAll() {
    if (!periodId || draftCount === 0) return;
    if (!window.confirm(`Publish ${draftCount} draft payslip${draftCount === 1 ? '' : 's'}?`)) return;
    setPublishing(true);
    setError('');
    setMessage('');
    try {
      const result = await window.api.payslip.publishPeriod(periodId, actor);
      setPayslips(result.data);
      setMessage(`${result.updated} payslip${result.updated === 1 ? '' : 's'} published successfully.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to publish payslips.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <section className="payslip-page">
      <div className="payslip-heading">
        <div>
          <span>Employee release</span>
          <h1>Payslip Publication Queue</h1>
          <p>Review generated payslips before making them available in the Employee Portal.</p>
        </div>
        <Link className="payslip-button payslip-button--secondary" to="/admin/payslips">
          Back to payslips
        </Link>
      </div>

      {error && <div className="payslip-alert payslip-alert--error">{error}</div>}
      {message && <div className="payslip-alert payslip-alert--success">{message}</div>}

      <div className="payslip-panel payslip-publication-controls">
        <label className="payslip-field">
          <span>Payroll period</span>
          <select value={periodId} onChange={(event) => setPeriodId(event.target.value)}>
            <option value="">Select a period</option>
            {options.periods.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="payslip-field">
          <span>Published by</span>
          <input value={actor} onChange={(event) => setActor(event.target.value)} />
        </label>
        <button
          type="button"
          className="payslip-button"
          disabled={!periodId || draftCount === 0 || publishing}
          onClick={() => void publishAll()}
        >
          {publishing ? 'Publishing…' : `Publish all drafts (${draftCount})`}
        </button>
      </div>

      {period && (
        <div className="payslip-publication-summary">
          <div><span>Payroll period</span><strong>{period.name}</strong><small>Paid {formatDate(period.payment_date)}</small></div>
          <div><span>Total payslips</span><strong>{payslips.length}</strong></div>
          <div><span>Draft</span><strong>{draftCount}</strong></div>
          <div><span>Published</span><strong>{publishedCount}</strong></div>
        </div>
      )}

      <div className="payslip-panel">
        {loading ? (
          <div className="payslip-empty">Loading publication queue…</div>
        ) : payslips.length === 0 ? (
          <div className="payslip-empty">No payslips have been generated for this period.</div>
        ) : (
          <div className="payslip-table-wrap">
            <table className="payslip-table">
              <thead><tr><th>Employee</th><th>Reference</th><th>Gross</th><th>Deductions</th><th>Net pay</th><th>Status</th><th /></tr></thead>
              <tbody>
                {payslips.map((payslip) => (
                  <tr key={payslip.id}>
                    <td><strong>{payslip.employee_name}</strong><span>{payslip.employee_number}</span></td>
                    <td><code>{payslip.reference_number}</code></td>
                    <td>{formatCurrency(payslip.gross_income)}</td>
                    <td>{formatCurrency(payslip.total_deductions)}</td>
                    <td><strong>{formatCurrency(payslip.net_pay)}</strong></td>
                    <td><span className={`payslip-status payslip-status--${payslip.status}`}>{payslip.status}</span></td>
                    <td><Link to={`/admin/payslips/${payslip.id}`}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
