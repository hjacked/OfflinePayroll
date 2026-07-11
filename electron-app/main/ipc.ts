import type { IpcMain } from 'electron';
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
    return getEmployee(requireEmployeeId(id));
  });

  registerHandler(ipcMain, 'employee.create', async (_event, payload: unknown) => {
    return createEmployee(payload);
  });

  registerHandler(
    ipcMain,
    'employee.update',
    async (_event, id: unknown, payload: unknown) => {
      return updateEmployee(requireEmployeeId(id), payload);
    },
  );

  registerHandler(
    ipcMain,
    'employee.setStatus',
    async (_event, id: unknown, active: unknown) => {
      if (typeof active !== 'boolean') {
        throw new Error('Employee status must be true or false.');
      }
      return setEmployeeStatus(requireEmployeeId(id), active);
    },
  );

  registerHandler(ipcMain, 'employee.delete', async (_event, id: unknown) => {
    return deleteEmployee(requireEmployeeId(id));
  });

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

function requireEmployeeId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('A valid employee ID is required.');
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
