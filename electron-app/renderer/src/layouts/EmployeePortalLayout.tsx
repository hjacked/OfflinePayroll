import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function EmployeePortalLayout() {
  const { user, logout, can } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="employee-portal-shell">
      <header className="employee-portal-topbar">
        <div>
          <strong>PayPayroll Offline</strong>
          <span>{user?.employee_name || user?.display_name || 'Employee self-service'}</span>
        </div>
        <nav className="employee-portal-nav" aria-label="Employee portal navigation">
          <NavLink end to="/employee">Dashboard</NavLink>
          <NavLink to="/employee/leave">My Leave</NavLink>
          <NavLink to="/employee/earnings">My Earnings</NavLink>
          <NavLink to="/employee/deductions">My Deductions</NavLink>
          <NavLink to="/employee/contributions">My Contributions</NavLink>
          <NavLink to="/employee/payroll-history">Payroll History</NavLink>
          <NavLink to="/employee/payslips">My Payslips</NavLink>
          {can('dashboard:view') && <NavLink to="/admin/dashboard">Administration</NavLink>}
          <NavLink to="/account/change-password">Password</NavLink>
          <button type="button" onClick={() => void signOut()}>Sign out</button>
        </nav>
      </header>
      <main className="employee-portal-content"><Outlet /></main>
    </div>
  );
}
