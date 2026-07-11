import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { adminModules } from '../config/adminModules';

const fixedNavigation = [
  {
    label: 'Dashboard',
    shortCode: 'DB',
    path: '/admin/dashboard',
  },
  {
    label: 'Employees',
    shortCode: 'EM',
    path: '/admin/employees',
  },
  {
    label: 'Payroll Processing',
    shortCode: 'PR',
    path: '/admin/payroll',
  },
];

const navigation = [
  fixedNavigation[0],
  fixedNavigation[1],
  ...adminModules.slice(0, 5),
  fixedNavigation[2],
  ...adminModules.slice(5),
];

function getPageTitle(pathname: string): string {
  const currentItem = navigation.find(
    (item) => pathname === item.path || pathname.startsWith(`${item.path}/`),
  );
  return currentItem?.label ?? 'Payroll Administration';
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

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
              <span className="admin-nav__icon" aria-hidden="true">
                {item.shortCode}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <NavLink to="/employee" className="admin-portal-link">
            Open Employee Portal
          </NavLink>
          <small>Local offline workspace</small>
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

          <NavLink to="/employee" className="admin-topbar__action">
            Employee Portal
          </NavLink>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
