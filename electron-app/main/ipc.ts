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
  createPayrollPeriod,
  runPayroll,
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

  registerHandler(
    ipcMain,
    'payroll.createPeriod',
    async (_event, payload: unknown) => createPayrollPeriod(payload),
  );

  registerHandler(ipcMain, 'payroll.run', async (_event, periodId: unknown) => {
    if (typeof periodId !== 'string' || !periodId.trim()) {
      throw new Error('A valid payroll-period ID is required.');
    }
    return runPayroll(periodId);
  });
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
