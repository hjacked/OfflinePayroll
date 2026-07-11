import type { IpcMain } from 'electron';
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

export function setupIpc(ipcMain: IpcMain): void {
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
  ipcMain.handle(channel, listener);
}
