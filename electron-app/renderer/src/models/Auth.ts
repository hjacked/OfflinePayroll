export type UserRole =
  | 'administrator'
  | 'hr_officer'
  | 'payroll_officer'
  | 'supervisor'
  | 'employee';

export interface AuthUser {
  id: string;
  username: string;
  display_name: string;
  email: string;
  role: UserRole;
  employee_id: string | null;
  employee_name: string | null;
  is_active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  permissions: string[];
}

export interface LoginInput {
  username: string;
  password: string;
  remember: boolean;
}

export interface UserAccountInput {
  username: string;
  display_name: string;
  email: string;
  role: UserRole;
  employee_id: string | null;
  is_active: boolean;
  password?: string;
}

export interface UserListFilters {
  search?: string;
  role?: UserRole | 'all';
  active?: boolean;
}

export interface RoleOption {
  value: UserRole;
  label: string;
  permissions: string[];
}

export interface AuthAuditLog {
  id: string;
  user_id: string | null;
  username: string;
  display_name: string | null;
  action: string;
  details: string | null;
  created_at: string;
}
