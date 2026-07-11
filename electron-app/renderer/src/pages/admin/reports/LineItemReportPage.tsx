import { useCallback, useEffect, useState } from 'react';
import type { LineItemReport, ReportFilters } from '../../../models/Reports';
import {
  downloadCsv,
  emptyReportFilters,
  formatCurrency,
  formatDate,
  formatStatus,
  ReportEmpty,
  ReportError,
  ReportFiltersBar,
  ReportHeading,
  ReportNotice,
  saveCurrentReportPdf,
  useReportOptions,
} from './reports-utils';

interface LineItemReportPageProps {
  kind: 'earnings' | 'deductions';
  title: string;
  description: string;
}

export default function LineItemReportPage({ kind, title, description }: LineItemReportPageProps) {
  const { options, error: optionsError } = useReportOptions();
  const [filters, setFilters] = useState<ReportFilters>({ ...emptyReportFilters });
  const [report, setReport] = useState<LineItemReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = kind === 'earnings'
        ? await window.api.report.earnings(filters)
        : await window.api.report.deductions(filters);
      setReport(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to load ${kind} report.`);
    } finally {
      setLoading(false);
    }
  }, [filters, kind]);

  useEffect(() => { void load(); }, []);

  const exportCsv = () => {
    if (!report) return;
    downloadCsv(`${kind}-report`, [
      'Period', 'Payment Date', 'Status', 'Employee Number', 'Employee Name',
      'Department', 'Code', 'Item', 'Source', 'Amount', 'Taxable', 'Contribution Basis',
    ], report.rows.map((row) => [
      row.period_name, row.payment_date, row.workflow_status, row.employee_number,
      row.employee_name, row.department, row.code, row.name, row.source_type,
      row.amount, row.taxable ? 'Yes' : 'No', row.contribution_basis ? 'Yes' : 'No',
    ]));
  };

  return (
    <section className="reports-page reports-print-area">
      <ReportHeading
        eyebrow="Payroll report"
        title={title}
        description={description}
        onCsv={exportCsv}
        onPdf={async () => setNotice(await saveCurrentReportPdf(`${kind}-report`))}
      />
      <ReportError message={error || optionsError} />
      <ReportNotice message={notice} />
      <ReportFiltersBar filters={filters} onChange={setFilters} options={options} onRefresh={() => void load()} />

      {loading ? <ReportEmpty>Loading {kind} report…</ReportEmpty> : report && (
        <>
          <div className="reports-summary-grid reports-summary-grid--compact">
            <article><span>Total records</span><strong>{report.rows.length}</strong></article>
            <article><span>Distinct items</span><strong>{report.summary.length}</strong></article>
            <article><span>Total amount</span><strong>{formatCurrency(report.total)}</strong></article>
          </div>

          <div className="reports-panel">
            <div className="reports-section-heading"><div><h3>Summary by item</h3><p>Aggregated values for each payroll line-item category.</p></div></div>
            {report.summary.length === 0 ? <ReportEmpty /> : (
              <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Code</th><th>Item</th><th>Source</th><th>Records</th><th>Amount</th></tr></thead><tbody>{report.summary.map((row) => (
                <tr key={`${row.source_type}-${row.code}-${row.name}`}><td>{row.code || '—'}</td><td><strong>{row.name}</strong></td><td>{formatStatus(row.source_type)}</td><td>{row.records}</td><td><strong>{formatCurrency(row.amount)}</strong></td></tr>
              ))}</tbody></table></div>
            )}
          </div>

          <div className="reports-panel">
            <div className="reports-section-heading"><div><h3>Detailed transactions</h3><p>Employee-level payroll line items included in the report.</p></div></div>
            {report.rows.length === 0 ? <ReportEmpty /> : (
              <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Period</th><th>Employee</th><th>Department</th><th>Code</th><th>Item</th><th>Source</th><th>Amount</th><th>Flags</th></tr></thead><tbody>{report.rows.map((row) => (
                <tr key={row.id}><td><strong>{row.period_name}</strong><span>{formatDate(row.payment_date)}</span></td><td><strong>{row.employee_name}</strong><span>{row.employee_number}</span></td><td>{row.department || 'Unassigned'}</td><td>{row.code || '—'}</td><td>{row.name}</td><td>{formatStatus(row.source_type)}</td><td><strong>{formatCurrency(row.amount)}</strong></td><td><span>{row.taxable ? 'Taxable' : 'Non-taxable'}</span><span>{row.contribution_basis ? 'Contribution basis' : ''}</span></td></tr>
              ))}</tbody></table></div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
