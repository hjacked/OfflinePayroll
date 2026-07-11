import type {
  Employee,
  EmployeeInput,
  EmployeeListFilters,
} from './models/Employee';

export interface PayrollApi {
  employee: {
    list: (
      filters?: EmployeeListFilters,
    ) => Promise<{ data: Employee[]; total: number }>;
    get: (id: string) => Promise<Employee | null>;
    create: (payload: EmployeeInput) => Promise<Employee>;
    update: (id: string, payload: EmployeeInput) => Promise<Employee>;
    setStatus: (id: string, active: boolean) => Promise<Employee>;
    delete: (id: string) => Promise<{ id: string }>;
  };
  payroll: {
    createPeriod: (payload: {
      name: string;
      start_date: string;
      end_date: string;
      frequency: string;
      created_by?: string;
    }) => Promise<{
      period: {
        id: string;
        name: string;
        start_date: string;
        end_date: string;
        frequency: string;
        status: string;
        created_by?: string;
        created_at?: string;
        updated_at?: string;
      };
    }>;
    run: (periodId: string) => Promise<{ periodId: string; status: string }>;
  };
}

declare global {
  interface Window {
    api: PayrollApi;
  }
}
