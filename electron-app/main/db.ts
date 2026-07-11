import { app } from 'electron';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import { open, type Database } from 'sqlite';

let database: Database | null = null;

export function getDatabasePath(): string {
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
  await seedDefaultDeductionTypes(database);
  await seedDefaultContributionTypes(database);
  await seedDefaultCompanyProfile(database);
  await seedDefaultSettings(database);

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

  await migratePayrollPeriodsTable(db);
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
    CREATE TABLE IF NOT EXISTS deduction_types (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'other',
      description TEXT,
      calculation_type TEXT NOT NULL DEFAULT 'fixed',
      default_amount REAL NOT NULL DEFAULT 0,
      default_percentage REAL NOT NULL DEFAULT 0,
      recurrence TEXT NOT NULL DEFAULT 'one-time',
      priority INTEGER NOT NULL DEFAULT 100,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (category IN ('loan','statutory','company','advance','penalty','insurance','cooperative','other')),
      CHECK (calculation_type IN ('fixed','percentage')),
      CHECK (default_amount >= 0),
      CHECK (default_percentage >= 0 AND default_percentage <= 100),
      CHECK (recurrence IN ('recurring','one-time')),
      CHECK (priority >= 0),
      CHECK (is_active IN (0,1))
    );

    CREATE TABLE IF NOT EXISTS deduction_assignments (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      deduction_type_id TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      percentage REAL NOT NULL DEFAULT 0,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      notes TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (deduction_type_id) REFERENCES deduction_types(id) ON DELETE RESTRICT,
      CHECK (amount >= 0),
      CHECK (percentage >= 0 AND percentage <= 100),
      CHECK (effective_to IS NULL OR effective_to = '' OR effective_to >= effective_from),
      CHECK (is_active IN (0,1))
    );

    CREATE TABLE IF NOT EXISTS employee_loans (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      deduction_type_id TEXT NOT NULL,
      loan_number TEXT NOT NULL UNIQUE,
      principal_amount REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 0,
      total_payable REAL NOT NULL,
      loan_date TEXT NOT NULL,
      first_deduction_date TEXT NOT NULL,
      number_of_installments INTEGER NOT NULL,
      deduction_frequency TEXT NOT NULL DEFAULT 'semimonthly',
      installment_amount REAL NOT NULL,
      outstanding_balance REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      FOREIGN KEY (deduction_type_id) REFERENCES deduction_types(id) ON DELETE RESTRICT,
      CHECK (principal_amount > 0),
      CHECK (interest_rate >= 0 AND interest_rate <= 100),
      CHECK (total_payable >= principal_amount),
      CHECK (number_of_installments > 0),
      CHECK (installment_amount > 0),
      CHECK (outstanding_balance >= 0),
      CHECK (deduction_frequency IN ('weekly','biweekly','semimonthly','monthly')),
      CHECK (status IN ('draft','active','suspended','paid','cancelled'))
    );

    CREATE TABLE IF NOT EXISTS loan_installments (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      installment_number INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      amount_due REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'scheduled',
      transaction_id TEXT,
      paid_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (loan_id) REFERENCES employee_loans(id) ON DELETE CASCADE,
      UNIQUE (loan_id, installment_number),
      CHECK (installment_number > 0),
      CHECK (amount_due > 0),
      CHECK (amount_paid >= 0),
      CHECK (status IN ('scheduled','partial','paid','skipped'))
    );

    CREATE TABLE IF NOT EXISTS deduction_transactions (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      deduction_type_id TEXT NOT NULL,
      assignment_id TEXT,
      loan_id TEXT,
      transaction_date TEXT NOT NULL,
      payroll_period_id TEXT,
      amount REAL NOT NULL,
      reference TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      FOREIGN KEY (deduction_type_id) REFERENCES deduction_types(id) ON DELETE RESTRICT,
      FOREIGN KEY (assignment_id) REFERENCES deduction_assignments(id) ON DELETE SET NULL,
      FOREIGN KEY (loan_id) REFERENCES employee_loans(id) ON DELETE SET NULL,
      FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE SET NULL,
      CHECK (amount > 0),
      CHECK (status IN ('draft','approved','cancelled'))
    );

    CREATE TABLE IF NOT EXISTS loan_payment_allocations (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      installment_id TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (transaction_id) REFERENCES deduction_transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (installment_id) REFERENCES loan_installments(id) ON DELETE CASCADE,
      UNIQUE (transaction_id, installment_id),
      CHECK (amount > 0)
    );

    CREATE INDEX IF NOT EXISTS idx_deduction_types_active
      ON deduction_types(is_active, priority, category, name);
    CREATE INDEX IF NOT EXISTS idx_deduction_assignments_employee_dates
      ON deduction_assignments(employee_id, effective_from, effective_to);
    CREATE INDEX IF NOT EXISTS idx_deduction_assignments_type_active
      ON deduction_assignments(deduction_type_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_employee_loans_employee_status
      ON employee_loans(employee_id, status, first_deduction_date);
    CREATE INDEX IF NOT EXISTS idx_loan_installments_due
      ON loan_installments(loan_id, status, due_date);
    CREATE INDEX IF NOT EXISTS idx_loan_payment_allocations_transaction
      ON loan_payment_allocations(transaction_id, installment_id);
    CREATE INDEX IF NOT EXISTS idx_deduction_transactions_employee_date
      ON deduction_transactions(employee_id, transaction_date);
    CREATE INDEX IF NOT EXISTS idx_deduction_transactions_type_status
      ON deduction_transactions(deduction_type_id, status, transaction_date);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS government_contribution_types (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      authority TEXT NOT NULL,
      description TEXT,
      calculation_method TEXT NOT NULL DEFAULT 'bracket',
      government_number_field TEXT NOT NULL DEFAULT 'none',
      employee_share_enabled INTEGER NOT NULL DEFAULT 1,
      employer_share_enabled INTEGER NOT NULL DEFAULT 1,
      is_tax INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (calculation_method IN ('bracket','percentage','fixed','tax-bracket')),
      CHECK (government_number_field IN ('sss_number','philhealth_number','pagibig_number','tin_number','none')),
      CHECK (employee_share_enabled IN (0,1)),
      CHECK (employer_share_enabled IN (0,1)),
      CHECK (is_tax IN (0,1)),
      CHECK (is_active IN (0,1))
    );

    CREATE TABLE IF NOT EXISTS government_contribution_tables (
      id TEXT PRIMARY KEY,
      contribution_type_id TEXT NOT NULL,
      version_name TEXT NOT NULL,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (contribution_type_id)
        REFERENCES government_contribution_types(id)
        ON DELETE RESTRICT,
      UNIQUE (contribution_type_id, version_name),
      CHECK (effective_to IS NULL OR effective_to = '' OR effective_to >= effective_from),
      CHECK (status IN ('draft','active','archived'))
    );

    CREATE TABLE IF NOT EXISTS government_contribution_brackets (
      id TEXT PRIMARY KEY,
      table_version_id TEXT NOT NULL,
      min_compensation REAL NOT NULL DEFAULT 0,
      max_compensation REAL,
      employee_fixed REAL NOT NULL DEFAULT 0,
      employee_rate REAL NOT NULL DEFAULT 0,
      employee_excess_over REAL NOT NULL DEFAULT 0,
      employer_fixed REAL NOT NULL DEFAULT 0,
      employer_rate REAL NOT NULL DEFAULT 0,
      employer_excess_over REAL NOT NULL DEFAULT 0,
      notes TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (table_version_id)
        REFERENCES government_contribution_tables(id)
        ON DELETE CASCADE,
      CHECK (min_compensation >= 0),
      CHECK (max_compensation IS NULL OR max_compensation >= min_compensation),
      CHECK (employee_fixed >= 0),
      CHECK (employee_rate >= 0),
      CHECK (employee_excess_over >= 0),
      CHECK (employer_fixed >= 0),
      CHECK (employer_rate >= 0),
      CHECK (employer_excess_over >= 0)
    );

    CREATE TABLE IF NOT EXISTS government_contribution_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      contribution_type_id TEXT NOT NULL,
      table_version_id TEXT NOT NULL,
      payroll_period_id TEXT,
      contribution_date TEXT NOT NULL,
      compensation_basis REAL NOT NULL,
      employee_share REAL NOT NULL DEFAULT 0,
      employer_share REAL NOT NULL DEFAULT 0,
      total_contribution REAL NOT NULL DEFAULT 0,
      government_number TEXT,
      bracket_json TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      FOREIGN KEY (contribution_type_id)
        REFERENCES government_contribution_types(id)
        ON DELETE RESTRICT,
      FOREIGN KEY (table_version_id)
        REFERENCES government_contribution_tables(id)
        ON DELETE RESTRICT,
      FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE SET NULL,
      UNIQUE (employee_id, contribution_type_id, contribution_date, payroll_period_id),
      CHECK (compensation_basis >= 0),
      CHECK (employee_share >= 0),
      CHECK (employer_share >= 0),
      CHECK (total_contribution >= 0),
      CHECK (status IN ('draft','approved','remitted','cancelled'))
    );

    CREATE INDEX IF NOT EXISTS idx_contribution_types_active
      ON government_contribution_types(is_active, name);
    CREATE INDEX IF NOT EXISTS idx_contribution_tables_type_dates
      ON government_contribution_tables(contribution_type_id, status, effective_from, effective_to);
    CREATE INDEX IF NOT EXISTS idx_contribution_brackets_table_range
      ON government_contribution_brackets(table_version_id, min_compensation, max_compensation);
    CREATE INDEX IF NOT EXISTS idx_contribution_records_employee_date
      ON government_contribution_records(employee_id, contribution_date);
    CREATE INDEX IF NOT EXISTS idx_contribution_records_type_status
      ON government_contribution_records(contribution_type_id, status, contribution_date);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS payroll_employee_results (
      id TEXT PRIMARY KEY,
      payroll_period_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      employee_number TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      department TEXT,
      role_title TEXT,
      salary_type TEXT NOT NULL,
      basic_salary REAL NOT NULL DEFAULT 0,
      period_basic_pay REAL NOT NULL DEFAULT 0,
      overtime_pay REAL NOT NULL DEFAULT 0,
      night_differential_pay REAL NOT NULL DEFAULT 0,
      other_earnings REAL NOT NULL DEFAULT 0,
      gross_income REAL NOT NULL DEFAULT 0,
      attendance_deductions REAL NOT NULL DEFAULT 0,
      other_deductions REAL NOT NULL DEFAULT 0,
      government_deductions REAL NOT NULL DEFAULT 0,
      employer_contributions REAL NOT NULL DEFAULT 0,
      total_deductions REAL NOT NULL DEFAULT 0,
      net_pay REAL NOT NULL DEFAULT 0,
      taxable_income REAL NOT NULL DEFAULT 0,
      contribution_basis REAL NOT NULL DEFAULT 0,
      attendance_days INTEGER NOT NULL DEFAULT 0,
      paid_days REAL NOT NULL DEFAULT 0,
      absent_days REAL NOT NULL DEFAULT 0,
      paid_leave_days REAL NOT NULL DEFAULT 0,
      unpaid_leave_days REAL NOT NULL DEFAULT 0,
      regular_hours REAL NOT NULL DEFAULT 0,
      overtime_hours REAL NOT NULL DEFAULT 0,
      late_minutes INTEGER NOT NULL DEFAULT 0,
      undertime_minutes INTEGER NOT NULL DEFAULT 0,
      validation_status TEXT NOT NULL DEFAULT 'ok',
      calculated_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      UNIQUE (payroll_period_id, employee_id),
      CHECK (validation_status IN ('ok','warning','error'))
    );

    CREATE TABLE IF NOT EXISTS payroll_line_items (
      id TEXT PRIMARY KEY,
      payroll_result_id TEXT NOT NULL,
      payroll_period_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT,
      code TEXT,
      name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      taxable INTEGER NOT NULL DEFAULT 0,
      contribution_basis INTEGER NOT NULL DEFAULT 0,
      employer_amount REAL NOT NULL DEFAULT 0,
      metadata_json TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (payroll_result_id) REFERENCES payroll_employee_results(id) ON DELETE CASCADE,
      FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      CHECK (item_type IN ('earning','deduction','contribution','employer-contribution','information')),
      CHECK (taxable IN (0,1)),
      CHECK (contribution_basis IN (0,1))
    );

    CREATE TABLE IF NOT EXISTS payroll_validation_issues (
      id TEXT PRIMARY KEY,
      payroll_period_id TEXT NOT NULL,
      employee_id TEXT,
      severity TEXT NOT NULL,
      code TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      CHECK (severity IN ('warning','error'))
    );

    CREATE TABLE IF NOT EXISTS payroll_action_logs (
      id TEXT PRIMARY KEY,
      payroll_period_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_payroll_results_period_employee
      ON payroll_employee_results(payroll_period_id, employee_id);
    CREATE INDEX IF NOT EXISTS idx_payroll_results_department
      ON payroll_employee_results(payroll_period_id, department);
    CREATE INDEX IF NOT EXISTS idx_payroll_line_items_result_type
      ON payroll_line_items(payroll_result_id, item_type, sort_order);
    CREATE INDEX IF NOT EXISTS idx_payroll_validation_period_severity
      ON payroll_validation_issues(payroll_period_id, severity, employee_id);
    CREATE INDEX IF NOT EXISTS idx_payroll_action_logs_period
      ON payroll_action_logs(payroll_period_id, created_at);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS company_profiles (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      address TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      tax_id TEXT,
      logo_data_url TEXT,
      payslip_footer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payslips (
      id TEXT PRIMARY KEY,
      payroll_period_id TEXT NOT NULL,
      payroll_result_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      reference_number TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'draft',
      snapshot_json TEXT NOT NULL,
      generated_by TEXT,
      generated_at TEXT NOT NULL,
      published_by TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE,
      FOREIGN KEY (payroll_result_id) REFERENCES payroll_employee_results(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
      UNIQUE (payroll_period_id, employee_id),
      CHECK (status IN ('draft', 'published'))
    );

    CREATE TABLE IF NOT EXISTS payslip_action_logs (
      id TEXT PRIMARY KEY,
      payslip_id TEXT NOT NULL,
      action TEXT NOT NULL,
      actor TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (payslip_id) REFERENCES payslips(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payslip_download_logs (
      id TEXT PRIMARY KEY,
      payslip_id TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      downloaded_by TEXT,
      file_path TEXT,
      downloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (payslip_id) REFERENCES payslips(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_payslips_period_status
      ON payslips(payroll_period_id, status, employee_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_employee_status
      ON payslips(employee_id, status, generated_at);
    CREATE INDEX IF NOT EXISTS idx_payslip_actions_payslip_date
      ON payslip_action_logs(payslip_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_payslip_downloads_payslip_date
      ON payslip_download_logs(payslip_id, downloaded_at);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL,
      employee_id TEXT,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_iterations INTEGER NOT NULL DEFAULT 310000,
      is_active INTEGER NOT NULL DEFAULT 1,
      must_change_password INTEGER NOT NULL DEFAULT 1,
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      password_changed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL,
      CHECK (role IN ('administrator', 'hr_officer', 'payroll_officer', 'supervisor', 'employee')),
      CHECK (is_active IN (0, 1)),
      CHECK (must_change_password IN (0, 1)),
      CHECK (failed_attempts >= 0),
      CHECK (password_iterations >= 100000)
    );

    CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_employee_unique
      ON users(employee_id)
      WHERE employee_id IS NOT NULL AND trim(employee_id) <> '';

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
      ON users(lower(email))
      WHERE trim(email) <> '';

    CREATE INDEX IF NOT EXISTS idx_users_role_active
      ON users(role, is_active, display_name);

    CREATE INDEX IF NOT EXISTS idx_auth_audit_created
      ON auth_audit_logs(created_at DESC, action);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS payroll_settings (
      id TEXT PRIMARY KEY,
      default_frequency TEXT NOT NULL DEFAULT 'semimonthly',
      workdays_per_month REAL NOT NULL DEFAULT 22,
      hours_per_day REAL NOT NULL DEFAULT 8,
      overtime_multiplier REAL NOT NULL DEFAULT 1.25,
      night_differential_rate REAL NOT NULL DEFAULT 0.10,
      payment_delay_days INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (default_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
      CHECK (workdays_per_month >= 1 AND workdays_per_month <= 31),
      CHECK (hours_per_day >= 0.5 AND hours_per_day <= 24),
      CHECK (overtime_multiplier >= 1 AND overtime_multiplier <= 10),
      CHECK (night_differential_rate >= 0 AND night_differential_rate <= 1),
      CHECK (payment_delay_days >= 0 AND payment_delay_days <= 31)
    );

    CREATE TABLE IF NOT EXISTS backup_settings (
      id TEXT PRIMARY KEY,
      backup_directory TEXT,
      auto_backup_enabled INTEGER NOT NULL DEFAULT 0,
      backup_frequency TEXT NOT NULL DEFAULT 'weekly',
      retention_count INTEGER NOT NULL DEFAULT 10,
      include_audit_logs INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      CHECK (auto_backup_enabled IN (0, 1)),
      CHECK (backup_frequency IN ('daily', 'weekly', 'monthly')),
      CHECK (retention_count >= 1 AND retention_count <= 100),
      CHECK (include_audit_logs IN (0, 1))
    );

    CREATE TABLE IF NOT EXISTS settings_audit_logs (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT,
      changes_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
      CHECK (category IN ('company', 'payroll', 'backup'))
    );

    CREATE INDEX IF NOT EXISTS idx_settings_audit_created
      ON settings_audit_logs(created_at DESC, category);
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

async function migratePayrollPeriodsTable(db: Database): Promise<void> {
  const columns = await db.all<{ name: string }[]>('PRAGMA table_info(payroll_periods);');
  const existingColumns = new Set(columns.map((column: { name: string }) => column.name));

  const migrations: Array<[string, string]> = [
    ['workflow_status', "TEXT NOT NULL DEFAULT 'draft'"],
    ['payment_date', 'TEXT'],
    ['notes', 'TEXT'],
    ['workdays_per_month', 'REAL NOT NULL DEFAULT 22'],
    ['hours_per_day', 'REAL NOT NULL DEFAULT 8'],
    ['overtime_multiplier', 'REAL NOT NULL DEFAULT 1.25'],
    ['night_differential_rate', 'REAL NOT NULL DEFAULT 0.10'],
    ['employee_count', 'INTEGER NOT NULL DEFAULT 0'],
    ['gross_total', 'REAL NOT NULL DEFAULT 0'],
    ['deduction_total', 'REAL NOT NULL DEFAULT 0'],
    ['net_total', 'REAL NOT NULL DEFAULT 0'],
    ['employer_contribution_total', 'REAL NOT NULL DEFAULT 0'],
    ['validation_error_count', 'INTEGER NOT NULL DEFAULT 0'],
    ['validation_warning_count', 'INTEGER NOT NULL DEFAULT 0'],
    ['calculated_at', 'TEXT'],
    ['approved_at', 'TEXT'],
    ['finalized_at', 'TEXT'],
    ['locked_at', 'TEXT'],
  ];

  for (const [columnName, definition] of migrations) {
    if (!existingColumns.has(columnName)) {
      await db.exec(`ALTER TABLE payroll_periods ADD COLUMN ${columnName} ${definition};`);
    }
  }

  await db.exec(`
    UPDATE payroll_periods
       SET workflow_status = CASE
         WHEN status = 'locked' THEN 'locked'
         WHEN status = 'completed' THEN 'finalized'
         WHEN status = 'processing' THEN 'calculated'
         ELSE COALESCE(NULLIF(workflow_status, ''), 'draft')
       END,
       payment_date = COALESCE(NULLIF(payment_date, ''), end_date)
     WHERE workflow_status IS NULL
        OR trim(workflow_status) = ''
        OR payment_date IS NULL
        OR trim(payment_date) = '';
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

async function seedDefaultCompanyProfile(db: Database): Promise<void> {
  await db.run(
    `INSERT OR IGNORE INTO company_profiles (
      id, company_name, address, contact_email, contact_phone,
      tax_id, logo_data_url, payslip_footer, created_at, updated_at
    ) VALUES (
      'default', 'PayPayroll Offline', '', '', '', '', '',
      'This is a system-generated payslip. Please contact HR or Payroll for questions.',
      datetime('now'), datetime('now')
    )`,
  );
}

async function seedDefaultSettings(db: Database): Promise<void> {
  await db.run(
    `INSERT OR IGNORE INTO payroll_settings (
      id, default_frequency, workdays_per_month, hours_per_day,
      overtime_multiplier, night_differential_rate, payment_delay_days,
      created_at, updated_at
    ) VALUES (
      'default', 'semimonthly', 22, 8, 1.25, 0.10, 0,
      datetime('now'), datetime('now')
    )`,
  );

  await db.run(
    `INSERT OR IGNORE INTO backup_settings (
      id, backup_directory, auto_backup_enabled, backup_frequency,
      retention_count, include_audit_logs, created_at, updated_at
    ) VALUES (
      'default', '', 0, 'weekly', 10, 1,
      datetime('now'), datetime('now')
    )`,
  );
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

async function seedDefaultDeductionTypes(db: Database): Promise<void> {
  const defaults: Array<[
    string, string, string, string, string, string, number, number, string, number
  ]> = [
    ['deduction_company_loan', 'CLOAN', 'Company Loan', 'loan', 'Company-funded employee loan.', 'fixed', 0, 0, 'recurring', 20],
    ['deduction_salary_loan', 'SLOAN', 'Salary Loan', 'loan', 'Salary-backed employee loan.', 'fixed', 0, 0, 'recurring', 20],
    ['deduction_emergency_loan', 'ELOAN', 'Emergency Loan', 'loan', 'Emergency assistance loan.', 'fixed', 0, 0, 'recurring', 20],
    ['deduction_government_loan', 'GLOAN', 'Government Loan', 'loan', 'Government agency loan repayment.', 'fixed', 0, 0, 'recurring', 15],
    ['deduction_cash_advance', 'CASHADV', 'Cash Advance', 'advance', 'Employee cash advance recovery.', 'fixed', 0, 0, 'recurring', 30],
    ['deduction_cooperative', 'COOP', 'Cooperative Contribution', 'cooperative', 'Cooperative dues or savings contribution.', 'fixed', 0, 0, 'recurring', 40],
    ['deduction_insurance', 'INS', 'Insurance Deduction', 'insurance', 'Employee insurance premium.', 'fixed', 0, 0, 'recurring', 50],
    ['deduction_uniform', 'UNIFORM', 'Uniform Deduction', 'company', 'Authorized uniform cost deduction.', 'fixed', 0, 0, 'one-time', 60],
    ['deduction_equipment', 'EQUIP', 'Equipment Deduction', 'company', 'Authorized equipment or property deduction.', 'fixed', 0, 0, 'one-time', 60],
    ['deduction_other', 'OTHERDED', 'Other Authorized Deduction', 'other', 'Other employee-authorized deduction.', 'fixed', 0, 0, 'one-time', 100]
  ];

  for (const row of defaults) {
    await db.run(
      `INSERT OR IGNORE INTO deduction_types (
        id, code, name, category, description, calculation_type,
        default_amount, default_percentage, recurrence, priority,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      ...row,
    );
  }
}

async function seedDefaultContributionTypes(db: Database): Promise<void> {
  const defaults: Array<[
    string, string, string, string, string, string, string, number, number, number
  ]> = [
    [
      'contribution_sss',
      'SSS',
      'Social Security System',
      'Social Security System',
      'Configurable employee and employer social-security contribution.',
      'bracket',
      'sss_number',
      1,
      1,
      0,
    ],
    [
      'contribution_philhealth',
      'PHIC',
      'PhilHealth',
      'Philippine Health Insurance Corporation',
      'Configurable employee and employer health-insurance contribution.',
      'percentage',
      'philhealth_number',
      1,
      1,
      0,
    ],
    [
      'contribution_pagibig',
      'HDMF',
      'Pag-IBIG Fund',
      'Home Development Mutual Fund',
      'Configurable employee and employer housing-fund contribution.',
      'bracket',
      'pagibig_number',
      1,
      1,
      0,
    ],
    [
      'contribution_withholding_tax',
      'WTAX',
      'Withholding Tax',
      'Bureau of Internal Revenue',
      'Configurable withholding-tax table using fixed tax plus a rate on excess compensation.',
      'tax-bracket',
      'tin_number',
      1,
      0,
      1,
    ],
  ];

  for (const row of defaults) {
    await db.run(
      `INSERT OR IGNORE INTO government_contribution_types (
        id, code, name, authority, description, calculation_method,
        government_number_field, employee_share_enabled,
        employer_share_enabled, is_tax, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
      ...row,
    );
  }
}
