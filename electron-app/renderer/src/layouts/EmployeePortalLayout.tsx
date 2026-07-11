import { Link, Outlet } from 'react-router-dom';

export default function EmployeePortalLayout() {
  return (
    <div className="employee-portal-shell">
      <header className="employee-portal-topbar">
        <div>
          <strong>PayPayroll Offline</strong>
          <span>Employee self-service</span>
        </div>
        <Link to="/admin/dashboard">Back to Administration</Link>
      </header>
      <main className="employee-portal-content">
        <Outlet />
      </main>
    </div>
  );
}
