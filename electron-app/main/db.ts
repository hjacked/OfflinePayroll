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

export function getDb(): Database {
  if (!database) {
    throw new Error('Database has not been initialized. Call initDb() first.');
  }

  return database;
}