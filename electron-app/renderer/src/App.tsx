import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import EmployeePortalLayout from './layouts/EmployeePortalLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminModulePage from './pages/admin/AdminModulePage';
import AdminPortal from './pages/AdminPortal';
import EmployeePortal from './pages/EmployeePortal';
import PayrollPortal from './pages/PayrollPortal';
import './admin-shell.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="employees" element={<AdminPortal />} />
        <Route
          path="timekeeping"
          element={<AdminModulePage moduleKey="timekeeping" />}
        />
        <Route
          path="leave-management"
          element={<AdminModulePage moduleKey="leave-management" />}
        />
        <Route
          path="earnings"
          element={<AdminModulePage moduleKey="earnings" />}
        />
        <Route
          path="deductions"
          element={<AdminModulePage moduleKey="deductions" />}
        />
        <Route
          path="government-contributions"
          element={<AdminModulePage moduleKey="government-contributions" />}
        />
        <Route path="payroll" element={<PayrollPortal />} />
        <Route
          path="reports"
          element={<AdminModulePage moduleKey="reports" />}
        />
        <Route
          path="payslips"
          element={<AdminModulePage moduleKey="payslips" />}
        />
        <Route
          path="settings"
          element={<AdminModulePage moduleKey="settings" />}
        />
      </Route>

      <Route path="/employee" element={<EmployeePortalLayout />}>
        <Route index element={<EmployeePortal />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
