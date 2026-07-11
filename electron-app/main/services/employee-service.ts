import { randomUUID } from 'node:crypto';
import { getDb } from '../db';

export const employmentStatuses = [
  'probationary',
  'regular',
  'contractual',
  'project-based',
  'part-time',
  'resigned',
  'terminated',
  'retired',
] as const;

export const salaryTypes = [
  'monthly',
  'daily',
  'hourly',
  'fixed-contract',
] as const;

export interface EmployeeRecord {
  id: string;
  employee_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  role_title: string;
  employment_status: string;
  employment_date: string;
  salary_type: string;
  basic_salary: number;
  salary_grade: string;
  bank_name: string;
  bank_account: string;
  sss_number: string;
  philhealth_number: string;
  pagibig_number: string;
  tin_number: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeListFilters {
  query?: string;
  status?: 'all' | 'active' | 'inactive';
}

interface ValidatedEmployeeInput {
  employee_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  role_title: string;
  employment_status: string;
  employment_date: string;
  salary_type: string;
  basic_salary: number;
  salary_grade: string;
  bank_name: string;
  bank_account: string;
  sss_number: string;
  philhealth_number: string;
  pagibig_number: string;
  tin_number: string;
  is_active: number;
}

const employeeSelect = `
  SELECT
    id,
    employee_number,
    COALESCE(first_name, '') AS first_name,
    COALESCE(middle_name, '') AS middle_name,
    COALESCE(last_name, '') AS last_name,
    name,
    email,
    COALESCE(phone, '') AS phone,
    COALESCE(address, '') AS address,
    COALESCE(department, '') AS department,
    COALESCE(role_title, '') AS role_title,
    COALESCE(employment_status, 'regular') AS employment_status,
    COALESCE(employment_date, '') AS employment_date,
    COALESCE(salary_type, 'monthly') AS salary_type,
    COALESCE(basic_salary, 0) AS basic_salary,
    COALESCE(salary_grade, '') AS salary_grade,
    COALESCE(bank_name, '') AS bank_name,
    COALESCE(bank_account, '') AS bank_account,
    COALESCE(sss_number, '') AS sss_number,
    COALESCE(philhealth_number, '') AS philhealth_number,
    COALESCE(pagibig_number, '') AS pagibig_number,
    COALESCE(tin_number, '') AS tin_number,
    COALESCE(is_active, 1) AS is_active,
    created_at,
    updated_at
  FROM employees
`;

export async function getAllEmployees(filters?: unknown): Promise<{
  data: EmployeeRecord[];
  total: number;
}> {
  const parsedFilters = parseListFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (parsedFilters.query) {
    const searchValue = `%${parsedFilters.query}%`;
    clauses.push(`(
      employee_number LIKE ? COLLATE NOCASE
      OR name LIKE ? COLLATE NOCASE
      OR email LIKE ? COLLATE NOCASE
      OR department LIKE ? COLLATE NOCASE
      OR role_title LIKE ? COLLATE NOCASE
    )`);
    values.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  if (parsedFilters.status === 'active') {
    clauses.push('COALESCE(is_active, 1) = 1');
  } else if (parsedFilters.status === 'inactive') {
    clauses.push('COALESCE(is_active, 1) = 0');
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await getDb().all<EmployeeRecord[]>(
    `${employeeSelect}
     ${whereClause}
     ORDER BY last_name COLLATE NOCASE ASC,
              first_name COLLATE NOCASE ASC,
              name COLLATE NOCASE ASC`,
    ...values,
  );

  return { data: rows, total: rows.length };
}

export async function getEmployee(id: string): Promise<EmployeeRecord | null> {
  const row = await getDb().get<EmployeeRecord>(
    `${employeeSelect} WHERE id = ?`,
    id,
  );

  return row ?? null;
}

export async function createEmployee(payload: unknown): Promise<EmployeeRecord> {
  const input = validateEmployeeInput(payload);
  const id = `emp_${randomUUID()}`;

  try {
    await getDb().run(
      `INSERT INTO employees (
        id, employee_number, first_name, middle_name, last_name, name, email,
        phone, address, department, role_title, employment_status,
        employment_date, salary_type, basic_salary, salary_grade, bank_name,
        bank_account, sss_number, philhealth_number, pagibig_number, tin_number,
        is_active, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        datetime('now'), datetime('now')
      )`,
      id,
      input.employee_number,
      input.first_name,
      input.middle_name,
      input.last_name,
      input.name,
      input.email,
      input.phone,
      input.address,
      input.department,
      input.role_title,
      input.employment_status,
      input.employment_date || null,
      input.salary_type,
      input.basic_salary,
      input.salary_grade,
      input.bank_name,
      input.bank_account,
      input.sss_number,
      input.philhealth_number,
      input.pagibig_number,
      input.tin_number,
      input.is_active,
    );
  } catch (error) {
    throw translateConstraintError(error);
  }

  return requireEmployee(id);
}

export async function updateEmployee(
  id: string,
  payload: unknown,
): Promise<EmployeeRecord> {
  await requireEmployee(id);
  const input = validateEmployeeInput(payload);

  try {
    await getDb().run(
      `UPDATE employees
          SET employee_number = ?,
              first_name = ?,
              middle_name = ?,
              last_name = ?,
              name = ?,
              email = ?,
              phone = ?,
              address = ?,
              department = ?,
              role_title = ?,
              employment_status = ?,
              employment_date = ?,
              salary_type = ?,
              basic_salary = ?,
              salary_grade = ?,
              bank_name = ?,
              bank_account = ?,
              sss_number = ?,
              philhealth_number = ?,
              pagibig_number = ?,
              tin_number = ?,
              is_active = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
      input.employee_number,
      input.first_name,
      input.middle_name,
      input.last_name,
      input.name,
      input.email,
      input.phone,
      input.address,
      input.department,
      input.role_title,
      input.employment_status,
      input.employment_date || null,
      input.salary_type,
      input.basic_salary,
      input.salary_grade,
      input.bank_name,
      input.bank_account,
      input.sss_number,
      input.philhealth_number,
      input.pagibig_number,
      input.tin_number,
      input.is_active,
      id,
    );
  } catch (error) {
    throw translateConstraintError(error);
  }

  return requireEmployee(id);
}

export async function setEmployeeStatus(
  id: string,
  active: boolean,
): Promise<EmployeeRecord> {
  const result = await getDb().run(
    `UPDATE employees
        SET is_active = ?, updated_at = datetime('now')
      WHERE id = ?`,
    active ? 1 : 0,
    id,
  );

  if ((result.changes ?? 0) === 0) {
    throw new Error('Employee record was not found.');
  }

  return requireEmployee(id);
}

export async function deleteEmployee(id: string): Promise<{ id: string }> {
  const result = await getDb().run('DELETE FROM employees WHERE id = ?', id);

  if ((result.changes ?? 0) === 0) {
    throw new Error('Employee record was not found.');
  }

  return { id };
}

async function requireEmployee(id: string): Promise<EmployeeRecord> {
  const employee = await getEmployee(id);
  if (!employee) {
    throw new Error('Employee record was not found.');
  }
  return employee;
}

function parseListFilters(filters: unknown): Required<EmployeeListFilters> {
  if (!isRecord(filters)) {
    return { query: '', status: 'all' };
  }

  const query = readString(filters, 'query');
  const candidateStatus = readString(filters, 'status');
  const status = candidateStatus === 'active' || candidateStatus === 'inactive'
    ? candidateStatus
    : 'all';

  return { query, status };
}

function validateEmployeeInput(payload: unknown): ValidatedEmployeeInput {
  if (!isRecord(payload)) {
    throw new Error('Employee information is required.');
  }

  const employeeNumber = readString(payload, 'employee_number');
  const firstName = readString(payload, 'first_name');
  const middleName = readString(payload, 'middle_name');
  const lastName = readString(payload, 'last_name');
  const email = readString(payload, 'email').toLowerCase();
  const employmentStatus = readString(payload, 'employment_status') || 'regular';
  const salaryType = readString(payload, 'salary_type') || 'monthly';
  const employmentDate = readString(payload, 'employment_date');
  const rawSalary = payload.basic_salary;
  const basicSalary = typeof rawSalary === 'number'
    ? rawSalary
    : Number(String(rawSalary ?? '').replace(/,/g, ''));

  if (!employeeNumber) {
    throw new Error('Employee number is required.');
  }
  if (!firstName) {
    throw new Error('First name is required.');
  }
  if (!lastName) {
    throw new Error('Last name is required.');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('A valid email address is required.');
  }
  if (!employmentStatuses.includes(employmentStatus as typeof employmentStatuses[number])) {
    throw new Error('Employment status is invalid.');
  }
  if (!salaryTypes.includes(salaryType as typeof salaryTypes[number])) {
    throw new Error('Salary type is invalid.');
  }
  if (employmentDate && !/^\d{4}-\d{2}-\d{2}$/.test(employmentDate)) {
    throw new Error('Employment date must use YYYY-MM-DD format.');
  }
  if (!Number.isFinite(basicSalary) || basicSalary < 0) {
    throw new Error('Basic salary must be zero or a positive number.');
  }

  const isActiveValue = payload.is_active;
  const isActive = typeof isActiveValue === 'boolean'
    ? isActiveValue
    : isActiveValue === 0 || isActiveValue === '0'
      ? false
      : true;

  return {
    employee_number: employeeNumber,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    name: [firstName, middleName, lastName].filter(Boolean).join(' '),
    email,
    phone: readString(payload, 'phone'),
    address: readString(payload, 'address'),
    department: readString(payload, 'department'),
    role_title: readString(payload, 'role_title'),
    employment_status: employmentStatus,
    employment_date: employmentDate,
    salary_type: salaryType,
    basic_salary: basicSalary,
    salary_grade: readString(payload, 'salary_grade'),
    bank_name: readString(payload, 'bank_name'),
    bank_account: readString(payload, 'bank_account'),
    sss_number: readString(payload, 'sss_number'),
    philhealth_number: readString(payload, 'philhealth_number'),
    pagibig_number: readString(payload, 'pagibig_number'),
    tin_number: readString(payload, 'tin_number'),
    is_active: isActive ? 1 : 0,
  };
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function translateConstraintError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('employees.employee_number')) {
    return new Error('That employee number is already in use.');
  }
  if (message.includes('employees.email')) {
    return new Error('That email address is already in use.');
  }

  return error instanceof Error ? error : new Error('Unable to save employee.');
}
