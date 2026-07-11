import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { AdminAccessBoundary, HomeRedirect, RequireAuth, RequirePermission, RequireRole } from './auth/RouteGuards';
import AdminLayout from './layouts/AdminLayout';
import EmployeePortalLayout from './layouts/EmployeePortalLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
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
import PayrollEmployeeResultPage from './pages/admin/payroll/PayrollEmployeeResultPage';
import PayrollPeriodDetailsPage from './pages/admin/payroll/PayrollPeriodDetailsPage';
import PayrollPeriodFormPage from './pages/admin/payroll/PayrollPeriodFormPage';
import PayrollPeriodsPage from './pages/admin/payroll/PayrollPeriodsPage';
import PayrollRegisterPage from './pages/admin/payroll/PayrollRegisterPage';
import EmployeePayrollHistoryPage from './pages/employee/payroll/EmployeePayrollHistoryPage';
import ReportsDashboardPage from './pages/admin/reports/ReportsDashboardPage';
import PayrollRegisterReportPage from './pages/admin/reports/PayrollRegisterReportPage';
import PayrollSummaryReportPage from './pages/admin/reports/PayrollSummaryReportPage';
import EarningsReportPage from './pages/admin/reports/EarningsReportPage';
import DeductionsReportPage from './pages/admin/reports/DeductionsReportPage';
import ContributionsReportPage from './pages/admin/reports/ContributionsReportPage';
import NetPayReportPage from './pages/admin/reports/NetPayReportPage';
import PayrollVarianceReportPage from './pages/admin/reports/PayrollVarianceReportPage';
import BankTransferReportPage from './pages/admin/reports/BankTransferReportPage';
import PayslipsPage from './pages/admin/payslips/PayslipsPage';
import PayslipGeneratePage from './pages/admin/payslips/PayslipGeneratePage';
import PayslipPublishPage from './pages/admin/payslips/PayslipPublishPage';
import PayslipDetailsPage from './pages/admin/payslips/PayslipDetailsPage';
import EmployeePayslipsPage from './pages/employee/payslips/EmployeePayslipsPage';
import EmployeePayslipDetailsPage from './pages/employee/payslips/EmployeePayslipDetailsPage';
import EmployeeTimekeepingPage from './pages/employee/timekeeping/EmployeeTimekeepingPage';
import EmployeeAttendanceCorrectionsPage from './pages/employee/timekeeping/EmployeeAttendanceCorrectionsPage';
import EmployeeProfilePage from './pages/employee/profile/EmployeeProfilePage';
import LoginPage from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/account/ChangePasswordPage';
import UserAccountsPage from './pages/admin/users/UserAccountsPage';
import SettingsPage from './pages/admin/settings/SettingsPage';
import './admin-shell.css';
import './employee-management.css';
import './timekeeping.css';
import './leave-management.css';
import './earnings.css';
import './deductions.css';
import './contributions.css';
import './payroll.css';
import './reports.css';
import './payslips.css';
import './auth.css';
import './employee-self-service.css';
import './settings.css';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/account/change-password"
          element={
            <RequireAuth>
              <ChangePasswordPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole roles={['administrator', 'hr_officer', 'payroll_officer', 'supervisor']}>
                <AdminAccessBoundary>
                  <AdminLayout />
                </AdminAccessBoundary>
              </RequireRole>
            </RequireAuth>
          }
        >
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
        <Route path="payroll" element={<PayrollPeriodsPage />} />
        <Route path="payroll/new" element={<PayrollPeriodFormPage />} />
        <Route path="payroll/:id/edit" element={<PayrollPeriodFormPage />} />
        <Route path="payroll/:id/register" element={<PayrollRegisterPage />} />
        <Route path="payroll/:id/employees/:employeeId" element={<PayrollEmployeeResultPage />} />
        <Route path="payroll/:id" element={<PayrollPeriodDetailsPage />} />
        <Route path="reports" element={<ReportsDashboardPage />} />
        <Route path="reports/payroll-register" element={<PayrollRegisterReportPage />} />
        <Route path="reports/payroll-summary" element={<PayrollSummaryReportPage />} />
        <Route path="reports/earnings" element={<EarningsReportPage />} />
        <Route path="reports/deductions" element={<DeductionsReportPage />} />
        <Route path="reports/contributions" element={<ContributionsReportPage />} />
        <Route path="reports/net-pay" element={<NetPayReportPage />} />
        <Route path="reports/variance" element={<PayrollVarianceReportPage />} />
        <Route path="reports/bank-transfer" element={<BankTransferReportPage />} />
        <Route path="payslips" element={<PayslipsPage />} />
        <Route path="payslips/generate" element={<PayslipGeneratePage />} />
        <Route path="payslips/publish" element={<PayslipPublishPage />} />
        <Route path="payslips/:id" element={<PayslipDetailsPage />} />
        <Route
          path="users"
          element={
            <RequirePermission permission="users:manage">
              <UserAccountsPage />
            </RequirePermission>
          }
        />
        <Route
          path="settings"
          element={
            <RequirePermission permission="settings:manage">
              <SettingsPage />
            </RequirePermission>
          }
        />
      </Route>

        <Route
          path="/employee"
          element={
            <RequireAuth>
              <EmployeePortalLayout />
            </RequireAuth>
          }
        >
        <Route index element={<EmployeePortal />} />
        <Route path="timekeeping" element={<EmployeeTimekeepingPage />} />
        <Route path="timekeeping/corrections" element={<EmployeeAttendanceCorrectionsPage />} />
        <Route path="leave" element={<EmployeeLeavePage />} />
        <Route path="leave/new" element={<EmployeeLeaveFormPage />} />
        <Route path="leave/:id" element={<EmployeeLeaveDetailsPage />} />
        <Route path="earnings" element={<EmployeeEarningsPage />} />
        <Route path="deductions" element={<EmployeeDeductionsPage />} />
        <Route path="contributions" element={<EmployeeContributionsPage />} />
        <Route path="payroll-history" element={<EmployeePayrollHistoryPage />} />
        <Route path="payslips" element={<EmployeePayslipsPage />} />
        <Route path="payslips/:id" element={<EmployeePayslipDetailsPage />} />
        <Route path="profile" element={<EmployeeProfilePage />} />
      </Route>

        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </AuthProvider>
  );
}
