import { NavLink, Outlet } from 'react-router-dom';

export default function EmployeePortalLayout() {
  return (
    <div className="employee-portal-shell">
      <header className="employee-portal-topbar">
        <div>
          <strong>PayPayroll Offline</strong>
          <span>Employee self-service</span>
        </div>
        <nav className="employee-portal-nav" aria-label="Employee portal navigation">
          <NavLink end to="/employee">Dashboard</NavLink>
          <NavLink to="/employee/leave">My Leave</NavLink>
          <NavLink to="/employee/earnings">My Earnings</NavLink>
          <NavLink to="/employee/deductions">My Deductions</NavLink>
          <NavLink to="/employee/contributions">My Contributions</NavLink>
          <NavLink to="/employee/payroll-history">Payroll History</NavLink>
          <NavLink to="/admin/dashboard">Administration</NavLink>
        </nav>
      </header>
      <main className="employee-portal-content">
        <Outlet />
      </main>
    </div>
  );
}
