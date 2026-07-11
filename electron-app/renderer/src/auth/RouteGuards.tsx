import { Navigate, useLocation } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import type { UserRole } from '../models/Auth';
import { getHomePath, useAuth } from './AuthContext';

export function RequireAuth({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (user.must_change_password && location.pathname !== '/account/change-password') {
    return <Navigate to="/account/change-password" replace />;
  }
  return <>{children}</>;
}

export function RequireRole({ roles, children }: PropsWithChildren<{ roles: UserRole[] }>) {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={getHomePath(user)} replace />;
  return <>{children}</>;
}

export function RequirePermission({ permission, children }: PropsWithChildren<{ permission: string }>) {
  const { user, loading, can } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!can(permission)) return <Navigate to={getHomePath(user)} replace />;
  return <>{children}</>;
}


export function AdminAccessBoundary({ children }: PropsWithChildren) {
  const location = useLocation();
  const { user, loading, can } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const permission = getAdminPermission(location.pathname);
  if (permission && !can(permission)) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
}

function getAdminPermission(pathname: string): string | null {
  const rules: Array<[string, string]> = [
    ['/admin/users', 'users:manage'],
    ['/admin/settings', 'users:manage'],
    ['/admin/employees', 'employees:view'],
    ['/admin/timekeeping', 'timekeeping:view'],
    ['/admin/leave-management', 'leave:view'],
    ['/admin/earnings', 'earnings:manage'],
    ['/admin/deductions', 'deductions:manage'],
    ['/admin/government-contributions', 'contributions:manage'],
    ['/admin/payroll', 'payroll:manage'],
    ['/admin/reports', 'reports:view'],
    ['/admin/payslips', 'payslips:view'],
    ['/admin/dashboard', 'dashboard:view'],
  ];
  return rules.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? null;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoadingScreen />;
  return <Navigate to={user ? getHomePath(user) : '/login'} replace />;
}

function AuthLoadingScreen() {
  return (
    <div className="auth-loading" role="status" aria-live="polite">
      <div className="auth-loading__spinner" />
      <p>Loading secure workspace…</p>
    </div>
  );
}
