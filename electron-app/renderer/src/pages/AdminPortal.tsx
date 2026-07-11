import { useEffect, useState } from 'react';
import type { Employee } from '../models/Employee';

export default function AdminPortal() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    window.api.employee.list()
      .then((result) => {
        if (!cancelled) {
          setEmployees(result.data);
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Unable to load employees.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <div className="page-heading">
        <div>
          <h1>Admin Portal</h1>
          <p>Manage employees and prepare offline payroll records.</p>
        </div>
        <span className="badge">{employees.length} employees</span>
      </div>

      <div className="card">
        <h2>Employees</h2>

        {loading && <p>Loading employee records…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {!loading && !error && employees.length === 0 && (
          <p>No employees have been added yet.</p>
        )}

        {!loading && !error && employees.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.department ?? '—'}</td>
                    <td>{employee.role_title ?? '—'}</td>
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
