import { useCallback, useEffect, useState } from 'react';
import type { ContributionReport, ReportFilters } from '../../../models/Reports';
import {
  downloadCsv,
  emptyReportFilters,
  formatCurrency,
  formatDate,
  ReportEmpty,
  ReportError,
  ReportFiltersBar,
  ReportHeading,
  ReportNotice,
  saveCurrentReportPdf,
  useReportOptions,
} from './reports-utils';

export default function ContributionsReportPage() {
  const { options, error: optionsError } = useReportOptions();
  const [filters, setFilters] = useState<ReportFilters>({ ...emptyReportFilters });
  const [report, setReport] = useState<ContributionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await window.api.report.contributions(filters));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load contribution report.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, []);

  const exportCsv = () => {
    if (!report) return;
    downloadCsv('government-contributions-report', [
      'Period', 'Payment Date', 'Employee Number', 'Employee Name', 'Department',
      'Code', 'Contribution', 'Employee Share', 'Employer Share', 'Total Contribution',
    ], report.rows.map((row) => [
      row.period_name, row.payment_date, row.employee_number, row.employee_name,
      row.department, row.code, row.name, row.employee_share, row.employer_share,
      row.total_contribution,
    ]));
  };

  return (
    <section className="reports-page reports-print-area">
      <ReportHeading
        eyebrow="Payroll report"
        title="Government Contribution Report"
        description="Employee and employer statutory contribution shares calculated through payroll."
        onCsv={exportCsv}
        onPdf={async () => setNotice(await saveCurrentReportPdf('government-contributions-report'))}
      />
      <ReportError message={error || optionsError} />
      <ReportNotice message={notice} />
      <ReportFiltersBar filters={filters} onChange={setFilters} options={options} onRefresh={() => void load()} />

      {loading ? <ReportEmpty>Loading contribution report…</ReportEmpty> : report && (
        <>
          <div className="reports-summary-grid reports-summary-grid--compact">
            <article><span>Employee share</span><strong>{formatCurrency(report.totals.employee_share)}</strong></article>
            <article><span>Employer share</span><strong>{formatCurrency(report.totals.employer_share)}</strong></article>
            <article><span>Total remittance</span><strong>{formatCurrency(report.totals.total_contribution)}</strong></article>
          </div>

          <div className="reports-panel">
            <div className="reports-section-heading"><div><h3>Summary by contribution</h3><p>Consolidated employee and employer shares.</p></div></div>
            {report.summary.length === 0 ? <ReportEmpty /> : (
              <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Code</th><th>Contribution</th><th>Employee records</th><th>Employee share</th><th>Employer share</th><th>Total</th></tr></thead><tbody>{report.summary.map((row) => (
                <tr key={`${row.code}-${row.name}`}><td>{row.code || '—'}</td><td><strong>{row.name}</strong></td><td>{row.employees}</td><td>{formatCurrency(row.employee_share)}</td><td>{formatCurrency(row.employer_share)}</td><td><strong>{formatCurrency(row.total_contribution)}</strong></td></tr>
              ))}</tbody></table></div>
            )}
          </div>

          <div className="reports-panel">
            <div className="reports-section-heading"><div><h3>Employee contribution detail</h3><p>Contribution records grouped by employee and payroll period.</p></div></div>
            {report.rows.length === 0 ? <ReportEmpty /> : (
              <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Period</th><th>Employee</th><th>Department</th><th>Code</th><th>Contribution</th><th>Employee share</th><th>Employer share</th><th>Total</th></tr></thead><tbody>{report.rows.map((row) => (
                <tr key={`${row.period_id}-${row.employee_id}-${row.contribution_key}`}><td><strong>{row.period_name}</strong><span>{formatDate(row.payment_date)}</span></td><td><strong>{row.employee_name}</strong><span>{row.employee_number}</span></td><td>{row.department || 'Unassigned'}</td><td>{row.code || '—'}</td><td>{row.name}</td><td>{formatCurrency(row.employee_share)}</td><td>{formatCurrency(row.employer_share)}</td><td><strong>{formatCurrency(row.total_contribution)}</strong></td></tr>
              ))}</tbody></table></div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
