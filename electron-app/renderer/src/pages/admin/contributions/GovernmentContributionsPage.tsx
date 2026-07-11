import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ContributionRecord, ContributionSummary } from '../../../models/Contributions';
import { formatCurrency, formatDate, monthStart, statusLabel, today } from './contribution-utils';

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

export default function GovernmentContributionsPage() {
  const [summary, setSummary] = useState<ContributionSummary>(emptySummary);
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters = { date_from: monthStart(), date_to: today(), status: 'all' as const };
      const [summaryResult, recordResult] = await Promise.all([
        window.api.contributionRecord.summary(filters),
        window.api.contributionRecord.list(filters),
      ]);
      setSummary(summaryResult);
      setRecords(recordResult.data.slice(0, 8));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load government contributions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="contributions-page">
      <div className="contributions-heading">
        <div>
          <span>Statutory payroll</span>
          <h2>Government Contributions</h2>
          <p>Configure effective-dated contribution tables, calculate shares, and track remittances.</p>
        </div>
        <Link className="contributions-button contributions-button--primary" to="/admin/government-contributions/calculator">
          Calculate contribution
        </Link>
      </div>

      <div className="contributions-quick-links">
        <Link to="/admin/government-contributions/types">Contribution types</Link>
        <Link to="/admin/government-contributions/tables">Tables and brackets</Link>
        <Link to="/admin/government-contributions/history">Contribution history</Link>
        <Link to="/admin/government-contributions/reports">Remittance reports</Link>
      </div>

      {error && <div className="contributions-alert contributions-alert--error">{error}</div>}

      <div className="contributions-summary-grid">
        <article><span>Employee share</span><strong>{formatCurrency(summary.employee_share)}</strong><small>current month</small></article>
        <article><span>Employer share</span><strong>{formatCurrency(summary.employer_share)}</strong><small>current month</small></article>
        <article><span>Total liability</span><strong>{formatCurrency(summary.total_contribution)}</strong><small>{summary.record_count} records</small></article>
        <article><span>Missing IDs</span><strong>{summary.missing_number_count}</strong><small>records needing correction</small></article>
      </div>

      <div className="contributions-panel">
        <div className="contributions-panel__header">
          <div><h3>Recent contribution records</h3><p>Latest calculated employee and employer shares.</p></div>
          <button type="button" className="contributions-button" onClick={() => void load()}>Refresh</button>
        </div>
        {loading ? (
          <div className="contributions-empty">Loading contribution records…</div>
        ) : records.length === 0 ? (
          <div className="contributions-empty">No contribution records for the current month.</div>
        ) : (
          <div className="contributions-table-wrap">
            <table className="contributions-table">
              <thead><tr><th>Date</th><th>Employee</th><th>Contribution</th><th>Employee</th><th>Employer</th><th>Status</th></tr></thead>
              <tbody>{records.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.contribution_date)}</td>
                  <td><strong>{record.employee_name}</strong><span>{record.employee_number}</span></td>
                  <td>{record.contribution_name}</td>
                  <td>{formatCurrency(record.employee_share)}</td>
                  <td>{formatCurrency(record.employer_share)}</td>
                  <td><span className={`contributions-status contributions-status--${record.status}`}>{statusLabel(record.status)}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
