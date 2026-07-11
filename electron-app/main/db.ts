import { app } from 'electron';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

let database: Database | null = null;

function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'payroll_offline.sqlite');
}

export async function initDb(): Promise<Database> {
  if (database) {
    return database;
  }

  database = await open({
    filename: getDatabasePath(),
    driver: sqlite3.Database,
  });

  await database.exec('PRAGMA foreign_keys = ON;');
  await database.exec('PRAGMA journal_mode = WAL;');
  await ensureSchema(database);
  await seedInitialData(database);
  await seedDefaultWorkSchedule(database);
  await seedDefaultLeaveTypes(database);
  await seedCurrentYearLeaveBalances(database);
  await seedDefaultEarningTypes(database);

  console.log('Payroll database initialized:', getDatabasePath());
  return database;
}

async function ensureSchema(db: Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employee_number TEXT,
      first_name TEXT,
      middle_name TEXT,
      last_name TEXT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      department TEXT,
      role_title TEXT,
      employment_status TEXT NOT NULL DEFAULT 'regular',
      employment_date TEXT,
      salary_type TEXT NOT NULL DEFAULT 'monthly',
      basic_salary REAL NOT NULL DEFAULT 0,
      salary_grade TEXT,
      bank_name TEXT,
      bank_account TEXT,
      sss_number TEXT,
      philhealth_number TEXT,
      pagibig_number TEXT,
      tin_number TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payroll_periods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      frequency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (status IN ('open', 'processing', 'completed', 'locked', 'cancelled'))
    );
  `);

  await migrateEmployeesTable(db);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS work_schedules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER NOT NULL DEFAULT 60,
      grace_minutes INTEGER NOT NULL DEFAULT 0,
      standard_hours REAL NOT NULL DEFAULT 8,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (break_minutes >= 0),
      CHECK (grace_minutes >= 0),
      CHECK (standard_hours >= 0),
      CHECK (is_active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS employee_schedule_assignments (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      schedule_id TEXT NOT NULL,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (schedule_id) REFERENCES work_schedules(id) ON DELETE CASCADE,
      CHECK (effective_to IS NULL OR effective_to = '' OR effective_to >= effective_from)
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      work_date TEXT NOT NULL,
      schedule_id TEXT,
      scheduled_time_in TEXT,
      scheduled_time_out TEXT,
      time_in TEXT,
      time_out TEXT,
      break_minutes INTEGER NOT NULL DEFAULT 0,
      hours_worked REAL NOT NULL DEFAULT 0,
      regular_hours REAL NOT NULL DEFAULT 0,
      late_minutes INTEGER NOT NULL DEFAULT 0,
      undertime_minutes INTEGER NOT NULL DEFAULT 0,
      overtime_hours REAL NOT NULL DEFAULT 0,
      night_diff_hours REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'present',
      source TEXT NOT NULL DEFAULT 'manual',
      notes TEXT,
      payroll_period_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      FOREIGN KEY (schedule_id) REFERENCES work_schedules(id) ON DELETE SET NULL,
      FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE SET NULL,
      UNIQUE (employee_id, work_date),
      CHECK (break_minutes >= 0),
      CHECK (hours_worked >= 0),
      CHECK (regular_hours >= 0),
      CHECK (late_minutes >= 0),
      CHECK (undertime_minutes >= 0),
      CHECK (overtime_hours >= 0),
      CHECK (night_diff_hours >= 0),
      CHECK (status IN (
        'present', 'absent', 'leave', 'rest-day', 'holiday',
        'official-business', 'work-from-home', 'incomplete'
      )),
      CHECK (source IN ('manual', 'csv-import', 'biometric', 'employee-correction'))
    );

    CREATE TABLE IF NOT EXISTS attendance_corrections (
      id TEXT PRIMARY KEY,
      attendance_id TEXT,
      employee_id TEXT NOT NULL,
      work_date TEXT NOT NULL,
      requested_time_in TEXT,
      requested_time_out TEXT,
      requested_status TEXT NOT NULL DEFAULT 'present',
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_notes TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (attendance_id) REFERENCES attendance_records(id) ON DELETE SET NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      CHECK (requested_status IN (
        'present', 'absent', 'leave', 'rest-day', 'holiday',
        'official-business', 'work-from-home', 'incomplete'
      )),
      CHECK (status IN ('pending', 'approved', 'rejected'))
    );

    CREATE INDEX IF NOT EXISTS idx_employees_email
      ON employees(email);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_number_unique
      ON employees(employee_number)
      WHERE employee_number IS NOT NULL AND trim(employee_number) <> '';

    CREATE INDEX IF NOT EXISTS idx_employees_name
      ON employees(last_name, first_name, name);

    CREATE INDEX IF NOT EXISTS idx_employees_status
      ON employees(is_active, employment_status);

    CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates
      ON payroll_periods(start_date, end_date);

    CREATE INDEX IF NOT EXISTS idx_work_schedules_active
      ON work_schedules(is_active, name);

    CREATE INDEX IF NOT EXISTS idx_schedule_assignments_employee_dates
      ON employee_schedule_assignments(employee_id, effective_from, effective_to);

    CREATE INDEX IF NOT EXISTS idx_attendance_work_date
      ON attendance_records(work_date);

    CREATE INDEX IF NOT EXISTS idx_attendance_employee_date
      ON attendance_records(employee_id, work_date);

    CREATE INDEX IF NOT EXISTS idx_attendance_status_date
      ON attendance_records(status, work_date);

    CREATE INDEX IF NOT EXISTS idx_corrections_status_date
      ON attendance_corrections(status, work_date);
  `);

  await migrateAttendanceTable(db);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS leave_types (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_paid INTEGER NOT NULL DEFAULT 1,
      track_balance INTEGER NOT NULL DEFAULT 1,
      annual_credit REAL NOT NULL DEFAULT 0,
      allow_half_day INTEGER NOT NULL DEFAULT 1,
      require_attachment INTEGER NOT NULL DEFAULT 0,
      advance_notice_days INTEGER NOT NULL DEFAULT 0,
      allow_carry_over INTEGER NOT NULL DEFAULT 0,
      max_carry_over REAL NOT NULL DEFAULT 0,
      min_service_months INTEGER NOT NULL DEFAULT 0,
      gender_eligibility TEXT NOT NULL DEFAULT 'all',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (is_paid IN (0, 1)),
      CHECK (track_balance IN (0, 1)),
      CHECK (annual_credit >= 0),
      CHECK (allow_half_day IN (0, 1)),
      CHECK (require_attachment IN (0, 1)),
      CHECK (advance_notice_days >= 0),
      CHECK (allow_carry_over IN (0, 1)),
      CHECK (max_carry_over >= 0),
      CHECK (min_service_months >= 0),
      CHECK (gender_eligibility IN ('all', 'female', 'male')),
      CHECK (is_active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS employee_leave_balances (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      leave_type_id TEXT NOT NULL,
      balance_year INTEGER NOT NULL,
      opening_balance REAL NOT NULL DEFAULT 0,
      earned REAL NOT NULL DEFAULT 0,
      adjustments REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
      UNIQUE (employee_id, leave_type_id, balance_year),
      CHECK (balance_year >= 2000 AND balance_year <= 2200)
    );

    CREATE TABLE IF NOT EXISTS leave_balance_adjustments (
      id TEXT PRIMARY KEY,
      balance_id TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (balance_id) REFERENCES employee_leave_balances(id) ON DELETE CASCADE,
      CHECK (amount <> 0)
    );

    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      leave_type_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      duration_type TEXT NOT NULL DEFAULT 'full-day',
      total_days REAL NOT NULL,
      reason TEXT NOT NULL,
      attachment_reference TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewer_notes TEXT,
      reviewed_at TEXT,
      cancelled_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
      CHECK (end_date >= start_date),
      CHECK (duration_type IN ('full-day', 'half-day-am', 'half-day-pm')),
      CHECK (total_days > 0),
      CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
    );

    CREATE TABLE IF NOT EXISTS leave_attendance_snapshots (
      id TEXT PRIMARY KEY,
      leave_request_id TEXT NOT NULL,
      work_date TEXT NOT NULL,
      attendance_id TEXT NOT NULL,
      created_new INTEGER NOT NULL DEFAULT 0,
      prior_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE CASCADE,
      CHECK (created_new IN (0, 1)),
      UNIQUE (leave_request_id, work_date)
    );

    CREATE INDEX IF NOT EXISTS idx_leave_types_active
      ON leave_types(is_active, name);

    CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_year
      ON employee_leave_balances(employee_id, balance_year);

    CREATE INDEX IF NOT EXISTS idx_leave_balances_type_year
      ON employee_leave_balances(leave_type_id, balance_year);

    CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_dates
      ON leave_requests(employee_id, start_date, end_date);

    CREATE INDEX IF NOT EXISTS idx_leave_requests_status_dates
      ON leave_requests(status, start_date, end_date);

    CREATE INDEX IF NOT EXISTS idx_attendance_leave_request
      ON attendance_records(leave_request_id);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS earning_types (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'allowance',
      description TEXT,
      calculation_type TEXT NOT NULL DEFAULT 'fixed',
      default_amount REAL NOT NULL DEFAULT 0,
      recurrence TEXT NOT NULL DEFAULT 'recurring',
      taxability TEXT NOT NULL DEFAULT 'taxable',
      include_in_gross INTEGER NOT NULL DEFAULT 1,
      include_in_contribution_basis INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (category IN ('allowance', 'bonus', 'incentive', 'commission', 'reimbursement', 'adjustment', 'other')),
      CHECK (calculation_type IN ('fixed', 'variable')),
      CHECK (default_amount >= 0),
      CHECK (recurrence IN ('recurring', 'one-time')),
      CHECK (taxability IN ('taxable', 'non-taxable')),
      CHECK (include_in_gross IN (0, 1)),
      CHECK (include_in_contribution_basis IN (0, 1)),
      CHECK (is_active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS earning_assignments (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      earning_type_id TEXT NOT NULL,
      amount REAL NOT NULL,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (earning_type_id) REFERENCES earning_types(id) ON DELETE RESTRICT,
      CHECK (amount >= 0),
      CHECK (effective_to IS NULL OR effective_to = '' OR effective_to >= effective_from),
      CHECK (is_active IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS earning_transactions (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      earning_type_id TEXT NOT NULL,
      assignment_id TEXT,
      transaction_date TEXT NOT NULL,
      payroll_period_id TEXT,
      amount REAL NOT NULL,
      reference TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      FOREIGN KEY (earning_type_id) REFERENCES earning_types(id) ON DELETE RESTRICT,
      FOREIGN KEY (assignment_id) REFERENCES earning_assignments(id) ON DELETE SET NULL,
      FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE SET NULL,
      CHECK (amount >= 0),
      CHECK (status IN ('draft', 'approved', 'cancelled'))
    );

    CREATE INDEX IF NOT EXISTS idx_earning_types_active
      ON earning_types(is_active, category, name);

    CREATE INDEX IF NOT EXISTS idx_earning_assignments_employee_dates
      ON earning_assignments(employee_id, effective_from, effective_to);

    CREATE INDEX IF NOT EXISTS idx_earning_assignments_type_active
      ON earning_assignments(earning_type_id, is_active);

    CREATE INDEX IF NOT EXISTS idx_earning_transactions_employee_date
      ON earning_transactions(employee_id, transaction_date);

    CREATE INDEX IF NOT EXISTS idx_earning_transactions_type_status
      ON earning_transactions(earning_type_id, status, transaction_date);
  `);

  await db.exec(`
    UPDATE employees
       SET employee_number = COALESCE(NULLIF(trim(employee_number), ''), id),
           first_name = COALESCE(
             NULLIF(trim(first_name), ''),
             CASE
               WHEN instr(trim(name), ' ') > 0
                 THEN substr(trim(name), 1, instr(trim(name), ' ') - 1)
               ELSE trim(name)
             END
           ),
           last_name = COALESCE(
             NULLIF(trim(last_name), ''),
             CASE
               WHEN instr(trim(name), ' ') > 0
                 THEN substr(trim(name), instr(trim(name), ' ') + 1)
               ELSE ''
             END
           ),
           employment_status = COALESCE(NULLIF(trim(employment_status), ''), 'regular'),
           salary_type = COALESCE(NULLIF(trim(salary_type), ''), 'monthly'),
           basic_salary = COALESCE(basic_salary, 0),
           is_active = COALESCE(is_active, 1)
     WHERE employee_number IS NULL
        OR trim(employee_number) = ''
        OR first_name IS NULL
        OR trim(first_name) = ''
        OR employment_status IS NULL
        OR trim(employment_status) = ''
        OR salary_type IS NULL
        OR trim(salary_type) = ''
        OR basic_salary IS NULL
        OR is_active IS NULL;
  `);
}

async function migrateEmployeesTable(db: Database): Promise<void> {
  const columns = await db.all<{ name: string }[]>('PRAGMA table_info(employees);');
  const existingColumns = new Set(columns.map((column: { name: string }) => column.name));

  const migrations: Array<[string, string]> = [
    ['employee_number', 'TEXT'],
    ['first_name', 'TEXT'],
    ['middle_name', 'TEXT'],
    ['last_name', 'TEXT'],
    ['phone', 'TEXT'],
    ['address', 'TEXT'],
    ['employment_status', "TEXT NOT NULL DEFAULT 'regular'"],
    ['employment_date', 'TEXT'],
    ['salary_type', "TEXT NOT NULL DEFAULT 'monthly'"],
    ['basic_salary', 'REAL NOT NULL DEFAULT 0'],
    ['bank_name', 'TEXT'],
    ['sss_number', 'TEXT'],
    ['philhealth_number', 'TEXT'],
    ['pagibig_number', 'TEXT'],
    ['tin_number', 'TEXT'],
    ['is_active', 'INTEGER NOT NULL DEFAULT 1'],
  ];

  for (const [columnName, definition] of migrations) {
    if (!existingColumns.has(columnName)) {
      await db.exec(
        `ALTER TABLE employees ADD COLUMN ${columnName} ${definition};`,
      );
    }
  }
}

async function migrateAttendanceTable(db: Database): Promise<void> {
  const columns = await db.all<{ name: string }[]>('PRAGMA table_info(attendance_records);');
  const existingColumns = new Set(columns.map((column: { name: string }) => column.name));

  if (!existingColumns.has('leave_request_id')) {
    await db.exec('ALTER TABLE attendance_records ADD COLUMN leave_request_id TEXT;');
  }
}

async function seedInitialData(db: Database): Promise<void> {
  const existing = await db.get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM employees;',
  );

  if ((existing?.count ?? 0) > 0) {
    return;
  }

  await db.exec('BEGIN TRANSACTION;');

  try {
    await db.run(
      `INSERT INTO employees (
        id, employee_number, first_name, middle_name, last_name, name, email,
        department, role_title, employment_status, salary_type, basic_salary,
        salary_grade, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      'EMP001',
      'EMP001',
      'Alice',
      '',
      'Chen',
      'Alice Chen',
      'alice@example.com',
      'Finance',
      'Payroll Lead',
      'regular',
      'monthly',
      45000,
      'SG1',
      1,
    );

    await db.run(
      `INSERT INTO employees (
        id, employee_number, first_name, middle_name, last_name, name, email,
        department, role_title, employment_status, salary_type, basic_salary,
        salary_grade, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      'EMP002',
      'EMP002',
      'Miguel',
      '',
      'Santos',
      'Miguel Santos',
      'miguel@example.com',
      'Engineering',
      'Engineer',
      'regular',
      'monthly',
      40000,
      'SG2',
      1,
    );

    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }
}

async function seedDefaultWorkSchedule(db: Database): Promise<void> {
  const existing = await db.get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM work_schedules;',
  );

  if ((existing?.count ?? 0) > 0) {
    return;
  }

  await db.run(
    `INSERT INTO work_schedules (
      id, name, start_time, end_time, break_minutes, grace_minutes,
      standard_hours, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    'schedule_default_day',
    'Regular Day Shift',
    '08:00',
    '17:00',
    60,
    5,
    8,
    1,
  );
}

async function seedDefaultLeaveTypes(db: Database): Promise<void> {
  const defaults: Array<[
    string, string, string, string, number, number, number, number, number, number, number, number, number, string
  ]> = [
    ['leave_vacation', 'VL', 'Vacation Leave', 'Planned personal leave.', 1, 1, 15, 1, 0, 3, 1, 5, 0, 'all'],
    ['leave_sick', 'SL', 'Sick Leave', 'Leave for illness, recovery, or medical care.', 1, 1, 15, 1, 1, 0, 1, 5, 0, 'all'],
    ['leave_emergency', 'EL', 'Emergency Leave', 'Urgent leave for unforeseen personal matters.', 1, 1, 3, 1, 0, 0, 0, 0, 0, 'all'],
    ['leave_maternity', 'ML', 'Maternity Leave', 'Configurable maternity leave entitlement.', 1, 0, 0, 0, 1, 0, 0, 0, 0, 'female'],
    ['leave_paternity', 'PL', 'Paternity Leave', 'Configurable paternity leave entitlement.', 1, 0, 0, 0, 1, 0, 0, 0, 0, 'male'],
    ['leave_solo_parent', 'SPL', 'Solo Parent Leave', 'Configurable parental leave for eligible solo parents.', 1, 1, 7, 1, 1, 3, 0, 0, 6, 'all'],
    ['leave_bereavement', 'BL', 'Bereavement Leave', 'Leave following the death of an immediate family member.', 1, 0, 0, 1, 1, 0, 0, 0, 0, 'all'],
    ['leave_service_incentive', 'SIL', 'Service Incentive Leave', 'Configurable service incentive leave credits.', 1, 1, 5, 1, 0, 3, 1, 5, 12, 'all'],
    ['leave_special_women', 'SLW', 'Special Leave for Women', 'Configurable special leave for qualified women.', 1, 0, 0, 0, 1, 0, 0, 0, 6, 'female'],
    ['leave_without_pay', 'LWOP', 'Leave Without Pay', 'Unpaid leave that does not consume a tracked balance.', 0, 0, 0, 1, 0, 0, 0, 0, 0, 'all'],
  ];

  for (const row of defaults) {
    await db.run(
      `INSERT OR IGNORE INTO leave_types (
        id, code, name, description, is_paid, track_balance, annual_credit,
        allow_half_day, require_attachment, advance_notice_days,
        allow_carry_over, max_carry_over, min_service_months,
        gender_eligibility, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      ...row,
    );
  }
}

async function seedCurrentYearLeaveBalances(db: Database): Promise<void> {
  const year = new Date().getFullYear();
  await db.run(
    `INSERT OR IGNORE INTO employee_leave_balances (
      id, employee_id, leave_type_id, balance_year, opening_balance, earned,
      adjustments, notes, created_at, updated_at
    )
    SELECT
      'balance_' || lower(hex(randomblob(16))),
      employees.id,
      leave_types.id,
      ?,
      0,
      leave_types.annual_credit,
      0,
      'Automatically created from the leave-type annual credit.',
      datetime('now'),
      datetime('now')
    FROM employees
    CROSS JOIN leave_types
    WHERE employees.is_active = 1
      AND leave_types.is_active = 1
      AND leave_types.track_balance = 1`,
    year,
  );
}

export function getDb(): Database {
  if (!database) {
    throw new Error('Database has not been initialized. Call initDb() first.');
  }

  return database;
}

async function seedDefaultEarningTypes(db: Database): Promise<void> {
  const defaults: Array<[
    string, string, string, string, string, string, number, string, string, number, number
  ]> = [
    ['earning_transport', 'TRANS', 'Transportation Allowance', 'allowance', 'Regular transportation support.', 'fixed', 2000, 'recurring', 'non-taxable', 1, 0],
    ['earning_meal', 'MEAL', 'Meal Allowance', 'allowance', 'Regular meal support.', 'fixed', 1500, 'recurring', 'non-taxable', 1, 0],
    ['earning_communication', 'COMM', 'Communication Allowance', 'allowance', 'Mobile and communication support.', 'fixed', 1000, 'recurring', 'taxable', 1, 0],
    ['earning_performance', 'PERF', 'Performance Bonus', 'bonus', 'Performance-based one-time bonus.', 'variable', 0, 'one-time', 'taxable', 1, 0],
    ['earning_commission', 'COMMS', 'Sales Commission', 'commission', 'Variable sales commission.', 'variable', 0, 'one-time', 'taxable', 1, 1],
    ['earning_reimbursement', 'REIMB', 'Reimbursement', 'reimbursement', 'Approved business expense reimbursement.', 'variable', 0, 'one-time', 'non-taxable', 1, 0],
    ['earning_adjustment', 'ADJ', 'Salary Adjustment', 'adjustment', 'Manual payroll earning adjustment.', 'variable', 0, 'one-time', 'taxable', 1, 1]
  ];

  for (const row of defaults) {
    await db.run(
      `INSERT OR IGNORE INTO earning_types (
        id, code, name, category, description, calculation_type,
        default_amount, recurrence, taxability, include_in_gross,
        include_in_contribution_basis, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      ...row,
    );
  }
}

