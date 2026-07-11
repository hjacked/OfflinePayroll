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
