import { contextBridge, ipcRenderer } from 'electron';

export interface EmployeeSummary {
  id: string;
  name: string;
  email: string;
  department?: string;
  role_title?: string;
}

export interface EmployeeListResponse {
  data: EmployeeSummary[];
  total: number;
}

export interface CreatePayrollPeriodPayload {
  name: string;
  start_date: string;
  end_date: string;
  frequency: string;
  created_by?: string;
}

export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  frequency: string;
  status: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PayrollApi {
  employee: {
    list: () => Promise<EmployeeListResponse>;
    get: (id: string) => Promise<EmployeeSummary | null>;
  };
  payroll: {
    createPeriod: (
      payload: CreatePayrollPeriodPayload,
    ) => Promise<{ period: PayrollPeriod }>;
    run: (periodId: string) => Promise<{
      periodId: string;
      status: string;
    }>;
  };
}

const api: PayrollApi = {
  employee: {
    list: () => ipcRenderer.invoke('employee.list'),
    get: (id: string) => ipcRenderer.invoke('employee.get', id),
  },
  payroll: {
    createPeriod: (payload: CreatePayrollPeriodPayload) =>
      ipcRenderer.invoke('payroll.createPeriod', payload),
    run: (periodId: string) => ipcRenderer.invoke('payroll.run', periodId),
  },
};

contextBridge.exposeInMainWorld('api', api);
