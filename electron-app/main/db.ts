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

export function getDb(): Database {
  if (!database) {
    throw new Error('Database has not been initialized. Call initDb() first.');
  }

  return database;
}