PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department TEXT,
  role_title TEXT,
  salary_grade TEXT,
  bank_account TEXT,
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

CREATE INDEX IF NOT EXISTS idx_employees_email
  ON employees(email);

CREATE INDEX IF NOT EXISTS idx_payroll_periods_dates
  ON payroll_periods(start_date, end_date);
