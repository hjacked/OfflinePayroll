import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Employee } from '../../../models/Employee';

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.api.employee.list({ query, status });
      setEmployees(result.data);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to load employee records.'));
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadEmployees();
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [loadEmployees]);

  async function handleStatusChange(employee: Employee): Promise<void> {
    const nextActive = employee.is_active !== 1;
    setBusyId(employee.id);
    setError(null);

    try {
      await window.api.employee.setStatus(employee.id, nextActive);
      await loadEmployees();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to change employee status.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(employee: Employee): Promise<void> {
    const confirmed = window.confirm(
      `Delete ${employee.name}? This permanently removes the employee record.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyId(employee.id);
    setError(null);

    try {
      await window.api.employee.delete(employee.id);
      await loadEmployees();
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to delete employee record.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-page employee-page" aria-labelledby="employee-list-title">
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Employee management</span>
          <h2 id="employee-list-title">Employees</h2>
          <p>
            Create, review, update, activate, deactivate, and remove employee records.
          </p>
        </div>
        <Link className="employee-primary-button" to="/admin/employees/new">
          Add employee
        </Link>
      </div>

      <div className="employee-toolbar" role="search">
        <label className="employee-search-field">
          <span className="sr-only">Search employees</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, employee no., email, department…"
          />
        </label>

        <label className="employee-filter-field">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as 'all' | 'active' | 'inactive')
            }
          >
            <option value="all">All employees</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </label>

        <button
          type="button"
          className="employee-secondary-button"
          onClick={() => void loadEmployees()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="employee-alert employee-alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="employee-table-card">
        <div className="employee-table-card__header">
          <div>
            <h3>Employee directory</h3>
            <p>{loading ? 'Loading records…' : `${employees.length} record(s) found`}</p>
          </div>
        </div>

        {loading ? (
          <div className="employee-empty-state">Loading employee records…</div>
        ) : employees.length === 0 ? (
          <div className="employee-empty-state">
            <strong>No employees found</strong>
            <span>Adjust the search filters or add a new employee.</span>
          </div>
        ) : (
          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee No.</th>
                  <th>Department</th>
                  <th>Position</th>
                  <th>Status</th>
                  <th className="employee-table__actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => {
                  const isBusy = busyId === employee.id;

                  return (
                    <tr key={employee.id}>
                      <td>
                        <div className="employee-identity-cell">
                          <span className="employee-avatar" aria-hidden="true">
                            {getInitials(employee.name)}
                          </span>
                          <div>
                            <Link to={`/admin/employees/${employee.id}`}>
                              {employee.name}
                            </Link>
                            <span>{employee.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>{employee.employee_number}</td>
                      <td>{employee.department || '—'}</td>
                      <td>{employee.role_title || '—'}</td>
                      <td>
                        <span
                          className={`employee-status-badge ${
                            employee.is_active === 1
                              ? 'employee-status-badge--active'
                              : 'employee-status-badge--inactive'
                          }`}
                        >
                          {employee.is_active === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="employee-row-actions">
                          <Link to={`/admin/employees/${employee.id}`}>View</Link>
                          <Link to={`/admin/employees/${employee.id}/edit`}>Edit</Link>
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(employee)}
                            disabled={isBusy}
                          >
                            {employee.is_active === 1 ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="employee-row-actions__danger"
                            onClick={() => void handleDelete(employee)}
                            disabled={isBusy}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'EM';
}

function getErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}
