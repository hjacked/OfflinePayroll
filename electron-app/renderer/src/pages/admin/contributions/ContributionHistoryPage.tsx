import { useCallback, useEffect, useState } from 'react';
import type {
  ContributionRecord,
  ContributionRecordStatus,
  ContributionType,
} from '../../../models/Contributions';
import type { Employee } from '../../../models/Employee';
import { formatCurrency, formatDate, monthStart, statusLabel, today } from './contribution-utils';

export default function ContributionHistoryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<ContributionType[]>([]);
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [status, setStatus] = useState<ContributionRecordStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const [employeeResult, typeResult] = await Promise.all([
          window.api.employee.list({ status: 'all' }),
          window.api.contributionType.list({ include_inactive: true }),
        ]);
        setEmployees(employeeResult.data);
        setTypes(typeResult.data);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load filters.');
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await window.api.contributionRecord.list({
        employee_id: employeeId,
        contribution_type_id: typeId,
        status,
        date_from: dateFrom,
        date_to: dateTo,
        query,
      });
      setRecords(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load contribution history.');
    }
  }, [dateFrom, dateTo, employeeId, query, status, typeId]);

  useEffect(() => { void load(); }, [load]);

  async function changeStatus(record: ContributionRecord, next: ContributionRecordStatus) {
    setError('');
    try {
      await window.api.contributionRecord.setStatus(record.id, next);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update contribution status.');
    }
  }

  async function remove(record: ContributionRecord) {
    if (!window.confirm(`Delete or cancel ${record.contribution_name} for ${record.employee_name}?`)) return;
    setError('');
    try {
      await window.api.contributionRecord.delete(record.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete contribution record.');
    }
  }

  return (
    <section className="contributions-page">
      <div className="contributions-heading"><div><span>Record management</span><h2>Contribution History</h2><p>Review, approve, remit, cancel, and audit calculated contribution records.</p></div></div>
      {error && <div className="contributions-alert contributions-alert--error">{error}</div>}
      <div className="contributions-toolbar contributions-toolbar--wrap">
        <input placeholder="Search employee, reference, or contribution…" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">All employees</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.employee_number} — {item.name}</option>)}</select>
        <select value={typeId} onChange={(event) => setTypeId(event.target.value)}><option value="">All contribution types</option>{types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value as ContributionRecordStatus | 'all')}><option value="all">All statuses</option><option value="draft">Draft</option><option value="approved">Approved</option><option value="remitted">Remitted</option><option value="cancelled">Cancelled</option></select>
        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      <div className="contributions-panel">
        <div className="contributions-panel__header"><div><h3>Contribution records</h3><p>{records.length} matching records</p></div><button className="contributions-button" type="button" onClick={() => void load()}>Refresh</button></div>
        {records.length === 0 ? <div className="contributions-empty">No contribution records match the selected filters.</div> : (
          <div className="contributions-table-wrap"><table className="contributions-table"><thead><tr><th>Date</th><th>Employee</th><th>Contribution</th><th>Basis</th><th>Employee</th><th>Employer</th><th>Total</th><th>Gov. number</th><th>Status</th><th>Actions</th></tr></thead><tbody>{records.map((record) => (
            <tr key={record.id}>
              <td>{formatDate(record.contribution_date)}</td>
              <td><strong>{record.employee_name}</strong><span>{record.employee_number}</span></td>
              <td><strong>{record.contribution_code}</strong><span>{record.table_version_name}</span></td>
              <td>{formatCurrency(record.compensation_basis)}</td>
              <td>{formatCurrency(record.employee_share)}</td>
              <td>{formatCurrency(record.employer_share)}</td>
              <td><strong>{formatCurrency(record.total_contribution)}</strong></td>
              <td>{record.government_number || <span className="contributions-missing">Missing</span>}</td>
              <td><span className={`contributions-status contributions-status--${record.status}`}>{statusLabel(record.status)}</span></td>
              <td><div className="contributions-actions contributions-actions--compact">{record.status === 'draft' && <button className="contributions-button" type="button" onClick={() => void changeStatus(record, 'approved')}>Approve</button>}{record.status === 'approved' && <button className="contributions-button" type="button" onClick={() => void changeStatus(record, 'remitted')}>Mark remitted</button>}{record.status !== 'remitted' && record.status !== 'cancelled' && <button className="contributions-button contributions-button--danger" type="button" onClick={() => void remove(record)}>Delete</button>}</div></td>
            </tr>
          ))}</tbody></table></div>
        )}
      </div>
    </section>
  );
}
