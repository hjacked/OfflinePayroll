import { BrowserWindow, dialog, type IpcMain, type OpenDialogOptions } from 'electron';
import { readFile, writeFile } from 'node:fs/promises';
import {
  createAttendanceCorrection,
  createAttendanceRecord,
  createWorkSchedule,
  deleteAttendanceRecord,
  deleteScheduleAssignment,
  deleteWorkSchedule,
  getAttendanceCorrections,
  getAttendanceRecord,
  getAttendanceRecords,
  getAttendanceSummary,
  getScheduleAssignments,
  getWorkSchedules,
  importAttendanceRows,
  reviewAttendanceCorrection,
  assignWorkSchedule,
  updateAttendanceRecord,
  updateWorkSchedule,
} from './services/attendance-service';
import {
  calculateContribution,
  createContributionRecord,
  createContributionTable,
  createContributionType,
  deleteContributionRecord,
  deleteContributionTable,
  deleteContributionType,
  getContributionRecord,
  getContributionRecords,
  getContributionSummary,
  getContributionTable,
  getContributionType,
  getContributionTables,
  getContributionTypes,
  replaceContributionBrackets,
  setContributionRecordStatus,
  setContributionTableStatus,
  setContributionTypeStatus,
  updateContributionTable,
  updateContributionType,
} from './services/contributions-service';
import {
  createDeductionAssignment,
  createDeductionTransaction,
  createDeductionType,
  createEmployeeLoan,
  deleteDeductionAssignment,
  deleteDeductionTransaction,
  deleteDeductionType,
  deleteEmployeeLoan,
  getDeductionAssignment,
  getDeductionAssignments,
  getDeductionSummary,
  getDeductionTransaction,
  getDeductionTransactions,
  getDeductionType,
  getDeductionTypes,
  getEmployeeLoan,
  getEmployeeLoans,
  getLoanSummary,
  recordLoanPayment,
  setDeductionAssignmentStatus,
  setDeductionTransactionStatus,
  setDeductionTypeStatus,
  setEmployeeLoanStatus,
  updateDeductionAssignment,
  updateDeductionTransaction,
  updateDeductionType,
  updateEmployeeLoan,
} from './services/deductions-service';
import {
  createEarningAssignment,
  createEarningTransaction,
  createEarningType,
  deleteEarningAssignment,
  deleteEarningTransaction,
  deleteEarningType,
  getEarningAssignment,
  getEarningAssignments,
  getEarningSummary,
  getEarningTransaction,
  getEarningTransactions,
  getEarningType,
  getEarningTypes,
  setEarningAssignmentStatus,
  setEarningTransactionStatus,
  setEarningTypeStatus,
  updateEarningAssignment,
  updateEarningTransaction,
  updateEarningType,
} from './services/earnings-service';
import {
  createEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployee,
  setEmployeeStatus,
  updateEmployee,
} from './services/employee-service';
import {
  adjustLeaveBalance,
  cancelLeaveRequest,
  createLeaveRequest,
  createLeaveType,
  deleteLeaveType,
  getLeaveBalances,
  getLeaveRequest,
  getLeaveRequests,
  getLeaveSummary,
  getLeaveTypes,
  reviewLeaveRequest,
  updateLeaveRequest,
  updateLeaveType,
} from './services/leave-service';
import {
  approvePayrollPeriod,
  calculatePayrollPeriod,
  cancelPayrollPeriod,
  createPayrollPeriod,
  deletePayrollPeriod,
  finalizePayrollPeriod,
  getEmployeePayrollHistory,
  getPayrollEmployeeResult,
  getPayrollPeriod,
  getPayrollPeriodDetails,
  getPayrollPeriods,
  getPayrollRegister,
  lockPayrollPeriod,
  runPayroll,
  updatePayrollPeriod,
} from './services/payroll-service';
import {
  deletePayslip,
  generatePayslips,
  getCompanyProfile,
  getEmployeePublishedPayslip,
  getPayslip,
  getPayslipOptions,
  getPayslips,
  getPayslipSummary,
  publishPeriodPayslips,
  recordPayslipDownload,
  setPayslipPublished,
  updateCompanyProfile,
} from './services/payslip-service';
import {
  getBankTransferReport,
  getContributionsReport,
  getDeductionsReport,
  getEarningsReport,
  getNetPayReport,
  getPayrollRegisterReport,
  getPayrollSummaryReport,
  getPayrollVarianceReport,
  getReportOptions,
  getReportsDashboard,
} from './services/reports-service';
import {
  cancelSelfLeaveRequest,
  createSelfAttendanceCorrection,
  createSelfLeaveRequest,
  getSelfAttendance,
  getSelfAttendanceCorrections,
  getSelfAttendanceSummary,
  getSelfContributions,
  getSelfDeductions,
  getSelfEarnings,
  getSelfIdentity,
  getSelfLeaveBalances,
  getSelfLeaveRequest,
  getSelfLeaveRequests,
  getSelfLeaveTypes,
  getSelfPayrollHistory,
  getSelfPayslip,
  getSelfPayslips,
  getSelfSchedule,
  getSelfServiceDashboard,
  getSelfServiceProfile,
  updateSelfServiceContact,
} from './services/employee-self-service';
import {
  changePassword,
  createUser,
  currentUser,
  getRoleOptions,
  getUser,
  initializeAuth,
  listAuthAuditLogs,
  listUsers,
  login,
  logout,
  resetUserPassword,
  setUserStatus,
  updateUser,
  authorizePermission,
} from './services/auth-service';

export function setupIpc(ipcMain: IpcMain): void {
  registerHandler(ipcMain, 'auth.initialize', async () => {
    await initializeAuth();
    return currentUser();
  });
  registerHandler(ipcMain, 'auth.current', async () => currentUser());
  registerHandler(ipcMain, 'auth.login', async (_event, payload: unknown) => login(payload));
  registerHandler(ipcMain, 'auth.logout', async () => logout());
  registerHandler(ipcMain, 'auth.changePassword', async (_event, payload: unknown) =>
    changePassword(payload),
  );


  registerHandler(ipcMain, 'self.dashboard', async () => getSelfServiceDashboard());
  registerHandler(ipcMain, 'self.profile', async () => getSelfServiceProfile());
  registerHandler(ipcMain, 'self.profile.updateContact', async (_event, payload: unknown) =>
    updateSelfServiceContact(payload),
  );
  registerHandler(ipcMain, 'self.attendance.list', async (_event, filters: unknown) =>
    getSelfAttendance(filters),
  );
  registerHandler(ipcMain, 'self.attendance.summary', async (_event, filters: unknown) =>
    getSelfAttendanceSummary(filters),
  );
  registerHandler(ipcMain, 'self.attendance.schedule', async () => getSelfSchedule());
  registerHandler(ipcMain, 'self.attendance.corrections', async (_event, filters: unknown) =>
    getSelfAttendanceCorrections(filters),
  );
  registerHandler(ipcMain, 'self.attendance.createCorrection', async (_event, payload: unknown) =>
    createSelfAttendanceCorrection(payload),
  );
  registerHandler(ipcMain, 'self.leave.types', async () => getSelfLeaveTypes());
  registerHandler(ipcMain, 'self.leave.balances', async (_event, filters: unknown) =>
    getSelfLeaveBalances(filters),
  );
  registerHandler(ipcMain, 'self.leave.requests', async (_event, filters: unknown) =>
    getSelfLeaveRequests(filters),
  );
  registerHandler(ipcMain, 'self.leave.get', async (_event, id: unknown) =>
    getSelfLeaveRequest(requireId(id, 'leave request')),
  );
  registerHandler(ipcMain, 'self.leave.create', async (_event, payload: unknown) =>
    createSelfLeaveRequest(payload),
  );
  registerHandler(ipcMain, 'self.leave.cancel', async (_event, id: unknown, payload: unknown) =>
    cancelSelfLeaveRequest(requireId(id, 'leave request'), payload),
  );
  registerHandler(ipcMain, 'self.earnings', async (_event, filters: unknown) =>
    getSelfEarnings(filters),
  );
  registerHandler(ipcMain, 'self.deductions', async (_event, filters: unknown) =>
    getSelfDeductions(filters),
  );
  registerHandler(ipcMain, 'self.contributions', async (_event, filters: unknown) =>
    getSelfContributions(filters),
  );
  registerHandler(ipcMain, 'self.payrollHistory', async (_event, filters: unknown) =>
    getSelfPayrollHistory(filters),
  );
  registerHandler(ipcMain, 'self.payslips', async (_event, filters: unknown) =>
    getSelfPayslips(filters),
  );
  registerHandler(ipcMain, 'self.payslip', async (_event, id: unknown) =>
    getSelfPayslip(requireId(id, 'payslip')),
  );
  registerHandler(
    ipcMain,
    'self.payslip.exportPdf',
    async (event, id: unknown, suggestedName: unknown) => {
      const payslipId = requireId(id, 'payslip');
      const [record, identity] = await Promise.all([
        getSelfPayslip(payslipId),
        getSelfIdentity(),
      ]);
      const requestedName = typeof suggestedName === 'string' ? suggestedName.trim() : '';
      const baseName = (requestedName || record.reference_number || 'payslip')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const parent = BrowserWindow.fromWebContents(event.sender);
      const options = {
        title: 'Save payslip as PDF',
        defaultPath: `${baseName || 'payslip'}.pdf`,
        filters: [{ name: 'PDF document', extensions: ['pdf'] }],
      };
      const result = parent
        ? await dialog.showSaveDialog(parent, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return { saved: false };
      const pdf = await event.sender.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
        margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 },
      });
      await writeFile(result.filePath, pdf);
      await recordPayslipDownload(
        payslipId,
        identity.user.display_name || identity.employee.name,
        result.filePath,
      );
      return { saved: true, filePath: result.filePath };
    },
  );

  registerHandler(ipcMain, 'user.list', async (_event, filters: unknown) => listUsers(filters));
  registerHandler(ipcMain, 'user.get', async (_event, id: unknown) =>
    getUser(requireId(id, 'user')),
  );
  registerHandler(ipcMain, 'user.create', async (_event, payload: unknown) => createUser(payload));
  registerHandler(ipcMain, 'user.update', async (_event, id: unknown, payload: unknown) =>
    updateUser(requireId(id, 'user'), payload),
  );
  registerHandler(ipcMain, 'user.setStatus', async (_event, id: unknown, active: unknown) =>
    setUserStatus(requireId(id, 'user'), Boolean(active)),
  );
  registerHandler(ipcMain, 'user.resetPassword', async (_event, id: unknown, payload: unknown) =>
    resetUserPassword(requireId(id, 'user'), payload),
  );
  registerHandler(ipcMain, 'user.roles', async () => getRoleOptions());
  registerHandler(ipcMain, 'user.audit', async (_event, limit: unknown) => listAuthAuditLogs(limit));
  registerHandler(ipcMain, 'employee.list', async (_event, filters: unknown) =>
    getAllEmployees(filters),
  );

  registerHandler(ipcMain, 'employee.get', async (_event, id: unknown) => {
    return getEmployee(requireId(id, 'employee'));
  });

  registerHandler(ipcMain, 'employee.create', async (_event, payload: unknown) => {
    return createEmployee(payload);
  });

  registerHandler(
    ipcMain,
    'employee.update',
    async (_event, id: unknown, payload: unknown) => {
      return updateEmployee(requireId(id, 'employee'), payload);
    },
  );

  registerHandler(
    ipcMain,
    'employee.setStatus',
    async (_event, id: unknown, active: unknown) => {
      if (typeof active !== 'boolean') {
        throw new Error('Employee status must be true or false.');
      }
      return setEmployeeStatus(requireId(id, 'employee'), active);
    },
  );

  registerHandler(ipcMain, 'employee.delete', async (_event, id: unknown) => {
    return deleteEmployee(requireId(id, 'employee'));
  });

  registerHandler(ipcMain, 'attendance.list', async (_event, filters: unknown) =>
    getAttendanceRecords(filters),
  );

  registerHandler(ipcMain, 'attendance.get', async (_event, id: unknown) =>
    getAttendanceRecord(requireId(id, 'attendance record')),
  );

  registerHandler(ipcMain, 'attendance.summary', async (_event, filters: unknown) =>
    getAttendanceSummary(filters),
  );

  registerHandler(ipcMain, 'attendance.create', async (_event, payload: unknown) =>
    createAttendanceRecord(payload),
  );

  registerHandler(
    ipcMain,
    'attendance.update',
    async (_event, id: unknown, payload: unknown) =>
      updateAttendanceRecord(requireId(id, 'attendance record'), payload),
  );

  registerHandler(ipcMain, 'attendance.delete', async (_event, id: unknown) =>
    deleteAttendanceRecord(requireId(id, 'attendance record')),
  );

  registerHandler(ipcMain, 'attendance.import', async (_event, rows: unknown) =>
    importAttendanceRows(rows),
  );

  registerHandler(ipcMain, 'schedule.list', async (_event, filters: unknown) =>
    getWorkSchedules(filters),
  );

  registerHandler(ipcMain, 'schedule.create', async (_event, payload: unknown) =>
    createWorkSchedule(payload),
  );

  registerHandler(
    ipcMain,
    'schedule.update',
    async (_event, id: unknown, payload: unknown) =>
      updateWorkSchedule(requireId(id, 'work schedule'), payload),
  );

  registerHandler(ipcMain, 'schedule.delete', async (_event, id: unknown) =>
    deleteWorkSchedule(requireId(id, 'work schedule')),
  );

  registerHandler(ipcMain, 'schedule.assignments', async (_event, filters: unknown) =>
    getScheduleAssignments(filters),
  );

  registerHandler(ipcMain, 'schedule.assign', async (_event, payload: unknown) =>
    assignWorkSchedule(payload),
  );

  registerHandler(
    ipcMain,
    'schedule.unassign',
    async (_event, id: unknown) =>
      deleteScheduleAssignment(requireId(id, 'schedule assignment')),
  );

  registerHandler(
    ipcMain,
    'attendanceCorrection.list',
    async (_event, filters: unknown) => getAttendanceCorrections(filters),
  );

  registerHandler(
    ipcMain,
    'attendanceCorrection.create',
    async (_event, payload: unknown) => createAttendanceCorrection(payload),
  );

  registerHandler(
    ipcMain,
    'attendanceCorrection.review',
    async (_event, id: unknown, payload: unknown) =>
      reviewAttendanceCorrection(requireId(id, 'attendance correction'), payload),
  );

  registerHandler(ipcMain, 'leaveType.list', async (_event, filters: unknown) =>
    getLeaveTypes(filters),
  );

  registerHandler(ipcMain, 'leaveType.create', async (_event, payload: unknown) =>
    createLeaveType(payload),
  );

  registerHandler(
    ipcMain,
    'leaveType.update',
    async (_event, id: unknown, payload: unknown) =>
      updateLeaveType(requireId(id, 'leave type'), payload),
  );

  registerHandler(ipcMain, 'leaveType.delete', async (_event, id: unknown) =>
    deleteLeaveType(requireId(id, 'leave type')),
  );

  registerHandler(ipcMain, 'leaveBalance.list', async (_event, filters: unknown) =>
    getLeaveBalances(filters),
  );

  registerHandler(ipcMain, 'leaveBalance.adjust', async (_event, payload: unknown) =>
    adjustLeaveBalance(payload),
  );

  registerHandler(ipcMain, 'leaveRequest.list', async (_event, filters: unknown) =>
    getLeaveRequests(filters),
  );

  registerHandler(ipcMain, 'leaveRequest.get', async (_event, id: unknown) =>
    getLeaveRequest(requireId(id, 'leave request')),
  );

  registerHandler(ipcMain, 'leaveRequest.summary', async (_event, filters: unknown) =>
    getLeaveSummary(filters),
  );

  registerHandler(ipcMain, 'leaveRequest.create', async (_event, payload: unknown) =>
    createLeaveRequest(payload),
  );

  registerHandler(
    ipcMain,
    'leaveRequest.update',
    async (_event, id: unknown, payload: unknown) =>
      updateLeaveRequest(requireId(id, 'leave request'), payload),
  );

  registerHandler(
    ipcMain,
    'leaveRequest.review',
    async (_event, id: unknown, payload: unknown) =>
      reviewLeaveRequest(requireId(id, 'leave request'), payload),
  );

  registerHandler(
    ipcMain,
    'leaveRequest.cancel',
    async (_event, id: unknown, payload: unknown) =>
      cancelLeaveRequest(requireId(id, 'leave request'), payload),
  );


  registerHandler(ipcMain, 'earningType.list', async (_event, filters: unknown) =>
    getEarningTypes(filters),
  );
  registerHandler(ipcMain, 'earningType.get', async (_event, id: unknown) =>
    getEarningType(requireId(id, 'earning type')),
  );
  registerHandler(ipcMain, 'earningType.create', async (_event, payload: unknown) =>
    createEarningType(payload),
  );
  registerHandler(
    ipcMain,
    'earningType.update',
    async (_event, id: unknown, payload: unknown) =>
      updateEarningType(requireId(id, 'earning type'), payload),
  );
  registerHandler(
    ipcMain,
    'earningType.setStatus',
    async (_event, id: unknown, active: unknown) => {
      if (typeof active !== 'boolean') throw new Error('Earning type status must be true or false.');
      return setEarningTypeStatus(requireId(id, 'earning type'), active);
    },
  );
  registerHandler(ipcMain, 'earningType.delete', async (_event, id: unknown) =>
    deleteEarningType(requireId(id, 'earning type')),
  );

  registerHandler(ipcMain, 'earningAssignment.list', async (_event, filters: unknown) =>
    getEarningAssignments(filters),
  );
  registerHandler(ipcMain, 'earningAssignment.get', async (_event, id: unknown) =>
    getEarningAssignment(requireId(id, 'earning assignment')),
  );
  registerHandler(ipcMain, 'earningAssignment.create', async (_event, payload: unknown) =>
    createEarningAssignment(payload),
  );
  registerHandler(
    ipcMain,
    'earningAssignment.update',
    async (_event, id: unknown, payload: unknown) =>
      updateEarningAssignment(requireId(id, 'earning assignment'), payload),
  );
  registerHandler(
    ipcMain,
    'earningAssignment.setStatus',
    async (_event, id: unknown, active: unknown) => {
      if (typeof active !== 'boolean') throw new Error('Earning assignment status must be true or false.');
      return setEarningAssignmentStatus(requireId(id, 'earning assignment'), active);
    },
  );
  registerHandler(ipcMain, 'earningAssignment.delete', async (_event, id: unknown) =>
    deleteEarningAssignment(requireId(id, 'earning assignment')),
  );

  registerHandler(ipcMain, 'earningTransaction.list', async (_event, filters: unknown) =>
    getEarningTransactions(filters),
  );
  registerHandler(ipcMain, 'earningTransaction.get', async (_event, id: unknown) =>
    getEarningTransaction(requireId(id, 'earning transaction')),
  );
  registerHandler(ipcMain, 'earningTransaction.summary', async (_event, filters: unknown) =>
    getEarningSummary(filters),
  );
  registerHandler(ipcMain, 'earningTransaction.create', async (_event, payload: unknown) =>
    createEarningTransaction(payload),
  );
  registerHandler(
    ipcMain,
    'earningTransaction.update',
    async (_event, id: unknown, payload: unknown) =>
      updateEarningTransaction(requireId(id, 'earning transaction'), payload),
  );
  registerHandler(
    ipcMain,
    'earningTransaction.setStatus',
    async (_event, id: unknown, status: unknown) => {
      if (status !== 'draft' && status !== 'approved' && status !== 'cancelled') {
        throw new Error('Invalid earning transaction status.');
      }
      return setEarningTransactionStatus(requireId(id, 'earning transaction'), status);
    },
  );
  registerHandler(ipcMain, 'earningTransaction.delete', async (_event, id: unknown) =>
    deleteEarningTransaction(requireId(id, 'earning transaction')),
  );



  registerHandler(ipcMain, 'deductionType.list', async (_event, filters: unknown) =>
    getDeductionTypes(filters),
  );
  registerHandler(ipcMain, 'deductionType.get', async (_event, id: unknown) =>
    getDeductionType(requireId(id, 'deduction type')),
  );
  registerHandler(ipcMain, 'deductionType.create', async (_event, payload: unknown) =>
    createDeductionType(payload),
  );
  registerHandler(ipcMain, 'deductionType.update', async (_event, id: unknown, payload: unknown) =>
    updateDeductionType(requireId(id, 'deduction type'), payload),
  );
  registerHandler(ipcMain, 'deductionType.setStatus', async (_event, id: unknown, active: unknown) => {
    if (typeof active !== 'boolean') throw new Error('Deduction type status must be true or false.');
    return setDeductionTypeStatus(requireId(id, 'deduction type'), active);
  });
  registerHandler(ipcMain, 'deductionType.delete', async (_event, id: unknown) =>
    deleteDeductionType(requireId(id, 'deduction type')),
  );

  registerHandler(ipcMain, 'deductionAssignment.list', async (_event, filters: unknown) =>
    getDeductionAssignments(filters),
  );
  registerHandler(ipcMain, 'deductionAssignment.get', async (_event, id: unknown) =>
    getDeductionAssignment(requireId(id, 'deduction assignment')),
  );
  registerHandler(ipcMain, 'deductionAssignment.create', async (_event, payload: unknown) =>
    createDeductionAssignment(payload),
  );
  registerHandler(ipcMain, 'deductionAssignment.update', async (_event, id: unknown, payload: unknown) =>
    updateDeductionAssignment(requireId(id, 'deduction assignment'), payload),
  );
  registerHandler(ipcMain, 'deductionAssignment.setStatus', async (_event, id: unknown, active: unknown) => {
    if (typeof active !== 'boolean') throw new Error('Deduction assignment status must be true or false.');
    return setDeductionAssignmentStatus(requireId(id, 'deduction assignment'), active);
  });
  registerHandler(ipcMain, 'deductionAssignment.delete', async (_event, id: unknown) =>
    deleteDeductionAssignment(requireId(id, 'deduction assignment')),
  );

  registerHandler(ipcMain, 'loan.list', async (_event, filters: unknown) =>
    getEmployeeLoans(filters),
  );
  registerHandler(ipcMain, 'loan.get', async (_event, id: unknown) =>
    getEmployeeLoan(requireId(id, 'loan')),
  );
  registerHandler(ipcMain, 'loan.summary', async (_event, filters: unknown) =>
    getLoanSummary(filters),
  );
  registerHandler(ipcMain, 'loan.create', async (_event, payload: unknown) =>
    createEmployeeLoan(payload),
  );
  registerHandler(ipcMain, 'loan.update', async (_event, id: unknown, payload: unknown) =>
    updateEmployeeLoan(requireId(id, 'loan'), payload),
  );
  registerHandler(ipcMain, 'loan.setStatus', async (_event, id: unknown, status: unknown) => {
    if (!['draft','active','suspended','paid','cancelled'].includes(String(status))) {
      throw new Error('Invalid loan status.');
    }
    return setEmployeeLoanStatus(requireId(id, 'loan'), status as 'draft' | 'active' | 'suspended' | 'paid' | 'cancelled');
  });
  registerHandler(ipcMain, 'loan.recordPayment', async (_event, id: unknown, payload: unknown) =>
    recordLoanPayment(requireId(id, 'loan'), payload),
  );
  registerHandler(ipcMain, 'loan.delete', async (_event, id: unknown) =>
    deleteEmployeeLoan(requireId(id, 'loan')),
  );

  registerHandler(ipcMain, 'deductionTransaction.list', async (_event, filters: unknown) =>
    getDeductionTransactions(filters),
  );
  registerHandler(ipcMain, 'deductionTransaction.get', async (_event, id: unknown) =>
    getDeductionTransaction(requireId(id, 'deduction transaction')),
  );
  registerHandler(ipcMain, 'deductionTransaction.summary', async (_event, filters: unknown) =>
    getDeductionSummary(filters),
  );
  registerHandler(ipcMain, 'deductionTransaction.create', async (_event, payload: unknown) =>
    createDeductionTransaction(payload),
  );
  registerHandler(ipcMain, 'deductionTransaction.update', async (_event, id: unknown, payload: unknown) =>
    updateDeductionTransaction(requireId(id, 'deduction transaction'), payload),
  );
  registerHandler(ipcMain, 'deductionTransaction.setStatus', async (_event, id: unknown, status: unknown) => {
    if (status !== 'draft' && status !== 'approved' && status !== 'cancelled') {
      throw new Error('Invalid deduction transaction status.');
    }
    return setDeductionTransactionStatus(requireId(id, 'deduction transaction'), status);
  });
  registerHandler(ipcMain, 'deductionTransaction.delete', async (_event, id: unknown) =>
    deleteDeductionTransaction(requireId(id, 'deduction transaction')),
  );


  registerHandler(ipcMain, 'contributionType.list', async (_event, filters: unknown) =>
    getContributionTypes(filters),
  );
  registerHandler(ipcMain, 'contributionType.get', async (_event, id: unknown) =>
    getContributionType(requireId(id, 'contribution type')),
  );
  registerHandler(ipcMain, 'contributionType.create', async (_event, payload: unknown) =>
    createContributionType(payload),
  );
  registerHandler(
    ipcMain,
    'contributionType.update',
    async (_event, id: unknown, payload: unknown) =>
      updateContributionType(requireId(id, 'contribution type'), payload),
  );
  registerHandler(
    ipcMain,
    'contributionType.setStatus',
    async (_event, id: unknown, active: unknown) => {
      if (typeof active !== 'boolean') {
        throw new Error('Contribution type status must be true or false.');
      }
      return setContributionTypeStatus(requireId(id, 'contribution type'), active);
    },
  );
  registerHandler(ipcMain, 'contributionType.delete', async (_event, id: unknown) =>
    deleteContributionType(requireId(id, 'contribution type')),
  );

  registerHandler(ipcMain, 'contributionTable.list', async (_event, filters: unknown) =>
    getContributionTables(filters),
  );
  registerHandler(ipcMain, 'contributionTable.get', async (_event, id: unknown) =>
    getContributionTable(requireId(id, 'contribution table')),
  );
  registerHandler(ipcMain, 'contributionTable.create', async (_event, payload: unknown) =>
    createContributionTable(payload),
  );
  registerHandler(
    ipcMain,
    'contributionTable.update',
    async (_event, id: unknown, payload: unknown) =>
      updateContributionTable(requireId(id, 'contribution table'), payload),
  );
  registerHandler(
    ipcMain,
    'contributionTable.setStatus',
    async (_event, id: unknown, status: unknown) => {
      if (status !== 'draft' && status !== 'active' && status !== 'archived') {
        throw new Error('Invalid contribution-table status.');
      }
      return setContributionTableStatus(requireId(id, 'contribution table'), status);
    },
  );
  registerHandler(
    ipcMain,
    'contributionTable.replaceBrackets',
    async (_event, id: unknown, payload: unknown) =>
      replaceContributionBrackets(requireId(id, 'contribution table'), payload),
  );
  registerHandler(ipcMain, 'contributionTable.delete', async (_event, id: unknown) =>
    deleteContributionTable(requireId(id, 'contribution table')),
  );

  registerHandler(ipcMain, 'contribution.calculate', async (_event, payload: unknown) =>
    calculateContribution(payload),
  );
  registerHandler(ipcMain, 'contributionRecord.list', async (_event, filters: unknown) =>
    getContributionRecords(filters),
  );
  registerHandler(ipcMain, 'contributionRecord.get', async (_event, id: unknown) =>
    getContributionRecord(requireId(id, 'contribution record')),
  );
  registerHandler(ipcMain, 'contributionRecord.summary', async (_event, filters: unknown) =>
    getContributionSummary(filters),
  );
  registerHandler(ipcMain, 'contributionRecord.create', async (_event, payload: unknown) =>
    createContributionRecord(payload),
  );
  registerHandler(
    ipcMain,
    'contributionRecord.setStatus',
    async (_event, id: unknown, status: unknown) => {
      if (status !== 'draft' && status !== 'approved' && status !== 'remitted' && status !== 'cancelled') {
        throw new Error('Invalid contribution-record status.');
      }
      return setContributionRecordStatus(requireId(id, 'contribution record'), status);
    },
  );
  registerHandler(ipcMain, 'contributionRecord.delete', async (_event, id: unknown) =>
    deleteContributionRecord(requireId(id, 'contribution record')),
  );

  registerHandler(ipcMain, 'payroll.list', async (_event, filters: unknown) =>
    getPayrollPeriods(filters),
  );
  registerHandler(ipcMain, 'payroll.get', async (_event, periodId: unknown) =>
    getPayrollPeriod(requireId(periodId, 'payroll period')),
  );
  registerHandler(ipcMain, 'payroll.details', async (_event, periodId: unknown) =>
    getPayrollPeriodDetails(requireId(periodId, 'payroll period')),
  );
  registerHandler(
    ipcMain,
    'payroll.employeeResult',
    async (_event, periodId: unknown, employeeId: unknown) =>
      getPayrollEmployeeResult(
        requireId(periodId, 'payroll period'),
        requireId(employeeId, 'employee'),
      ),
  );
  registerHandler(
    ipcMain,
    'payroll.createPeriod',
    async (_event, payload: unknown) => createPayrollPeriod(payload),
  );
  registerHandler(
    ipcMain,
    'payroll.updatePeriod',
    async (_event, periodId: unknown, payload: unknown) =>
      updatePayrollPeriod(requireId(periodId, 'payroll period'), payload),
  );
  registerHandler(ipcMain, 'payroll.deletePeriod', async (_event, periodId: unknown) =>
    deletePayrollPeriod(requireId(periodId, 'payroll period')),
  );
  registerHandler(
    ipcMain,
    'payroll.calculate',
    async (_event, periodId: unknown, actor: unknown) =>
      calculatePayrollPeriod(
        requireId(periodId, 'payroll period'),
        typeof actor === 'string' ? actor : '',
      ),
  );
  registerHandler(
    ipcMain,
    'payroll.approve',
    async (_event, periodId: unknown, actor: unknown) =>
      approvePayrollPeriod(
        requireId(periodId, 'payroll period'),
        typeof actor === 'string' ? actor : '',
      ),
  );
  registerHandler(
    ipcMain,
    'payroll.finalize',
    async (_event, periodId: unknown, actor: unknown) =>
      finalizePayrollPeriod(
        requireId(periodId, 'payroll period'),
        typeof actor === 'string' ? actor : '',
      ),
  );
  registerHandler(
    ipcMain,
    'payroll.lock',
    async (_event, periodId: unknown, actor: unknown) =>
      lockPayrollPeriod(
        requireId(periodId, 'payroll period'),
        typeof actor === 'string' ? actor : '',
      ),
  );
  registerHandler(
    ipcMain,
    'payroll.cancel',
    async (_event, periodId: unknown, actor: unknown) =>
      cancelPayrollPeriod(
        requireId(periodId, 'payroll period'),
        typeof actor === 'string' ? actor : '',
      ),
  );
  registerHandler(ipcMain, 'payroll.register', async (_event, periodId: unknown) =>
    getPayrollRegister(requireId(periodId, 'payroll period')),
  );
  registerHandler(ipcMain, 'payroll.employeeHistory', async (_event, filters: unknown) =>
    getEmployeePayrollHistory(filters),
  );

  registerHandler(ipcMain, 'companyProfile.get', async () =>
    getCompanyProfile(),
  );
  registerHandler(ipcMain, 'companyProfile.update', async (_event, payload: unknown) =>
    updateCompanyProfile(payload),
  );
  registerHandler(ipcMain, 'companyProfile.chooseLogo', async (event) => {
    const parent = BrowserWindow.fromWebContents(event.sender);
    const options: OpenDialogOptions = {
      title: 'Choose company logo',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    };
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) {
      return { selected: false };
    }
    const filePath = result.filePaths[0];
    const buffer = await readFile(filePath);
    if (buffer.byteLength > 3_000_000) {
      throw new Error('Company logo must be smaller than 3 MB.');
    }
    const extension = filePath.split('.').pop()?.toLowerCase();
    const mime = extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : 'image/jpeg';
    return {
      selected: true,
      fileName: filePath.split(/[\\/]/).pop() || 'company-logo',
      dataUrl: `data:${mime};base64,${buffer.toString('base64')}`,
    };
  });

  registerHandler(ipcMain, 'payslip.options', async () =>
    getPayslipOptions(),
  );
  registerHandler(ipcMain, 'payslip.list', async (_event, filters: unknown) =>
    getPayslips(filters),
  );
  registerHandler(ipcMain, 'payslip.summary', async (_event, filters: unknown) =>
    getPayslipSummary(filters),
  );
  registerHandler(ipcMain, 'payslip.get', async (_event, id: unknown) =>
    getPayslip(requireId(id, 'payslip')),
  );
  registerHandler(
    ipcMain,
    'payslip.employeeList',
    async (_event, employeeId: unknown) =>
      getPayslips({
        employee_id: requireId(employeeId, 'employee'),
        published_only: true,
      }),
  );
  registerHandler(
    ipcMain,
    'payslip.employeeGet',
    async (_event, id: unknown, employeeId: unknown) =>
      getEmployeePublishedPayslip(
        requireId(id, 'payslip'),
        requireId(employeeId, 'employee'),
      ),
  );
  registerHandler(ipcMain, 'payslip.generate', async (_event, payload: unknown) =>
    generatePayslips(payload),
  );
  registerHandler(
    ipcMain,
    'payslip.publish',
    async (_event, id: unknown, actor: unknown) =>
      setPayslipPublished(
        requireId(id, 'payslip'),
        true,
        typeof actor === 'string' ? actor : 'Payroll Administrator',
      ),
  );
  registerHandler(
    ipcMain,
    'payslip.unpublish',
    async (_event, id: unknown, actor: unknown) =>
      setPayslipPublished(
        requireId(id, 'payslip'),
        false,
        typeof actor === 'string' ? actor : 'Payroll Administrator',
      ),
  );
  registerHandler(
    ipcMain,
    'payslip.publishPeriod',
    async (_event, periodId: unknown, actor: unknown) =>
      publishPeriodPayslips(
        requireId(periodId, 'payroll period'),
        typeof actor === 'string' ? actor : 'Payroll Administrator',
      ),
  );
  registerHandler(ipcMain, 'payslip.delete', async (_event, id: unknown) =>
    deletePayslip(requireId(id, 'payslip')),
  );
  registerHandler(
    ipcMain,
    'payslip.exportPdf',
    async (event, id: unknown, suggestedName: unknown, actor: unknown) => {
      const payslipId = requireId(id, 'payslip');
      const record = await getPayslip(payslipId);
      if (!record) throw new Error('Payslip was not found.');
      const requestedName = typeof suggestedName === 'string' ? suggestedName.trim() : '';
      const baseName = (requestedName || record.reference_number || 'payslip')
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const parent = BrowserWindow.fromWebContents(event.sender);
      const options = {
        title: 'Save payslip as PDF',
        defaultPath: `${baseName || 'payslip'}.pdf`,
        filters: [{ name: 'PDF document', extensions: ['pdf'] }],
      };
      const result = parent
        ? await dialog.showSaveDialog(parent, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) {
        return { saved: false };
      }
      const pdf = await event.sender.printToPDF({
        printBackground: true,
        landscape: false,
        pageSize: 'A4',
        margins: { top: 0.3, bottom: 0.3, left: 0.3, right: 0.3 },
      });
      await writeFile(result.filePath, pdf);
      await recordPayslipDownload(
        payslipId,
        typeof actor === 'string' && actor.trim() ? actor.trim() : 'Payroll User',
        result.filePath,
      );
      return { saved: true, filePath: result.filePath };
    },
  );

  registerHandler(ipcMain, 'report.options', async () =>
    getReportOptions(),
  );
  registerHandler(ipcMain, 'report.dashboard', async (_event, filters: unknown) =>
    getReportsDashboard(filters),
  );
  registerHandler(ipcMain, 'report.payrollRegister', async (_event, filters: unknown) =>
    getPayrollRegisterReport(filters),
  );
  registerHandler(ipcMain, 'report.payrollSummary', async (_event, filters: unknown) =>
    getPayrollSummaryReport(filters),
  );
  registerHandler(ipcMain, 'report.earnings', async (_event, filters: unknown) =>
    getEarningsReport(filters),
  );
  registerHandler(ipcMain, 'report.deductions', async (_event, filters: unknown) =>
    getDeductionsReport(filters),
  );
  registerHandler(ipcMain, 'report.contributions', async (_event, filters: unknown) =>
    getContributionsReport(filters),
  );
  registerHandler(ipcMain, 'report.netPay', async (_event, filters: unknown) =>
    getNetPayReport(filters),
  );
  registerHandler(ipcMain, 'report.variance', async (_event, payload: unknown) =>
    getPayrollVarianceReport(payload),
  );
  registerHandler(ipcMain, 'report.bankTransfer', async (_event, filters: unknown) =>
    getBankTransferReport(filters),
  );
  registerHandler(ipcMain, 'report.exportPdf', async (event, suggestedName: unknown) => {
    const baseName = typeof suggestedName === 'string' && suggestedName.trim()
      ? suggestedName.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '')
      : 'payroll-report';
    const defaultPath = `${baseName || 'payroll-report'}.pdf`;
    const parent = BrowserWindow.fromWebContents(event.sender);
    const options = {
      title: 'Save payroll report as PDF',
      defaultPath,
      filters: [{ name: 'PDF document', extensions: ['pdf'] }],
    };
    const result = parent
      ? await dialog.showSaveDialog(parent, options)
      : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      return { saved: false };
    }
    const pdf = await event.sender.printToPDF({
      printBackground: true,
      landscape: true,
      pageSize: 'A4',
      margins: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 },
    });
    await writeFile(result.filePath, pdf);
    return { saved: true, filePath: result.filePath };
  });

  // Legacy Phase A endpoint.
  registerHandler(ipcMain, 'payroll.run', async (_event, periodId: unknown) =>
    runPayroll(requireId(periodId, 'payroll period')),
  );
}

function requireId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`A valid ${label} ID is required.`);
  }
  return value.trim();
}

function registerHandler(
  ipcMain: IpcMain,
  channel: string,
  listener: Parameters<IpcMain['handle']>[1],
): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, async (...args) => {
    const permission = getChannelPermission(channel);
    if (permission) await authorizePermission(permission);
    return listener(...args);
  });
}

function getChannelPermission(channel: string): string | null {
  const exact: Record<string, string> = {
    'user.get': 'users:manage',
    'employee.list': 'employees:view',
    'employee.get': 'employees:view',
    'attendance.list': 'timekeeping:view',
    'attendance.get': 'timekeeping:view',
    'attendance.summary': 'timekeeping:view',
    'schedule.list': 'timekeeping:view',
    'schedule.assignments': 'timekeeping:view',
    'attendanceCorrection.list': 'timekeeping:view',
    'attendanceCorrection.create': 'timekeeping:manage',
    'leaveType.list': 'leave:view',
    'leaveBalance.list': 'leave:view',
    'leaveRequest.list': 'leave:view',
    'leaveRequest.get': 'leave:view',
    'leaveRequest.summary': 'leave:view',
    'leaveRequest.create': 'leave:manage',
    'leaveRequest.update': 'leave:manage',
    'leaveRequest.cancel': 'leave:manage',
    'companyProfile.get': 'payslips:view',
    'payslip.employeeList': 'payslips:view',
    'payslip.employeeGet': 'payslips:view',
    'payslip.exportPdf': 'payslips:view',
    'employee.create': 'employees:manage',
    'employee.update': 'employees:manage',
    'employee.setStatus': 'employees:manage',
    'employee.delete': 'employees:manage',
    'attendance.create': 'timekeeping:manage',
    'attendance.update': 'timekeeping:manage',
    'attendance.delete': 'timekeeping:manage',
    'attendance.import': 'timekeeping:manage',
    'schedule.create': 'timekeeping:manage',
    'schedule.update': 'timekeeping:manage',
    'schedule.delete': 'timekeeping:manage',
    'schedule.assign': 'timekeeping:manage',
    'schedule.unassign': 'timekeeping:manage',
    'attendanceCorrection.review': 'timekeeping:manage',
    'leaveType.create': 'leave:manage',
    'leaveType.update': 'leave:manage',
    'leaveType.delete': 'leave:manage',
    'leaveBalance.adjust': 'leave:manage',
    'leaveRequest.review': 'leave:manage',
    'earningType.create': 'earnings:manage',
    'earningType.update': 'earnings:manage',
    'earningType.setStatus': 'earnings:manage',
    'earningType.delete': 'earnings:manage',
    'earningAssignment.create': 'earnings:manage',
    'earningAssignment.update': 'earnings:manage',
    'earningAssignment.setStatus': 'earnings:manage',
    'earningAssignment.delete': 'earnings:manage',
    'earningTransaction.create': 'earnings:manage',
    'earningTransaction.update': 'earnings:manage',
    'earningTransaction.setStatus': 'earnings:manage',
    'earningTransaction.delete': 'earnings:manage',
    'deductionType.create': 'deductions:manage',
    'deductionType.update': 'deductions:manage',
    'deductionType.setStatus': 'deductions:manage',
    'deductionType.delete': 'deductions:manage',
    'deductionAssignment.create': 'deductions:manage',
    'deductionAssignment.update': 'deductions:manage',
    'deductionAssignment.setStatus': 'deductions:manage',
    'deductionAssignment.delete': 'deductions:manage',
    'loan.create': 'deductions:manage',
    'loan.update': 'deductions:manage',
    'loan.setStatus': 'deductions:manage',
    'loan.recordPayment': 'deductions:manage',
    'loan.delete': 'deductions:manage',
    'deductionTransaction.create': 'deductions:manage',
    'deductionTransaction.update': 'deductions:manage',
    'deductionTransaction.setStatus': 'deductions:manage',
    'deductionTransaction.delete': 'deductions:manage',
    'contributionType.create': 'contributions:manage',
    'contributionType.update': 'contributions:manage',
    'contributionType.setStatus': 'contributions:manage',
    'contributionType.delete': 'contributions:manage',
    'contributionTable.create': 'contributions:manage',
    'contributionTable.update': 'contributions:manage',
    'contributionTable.setStatus': 'contributions:manage',
    'contributionTable.replaceBrackets': 'contributions:manage',
    'contributionTable.delete': 'contributions:manage',
    'contribution.calculate': 'contributions:manage',
    'contributionRecord.create': 'contributions:manage',
    'contributionRecord.setStatus': 'contributions:manage',
    'contributionRecord.delete': 'contributions:manage',
    'companyProfile.update': 'payslips:manage',
    'companyProfile.chooseLogo': 'payslips:manage',
    'payslip.generate': 'payslips:manage',
    'payslip.publish': 'payslips:manage',
    'payslip.unpublish': 'payslips:manage',
    'payslip.publishPeriod': 'payslips:manage',
    'payslip.delete': 'payslips:manage',
  };
  if (exact[channel]) return exact[channel];
  if (channel.startsWith('self.')) return 'employee_portal:view';
  if (channel.startsWith('earningType.') || channel.startsWith('earningAssignment.') || channel.startsWith('earningTransaction.')) {
    return 'earnings:manage';
  }
  if (channel.startsWith('deductionType.') || channel.startsWith('deductionAssignment.') || channel.startsWith('loan.') || channel.startsWith('deductionTransaction.')) {
    return 'deductions:manage';
  }
  if (channel.startsWith('contributionType.') || channel.startsWith('contributionTable.') || channel.startsWith('contributionRecord.') || channel === 'contribution.calculate') {
    return 'contributions:manage';
  }
  if (channel.startsWith('report.')) return 'reports:view';
  if (channel.startsWith('payroll.')) return 'payroll:manage';
  if (channel === 'payslip.list' || channel === 'payslip.summary' || channel === 'payslip.get' || channel === 'payslip.options') {
    return 'payslips:view';
  }
  return null;
}
