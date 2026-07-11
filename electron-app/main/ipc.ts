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
  createEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployee,
  setEmployeeStatus,
  updateEmployee,
} from './services/employee-service';
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
