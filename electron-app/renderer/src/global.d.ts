export interface PayrollEmployeeSummary {
  id: string;
  name: string;
  email: string;
  department?: string;
  role_title?: string;
}

export interface PayrollApi {
  employee: {
    list: () => Promise<{ data: PayrollEmployeeSummary[]; total: number }>;
    get: (id: string) => Promise<PayrollEmployeeSummary | null>;
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
