import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import AdminPortal from './pages/AdminPortal';
import EmployeePortal from './pages/EmployeePortal';
import PayrollPortal from './pages/PayrollPortal';

export default function App() {
  const isAdmin = true;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <strong>PayPayroll Offline</strong>
          <span className="subtitle">Local payroll workspace</span>
        </div>
        <nav aria-label="Primary navigation">
          {isAdmin && <NavLink to="/admin">Employees</NavLink>}
          {isAdmin && <NavLink to="/admin/payroll">Payroll</NavLink>}
          <NavLink to="/employee">Employee Portal</NavLink>
        </nav>
      </header>

      <main className="content">
        <Routes>
          <Route
            path="/admin"
            element={isAdmin ? <AdminPortal /> : <Navigate to="/employee" replace />}
          />
          <Route
            path="/admin/payroll"
            element={isAdmin ? <PayrollPortal /> : <Navigate to="/employee" replace />}
          />
          <Route path="/employee" element={<EmployeePortal />} />
          <Route
            path="*"
            element={<Navigate to={isAdmin ? '/admin' : '/employee'} replace />}
          />
        </Routes>
      </main>
    </div>
  );
}
