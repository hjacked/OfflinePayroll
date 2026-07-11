import { useEffect, useState } from 'react';
import type { SelfServiceEarnings } from '../../../models/SelfService';

export default function EmployeeEarningsPage() {
  const [data, setData] = useState<SelfServiceEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.api.selfService.earnings().then(setData).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load your earnings.');
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section className="earnings-page employee-earnings-page">
      <div className="earnings-heading"><div><span>Employee self-service</span><h1>My Earnings</h1><p>Review active allowances and approved additional income.</p></div></div>
      {error && <div className="earnings-alert earnings-alert--error">{error}</div>}
      <div className="earnings-summary-grid">
        <Summary label="Active assignments" value={data?.assignments.length ?? 0} />
        <Summary label="Approved transactions" value={data?.transactions.length ?? 0} />
        <Summary label="Approved amount" value={formatCurrency(data?.summary.approved ?? 0)} />
        <Summary label="Taxable amount" value={formatCurrency(data?.summary.taxable ?? 0)} />
      </div>
      <div className="earnings-panel"><div className="earnings-panel__heading"><div><h2>Recurring allowances</h2><p>Currently active earning assignments.</p></div></div>{loading ? <div className="earnings-empty">Loading earnings…</div> : !data || data.assignments.length === 0 ? <div className="earnings-empty">No active earning assignments are available.</div> : <div className="earnings-table-wrap"><table className="earnings-table"><thead><tr><th>Earning</th><th>Category</th><th>Amount</th><th>Effective</th><th>Taxability</th></tr></thead><tbody>{data.assignments.map((item) => <tr key={item.id}><td><strong>{item.earning_name}</strong><span>{item.earning_code}</span></td><td>{label(item.category)}</td><td>{formatCurrency(item.amount)}</td><td>{formatDate(item.effective_from)}{item.effective_to ? ` – ${formatDate(item.effective_to)}` : ''}</td><td>{label(item.taxability)}</td></tr>)}</tbody></table></div>}</div>
      <div className="earnings-panel"><div className="earnings-panel__heading"><div><h2>Approved earning history</h2><p>Bonuses, incentives, commissions, reimbursements, and adjustments.</p></div></div>{!data || data.transactions.length === 0 ? <div className="earnings-empty">No approved earning transactions are available.</div> : <div className="earnings-table-wrap"><table className="earnings-table"><thead><tr><th>Date</th><th>Earning</th><th>Amount</th><th>Payroll period</th><th>Reference</th></tr></thead><tbody>{data.transactions.map((item) => <tr key={item.id}><td>{formatDate(item.transaction_date)}</td><td><strong>{item.earning_name}</strong><span>{label(item.category)}</span></td><td>{formatCurrency(item.amount)}</td><td>{item.payroll_period_name || 'Not assigned'}</td><td>{item.reference || '—'}</td></tr>)}</tbody></table></div>}</div>
    </section>
  );
}

function Summary({ label: text, value }: { label: string; value: string | number }) { return <article className="earnings-summary-card"><span>{text}</span><strong>{value}</strong></article>; }
function formatCurrency(value: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0)); }
function formatDate(value: string) { if (!value) return '—'; return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`)); }
function label(value: string) { return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' '); }
