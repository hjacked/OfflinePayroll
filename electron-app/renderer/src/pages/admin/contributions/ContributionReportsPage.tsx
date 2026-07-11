import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContributionRecord, ContributionSummary } from '../../../models/Contributions';
import { formatCurrency, formatDate, monthStart, today } from './contribution-utils';

const emptySummary: ContributionSummary = {
  employee_share: 0,
  employer_share: 0,
  total_contribution: 0,
  record_count: 0,
  missing_number_count: 0,
  draft_count: 0,
  approved_count: 0,
  remitted_count: 0,
  by_type: [],
};

export default function ContributionReportsPage() {
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [summary, setSummary] = useState<ContributionSummary>(emptySummary);
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const filters = { date_from: dateFrom, date_to: dateTo, status: 'all' as const };
      const [summaryResult, recordResult] = await Promise.all([
        window.api.contributionRecord.summary(filters),
        window.api.contributionRecord.list(filters),
      ]);
      setSummary(summaryResult);
      setRecords(recordResult.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load contribution report.');
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { void load(); }, [load]);

  const missing = useMemo(() => records.filter((record) => record.missing_government_number), [records]);

  function exportCsv() {
    const header = ['Date','Employee Number','Employee','Contribution','Compensation Basis','Employee Share','Employer Share','Total','Government Number','Status'];
    const rows = records.map((record) => [
      record.contribution_date,
      record.employee_number,
      record.employee_name,
      record.contribution_name,
      record.compensation_basis,
      record.employee_share,
      record.employer_share,
      record.total_contribution,
      record.government_number,
      record.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `government-contributions-${dateFrom}-to-${dateTo}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="contributions-page">
      <div className="contributions-heading"><div><span>Remittance and audit</span><h2>Government Contribution Reports</h2><p>Review totals by contribution type and identify employees with missing government numbers.</p></div><button className="contributions-button contributions-button--primary" type="button" onClick={exportCsv} disabled={records.length === 0}>Export CSV</button></div>
      {error && <div className="contributions-alert contributions-alert--error">{error}</div>}
      <div className="contributions-toolbar"><label><span>From</span><input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label><span>To</span><input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><button className="contributions-button" type="button" onClick={() => void load()}>Run report</button></div>
      <div className="contributions-summary-grid"><article><span>Employee share</span><strong>{formatCurrency(summary.employee_share)}</strong></article><article><span>Employer share</span><strong>{formatCurrency(summary.employer_share)}</strong></article><article><span>Total remittance</span><strong>{formatCurrency(summary.total_contribution)}</strong></article><article><span>Missing IDs</span><strong>{summary.missing_number_count}</strong></article></div>

      <div className="contributions-two-column">
        <div className="contributions-panel"><div className="contributions-panel__header"><div><h3>Totals by contribution</h3><p>{formatDate(dateFrom)} to {formatDate(dateTo)}</p></div></div>{summary.by_type.length === 0 ? <div className="contributions-empty">No contribution totals for this period.</div> : <div className="contributions-table-wrap"><table className="contributions-table"><thead><tr><th>Contribution</th><th>Records</th><th>Employee</th><th>Employer</th><th>Total</th></tr></thead><tbody>{summary.by_type.map((row) => <tr key={row.contribution_type_id}><td><strong>{row.contribution_name}</strong><span>{row.contribution_code}</span></td><td>{row.record_count}</td><td>{formatCurrency(row.employee_share)}</td><td>{formatCurrency(row.employer_share)}</td><td><strong>{formatCurrency(row.total_contribution)}</strong></td></tr>)}</tbody></table></div>}</div>
        <div className="contributions-panel"><div className="contributions-panel__header"><div><h3>Missing government numbers</h3><p>Correct these employee profiles before remittance.</p></div></div>{missing.length === 0 ? <div className="contributions-empty">No missing government numbers in this report.</div> : <div className="contributions-stack">{missing.map((record) => <article className="contributions-list-card" key={record.id}><div><span className="contributions-code">{record.contribution_code}</span><h4>{record.employee_name}</h4><p>{record.employee_number} · {record.contribution_name}</p><small>{formatDate(record.contribution_date)}</small></div></article>)}</div>}</div>
      </div>
    </section>
  );
}
