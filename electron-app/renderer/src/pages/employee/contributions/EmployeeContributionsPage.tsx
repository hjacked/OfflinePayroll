import { useEffect, useState } from 'react';
import type { SelfServiceContributions } from '../../../models/SelfService';

export default function EmployeeContributionsPage() {
  const [data, setData] = useState<SelfServiceContributions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void window.api.selfService.contributions().then(setData).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Unable to load your contributions.');
    }).finally(() => setLoading(false));
  }, []);

  return <section className="contributions-page employee-contributions-page"><div className="contributions-heading"><div><span>Employee self-service</span><h1>My Government Contributions</h1><p>Review employee deductions, employer shares, government numbers, and remittance status.</p></div></div>{error && <div className="contributions-alert contributions-alert--error">{error}</div>}<div className="contributions-summary-grid"><Summary label="Employee share" value={money(data?.summary.employee_share ?? 0)} /><Summary label="Employer share" value={money(data?.summary.employer_share ?? 0)} /><Summary label="Total contribution" value={money(data?.summary.total_contribution ?? 0)} /><Summary label="Contribution records" value={data?.summary.record_count ?? 0} /></div><div className="contributions-panel">{loading ? <div className="contributions-empty">Loading contribution history…</div> : !data || data.records.length === 0 ? <div className="contributions-empty">No contribution records are available.</div> : <div className="contributions-table-wrap"><table className="contributions-table"><thead><tr><th>Date</th><th>Contribution</th><th>Compensation basis</th><th>Employee share</th><th>Employer share</th><th>Status</th></tr></thead><tbody>{data.records.map((record) => <tr key={record.id}><td>{date(record.contribution_date)}</td><td><strong>{record.contribution_name}</strong><span>{record.government_number || 'Government number unavailable'}</span></td><td>{money(record.compensation_basis)}</td><td>{money(record.employee_share)}</td><td>{money(record.employer_share)}</td><td><span className={`contributions-status contributions-status--${record.status}`}>{title(record.status)}</span></td></tr>)}</tbody></table></div>}</div></section>;
}

function Summary({ label, value }: { label: string; value: string | number }) { return <article className="contributions-summary-card"><span>{label}</span><strong>{value}</strong></article>; }
function money(value: number) { return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value || 0)); }
function date(value: string) { if (!value) return '—'; return new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`)); }
function title(value: string) { return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('-', ' '); }
