import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { adminModules } from '../config/adminModules';

interface NavigationItem {
  label: string;
  shortCode: string;
  path: string;
  permission: string;
}

const fixedNavigation: NavigationItem[] = [
  { label: 'Dashboard', shortCode: 'DB', path: '/admin/dashboard', permission: 'dashboard:view' },
  { label: 'Employees', shortCode: 'EM', path: '/admin/employees', permission: 'employees:view' },
  { label: 'Payroll Processing', shortCode: 'PR', path: '/admin/payroll', permission: 'payroll:manage' },
  { label: 'Users & Roles', shortCode: 'UR', path: '/admin/users', permission: 'users:manage' },
];

const modulePermissions: Record<string, string> = {
  '/admin/timekeeping': 'timekeeping:view',
  '/admin/leave-management': 'leave:view',
  '/admin/earnings': 'earnings:manage',
  '/admin/deductions': 'deductions:manage',
  '/admin/government-contributions': 'contributions:manage',
  '/admin/reports': 'reports:view',
  '/admin/payslips': 'payslips:view',
  '/admin/settings': 'settings:manage',
};

const allNavigation: NavigationItem[] = [
  fixedNavigation[0],
  fixedNavigation[1],
  ...adminModules.slice(0, 5).map((item) => ({
    label: item.label,
    shortCode: item.shortCode,
    path: item.path,
    permission: modulePermissions[item.path] ?? 'dashboard:view',
  })),
  fixedNavigation[2],
  ...adminModules.slice(5).map((item) => ({
    label: item.label,
    shortCode: item.shortCode,
    path: item.path,
    permission: modulePermissions[item.path] ?? 'dashboard:view',
  })),
  fixedNavigation[3],
];

function getPageTitle(pathname: string, navigation: NavigationItem[]): string {
  const currentItem = navigation.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
  return currentItem?.label ?? 'Payroll Administration';
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();

  const navigation = useMemo(
    () => allNavigation.filter((item) => can(item.permission)),
    [can],
  );
  const pageTitle = getPageTitle(location.pathname, navigation);

  async function signOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="admin-shell">
      <aside
        className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`}
        aria-label="Payroll administration navigation"
      >
        <div className="admin-brand">
          <span className="admin-brand__mark">PP</span>
          <div>
            <strong>PayPayroll Offline</strong>
            <span>Administration</span>
          </div>
        </div>

        <nav className="admin-nav">
          <span className="admin-nav__label">Workspace</span>
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `admin-nav__link${isActive ? ' admin-nav__link--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav__icon" aria-hidden="true">{item.shortCode}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          {can('employee_portal:view') && (
            <NavLink to="/employee" className="admin-portal-link">Open Employee Portal</NavLink>
          )}
          <small>{user?.display_name}</small>
          <small>{formatRole(user?.role)}</small>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="admin-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__heading">
            <button
              type="button"
              className="admin-menu-button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
            <div>
              <span className="admin-topbar__eyebrow">Administration</span>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="account-actions">
            <div className="account-summary">
              <strong>{user?.display_name}</strong>
              <span>{formatRole(user?.role)}</span>
            </div>
            <NavLink to="/account/change-password" className="admin-topbar__action">Password</NavLink>
            {can('employee_portal:view') && (
              <NavLink to="/employee" className="admin-topbar__action">Employee Portal</NavLink>
            )}
            <button type="button" className="admin-topbar__action" onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </header>

        <main className="admin-content"><Outlet /></main>
      </div>
    </div>
  );
}

function formatRole(role: string | undefined): string {
  if (!role) return '';
  return role.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}
