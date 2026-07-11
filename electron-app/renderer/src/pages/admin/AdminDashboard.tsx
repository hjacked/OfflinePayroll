import { Link } from 'react-router-dom';
import { adminModules } from '../../config/adminModules';

const dashboardSummary = [
  { value: '11', label: 'Admin routes ready' },
  { value: 'Offline', label: 'Application mode' },
  { value: 'SQLite', label: 'Local data layer' },
  { value: 'Next', label: 'Forms and workflows' },
];

export default function AdminDashboard() {
  return (
    <section className="admin-page" aria-labelledby="dashboard-title">
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-heading__eyebrow">System overview</span>
          <h2 id="dashboard-title">Payroll Administration Dashboard</h2>
          <p>
            All required administration modules now have dedicated routes. The
            next phase can add forms, validation, approvals, and database operations.
          </p>
        </div>
        <span className="admin-status-pill">Route shell complete</span>
      </div>

      <div className="admin-summary-grid">
        {dashboardSummary.map((item) => (
          <article className="admin-summary-card" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </article>
        ))}
      </div>

      <div className="admin-section-heading">
        <div>
          <h3>Module access</h3>
          <p>Open any module to confirm its route and planned sections.</p>
        </div>
      </div>

      <div className="admin-module-grid">
        <Link to="/admin/employees" className="admin-module-card">
          <span className="admin-module-card__code">EM</span>
          <div>
            <h3>Employees</h3>
            <p>Employee records, profiles, employment data, and account details.</p>
          </div>
          <span className="admin-module-card__arrow" aria-hidden="true">→</span>
        </Link>

        {adminModules.map((moduleDefinition) => (
          <Link
            to={moduleDefinition.path}
            className="admin-module-card"
            key={moduleDefinition.key}
          >
            <span className="admin-module-card__code">
              {moduleDefinition.shortCode}
            </span>
            <div>
              <h3>{moduleDefinition.label}</h3>
              <p>{moduleDefinition.description}</p>
            </div>
            <span className="admin-module-card__arrow" aria-hidden="true">→</span>
          </Link>
        ))}

        <Link to="/admin/payroll" className="admin-module-card">
          <span className="admin-module-card__code">PR</span>
          <div>
            <h3>Payroll Processing</h3>
            <p>Create payroll periods, validate payroll, and manage processing status.</p>
          </div>
          <span className="admin-module-card__arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
