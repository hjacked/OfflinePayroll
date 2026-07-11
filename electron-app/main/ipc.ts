import type { IpcMain } from 'electron';
import {
  getAllEmployees,
  getEmployee,
} from './services/employee-service';
import {
  createPayrollPeriod,
  runPayroll,
} from './services/payroll-service';

export function setupIpc(ipcMain: IpcMain): void {
  registerHandler(ipcMain, 'employee.list', async () => getAllEmployees());

  registerHandler(ipcMain, 'employee.get', async (_event, id: unknown) => {
    if (typeof id !== 'string' || !id.trim()) {
      throw new Error('A valid employee ID is required.');
    }
    return getEmployee(id);
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

function registerHandler(
  ipcMain: IpcMain,
  channel: string,
  listener: Parameters<IpcMain['handle']>[1],
): void {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
}
