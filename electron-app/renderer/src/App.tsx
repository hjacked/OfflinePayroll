import { Navigate, Route, Routes } from 'react-router-dom';
import AdminLayout from './layouts/AdminLayout';
import EmployeePortalLayout from './layouts/EmployeePortalLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminModulePage from './pages/admin/AdminModulePage';
import ContributionCalculatorPage from './pages/admin/contributions/ContributionCalculatorPage';
import ContributionHistoryPage from './pages/admin/contributions/ContributionHistoryPage';
import ContributionReportsPage from './pages/admin/contributions/ContributionReportsPage';
import ContributionTablesPage from './pages/admin/contributions/ContributionTablesPage';
import ContributionTypesPage from './pages/admin/contributions/ContributionTypesPage';
import GovernmentContributionsPage from './pages/admin/contributions/GovernmentContributionsPage';
import EmployeeContributionsPage from './pages/employee/contributions/EmployeeContributionsPage';
import DeductionAssignmentsPage from './pages/admin/deductions/DeductionAssignmentsPage';
import DeductionTransactionDetailsPage from './pages/admin/deductions/DeductionTransactionDetailsPage';
import DeductionTransactionFormPage from './pages/admin/deductions/DeductionTransactionFormPage';
import DeductionTypesPage from './pages/admin/deductions/DeductionTypesPage';
import DeductionsPage from './pages/admin/deductions/DeductionsPage';
import LoanDetailsPage from './pages/admin/deductions/LoanDetailsPage';
import LoanFormPage from './pages/admin/deductions/LoanFormPage';
import LoansPage from './pages/admin/deductions/LoansPage';
import EmployeeDeductionsPage from './pages/employee/deductions/EmployeeDeductionsPage';
import EarningAssignmentsPage from './pages/admin/earnings/EarningAssignmentsPage';
import EarningTransactionDetailsPage from './pages/admin/earnings/EarningTransactionDetailsPage';
import EarningTransactionFormPage from './pages/admin/earnings/EarningTransactionFormPage';
import EarningTypesPage from './pages/admin/earnings/EarningTypesPage';
import EarningsPage from './pages/admin/earnings/EarningsPage';
import EmployeeEarningsPage from './pages/employee/earnings/EmployeeEarningsPage';
import EmployeeDetailsPage from './pages/admin/employees/EmployeeDetailsPage';
import EmployeeFormPage from './pages/admin/employees/EmployeeFormPage';
import EmployeeListPage from './pages/admin/employees/EmployeeListPage';
import AttendanceCorrectionsPage from './pages/admin/timekeeping/AttendanceCorrectionsPage';
import AttendanceDetailsPage from './pages/admin/timekeeping/AttendanceDetailsPage';
import AttendanceFormPage from './pages/admin/timekeeping/AttendanceFormPage';
import AttendanceImportPage from './pages/admin/timekeeping/AttendanceImportPage';
import TimekeepingPage from './pages/admin/timekeeping/TimekeepingPage';
import WorkSchedulesPage from './pages/admin/timekeeping/WorkSchedulesPage';
import LeaveBalancesPage from './pages/admin/leave/LeaveBalancesPage';
import LeaveManagementPage from './pages/admin/leave/LeaveManagementPage';
import LeaveRequestDetailsPage from './pages/admin/leave/LeaveRequestDetailsPage';
import LeaveRequestFormPage from './pages/admin/leave/LeaveRequestFormPage';
import LeaveTypesPage from './pages/admin/leave/LeaveTypesPage';
import EmployeeLeaveDetailsPage from './pages/employee/leave/EmployeeLeaveDetailsPage';
import EmployeeLeaveFormPage from './pages/employee/leave/EmployeeLeaveFormPage';
import EmployeeLeavePage from './pages/employee/leave/EmployeeLeavePage';
import EmployeePortal from './pages/EmployeePortal';
import PayrollPortal from './pages/PayrollPortal';
import './admin-shell.css';
import './employee-management.css';
import './timekeeping.css';
import './leave-management.css';
import './earnings.css';
import './deductions.css';
import './contributions.css';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="employees" element={<EmployeeListPage />} />
        <Route path="employees/new" element={<EmployeeFormPage />} />
        <Route path="employees/:id" element={<EmployeeDetailsPage />} />
        <Route path="employees/:id/edit" element={<EmployeeFormPage />} />
        <Route path="timekeeping" element={<TimekeepingPage />} />
        <Route path="timekeeping/new" element={<AttendanceFormPage />} />
        <Route path="timekeeping/import" element={<AttendanceImportPage />} />
        <Route path="timekeeping/schedules" element={<WorkSchedulesPage />} />
        <Route
          path="timekeeping/corrections"
          element={<AttendanceCorrectionsPage />}
        />
        <Route path="timekeeping/:id" element={<AttendanceDetailsPage />} />
        <Route path="timekeeping/:id/edit" element={<AttendanceFormPage />} />
        <Route path="leave-management" element={<LeaveManagementPage />} />
        <Route path="leave-management/new" element={<LeaveRequestFormPage />} />
        <Route path="leave-management/types" element={<LeaveTypesPage />} />
        <Route path="leave-management/balances" element={<LeaveBalancesPage />} />
        <Route path="leave-management/:id" element={<LeaveRequestDetailsPage />} />
        <Route path="leave-management/:id/edit" element={<LeaveRequestFormPage />} />
        <Route path="earnings" element={<EarningsPage />} />
        <Route path="earnings/types" element={<EarningTypesPage />} />
        <Route path="earnings/assignments" element={<EarningAssignmentsPage />} />
        <Route path="earnings/new" element={<EarningTransactionFormPage />} />
        <Route path="earnings/:id" element={<EarningTransactionDetailsPage />} />
        <Route path="earnings/:id/edit" element={<EarningTransactionFormPage />} />
        <Route path="deductions" element={<DeductionsPage />} />
        <Route path="deductions/types" element={<DeductionTypesPage />} />
        <Route path="deductions/assignments" element={<DeductionAssignmentsPage />} />
        <Route path="deductions/loans" element={<LoansPage />} />
        <Route path="deductions/loans/new" element={<LoanFormPage />} />
        <Route path="deductions/loans/:id" element={<LoanDetailsPage />} />
        <Route path="deductions/loans/:id/edit" element={<LoanFormPage />} />
        <Route path="deductions/new" element={<DeductionTransactionFormPage />} />
        <Route path="deductions/:id" element={<DeductionTransactionDetailsPage />} />
        <Route path="deductions/:id/edit" element={<DeductionTransactionFormPage />} />
        <Route path="government-contributions" element={<GovernmentContributionsPage />} />
        <Route path="government-contributions/types" element={<ContributionTypesPage />} />
        <Route path="government-contributions/tables" element={<ContributionTablesPage />} />
        <Route path="government-contributions/calculator" element={<ContributionCalculatorPage />} />
        <Route path="government-contributions/history" element={<ContributionHistoryPage />} />
        <Route path="government-contributions/reports" element={<ContributionReportsPage />} />
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
        <Route path="leave" element={<EmployeeLeavePage />} />
        <Route path="leave/new" element={<EmployeeLeaveFormPage />} />
        <Route path="leave/:id" element={<EmployeeLeaveDetailsPage />} />
        <Route path="earnings" element={<EmployeeEarningsPage />} />
        <Route path="deductions" element={<EmployeeDeductionsPage />} />
        <Route path="contributions" element={<EmployeeContributionsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
