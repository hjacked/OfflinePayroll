import { randomUUID } from 'node:crypto';
import { getDb } from '../db';
import { calculateContribution, createContributionRecord } from './contributions-service';
import { recordLoanPayment } from './deductions-service';

export type PayrollFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type PayrollWorkflowStatus =
  | 'draft'
  | 'calculated'
  | 'approved'
  | 'finalized'
  | 'locked'
  | 'cancelled';

export interface PayrollPeriodInput {
  name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  frequency: PayrollFrequency;
  notes: string;
  workdays_per_month: number;
  hours_per_day: number;
  overtime_multiplier: number;
  night_differential_rate: number;
  created_by?: string;
}

export interface PayrollPeriodRecord extends PayrollPeriodInput {
  id: string;
  status: string;
  workflow_status: PayrollWorkflowStatus;
  employee_count: number;
  gross_total: number;
  deduction_total: number;
  net_total: number;
  employer_contribution_total: number;
  validation_error_count: number;
  validation_warning_count: number;
  calculated_at: string;
  approved_at: string;
  finalized_at: string;
  locked_at: string;
  created_at: string;
  updated_at: string;
}

export interface PayrollLineItemRecord {
  id: string;
  payroll_result_id: string;
  payroll_period_id: string;
  employee_id: string;
  item_type: 'earning' | 'deduction' | 'contribution' | 'employer-contribution' | 'information';
  source_type: string;
  source_id: string;
  code: string;
  name: string;
  amount: number;
  taxable: number;
  contribution_basis: number;
  employer_amount: number;
  metadata: Record<string, unknown>;
  sort_order: number;
}

export interface PayrollEmployeeResultRecord {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  salary_type: string;
  basic_salary: number;
  period_basic_pay: number;
  overtime_pay: number;
  night_differential_pay: number;
  other_earnings: number;
  gross_income: number;
  attendance_deductions: number;
  other_deductions: number;
  government_deductions: number;
  employer_contributions: number;
  total_deductions: number;
  net_pay: number;
  taxable_income: number;
  contribution_basis: number;
  attendance_days: number;
  paid_days: number;
  absent_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  regular_hours: number;
  overtime_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  validation_status: 'ok' | 'warning' | 'error';
  calculated_at: string;
  line_items?: PayrollLineItemRecord[];
}

export interface PayrollValidationIssueRecord {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  severity: 'warning' | 'error';
  code: string;
  message: string;
  created_at: string;
}

export interface PayrollPeriodDetails {
  period: PayrollPeriodRecord;
  employees: PayrollEmployeeResultRecord[];
  issues: PayrollValidationIssueRecord[];
  actions: Array<{
    id: string;
    action: string;
    actor: string;
    notes: string;
    created_at: string;
  }>;
}

interface EmployeeRow {
  id: string;
  employee_number: string;
  name: string;
  department: string | null;
  role_title: string | null;
  salary_type: string;
  basic_salary: number;
  bank_account: string | null;
  sss_number: string | null;
  philhealth_number: string | null;
  pagibig_number: string | null;
  tin_number: string | null;
}

interface AttendanceRow {
  id: string;
  work_date: string;
  status: string;
  regular_hours: number;
  overtime_hours: number;
  night_diff_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  leave_request_id: string | null;
  leave_is_paid: number | null;
  leave_duration_type: string | null;
}

interface CalculationLineItem {
  item_type: PayrollLineItemRecord['item_type'];
  source_type: string;
  source_id?: string;
  code?: string;
  name: string;
  amount: number;
  taxable?: number;
  contribution_basis?: number;
  employer_amount?: number;
  metadata?: Record<string, unknown>;
  sort_order: number;
}

interface CalculationIssue {
  severity: 'warning' | 'error';
  code: string;
  message: string;
}

const payrollPeriodSelect = `
  SELECT
    id, name, start_date, end_date,
    COALESCE(payment_date, end_date) AS payment_date,
    frequency, status,
    COALESCE(workflow_status, 'draft') AS workflow_status,
    COALESCE(notes, '') AS notes,
    COALESCE(workdays_per_month, 22) AS workdays_per_month,
    COALESCE(hours_per_day, 8) AS hours_per_day,
    COALESCE(overtime_multiplier, 1.25) AS overtime_multiplier,
    COALESCE(night_differential_rate, 0.10) AS night_differential_rate,
    COALESCE(created_by, '') AS created_by,
    COALESCE(employee_count, 0) AS employee_count,
    COALESCE(gross_total, 0) AS gross_total,
    COALESCE(deduction_total, 0) AS deduction_total,
    COALESCE(net_total, 0) AS net_total,
    COALESCE(employer_contribution_total, 0) AS employer_contribution_total,
    COALESCE(validation_error_count, 0) AS validation_error_count,
    COALESCE(validation_warning_count, 0) AS validation_warning_count,
    COALESCE(calculated_at, '') AS calculated_at,
    COALESCE(approved_at, '') AS approved_at,
    COALESCE(finalized_at, '') AS finalized_at,
    COALESCE(locked_at, '') AS locked_at,
    created_at, updated_at
  FROM payroll_periods
`;

const payrollResultSelect = `
  SELECT
    id, payroll_period_id, employee_id, employee_number, employee_name,
    COALESCE(department, '') AS department,
    COALESCE(role_title, '') AS role_title,
    salary_type, basic_salary, period_basic_pay, overtime_pay,
    night_differential_pay, other_earnings, gross_income,
    attendance_deductions, other_deductions, government_deductions,
    employer_contributions, total_deductions, net_pay, taxable_income,
    contribution_basis, attendance_days, paid_days, absent_days,
    paid_leave_days, unpaid_leave_days, regular_hours, overtime_hours,
    late_minutes, undertime_minutes, validation_status, calculated_at
  FROM payroll_employee_results
`;

export async function getPayrollPeriods(filters?: unknown): Promise<{
  data: PayrollPeriodRecord[];
  total: number;
}> {
  const parsed = parsePeriodFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (parsed.status !== 'all') {
    clauses.push("COALESCE(workflow_status, 'draft') = ?");
    values.push(parsed.status);
  }
  if (parsed.date_from) {
    clauses.push('end_date >= ?');
    values.push(parsed.date_from);
  }
  if (parsed.date_to) {
    clauses.push('start_date <= ?');
    values.push(parsed.date_to);
  }
  if (parsed.query) {
    clauses.push('(name LIKE ? COLLATE NOCASE OR frequency LIKE ? COLLATE NOCASE)');
    const search = `%${parsed.query}%`;
    values.push(search, search);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const data = await getDb().all<PayrollPeriodRecord[]>(
    `${payrollPeriodSelect} ${where} ORDER BY start_date DESC, created_at DESC`,
    ...values,
  );
  return { data, total: data.length };
}

export async function getPayrollPeriod(id: string): Promise<PayrollPeriodRecord | null> {
  return (await getDb().get<PayrollPeriodRecord>(
    `${payrollPeriodSelect} WHERE id = ?`,
    id,
  )) ?? null;
}

export async function getPayrollPeriodDetails(id: string): Promise<PayrollPeriodDetails | null> {
  const period = await getPayrollPeriod(id);
  if (!period) return null;

  const employees = await getDb().all<PayrollEmployeeResultRecord[]>(
    `${payrollResultSelect} WHERE payroll_period_id = ? ORDER BY employee_name COLLATE NOCASE`,
    id,
  );
  const issues = await getPayrollValidationIssues(id);
  const actions = await getDb().all<PayrollPeriodDetails['actions']>(
    `SELECT id, action, COALESCE(actor, '') AS actor, COALESCE(notes, '') AS notes, created_at
       FROM payroll_action_logs
      WHERE payroll_period_id = ?
      ORDER BY created_at DESC`,
    id,
  );

  return { period, employees, issues, actions };
}

export async function getPayrollEmployeeResult(
  periodId: string,
  employeeId: string,
): Promise<PayrollEmployeeResultRecord | null> {
  const result = await getDb().get<PayrollEmployeeResultRecord>(
    `${payrollResultSelect} WHERE payroll_period_id = ? AND employee_id = ?`,
    periodId,
    employeeId,
  );
  if (!result) return null;

  const rows = await getDb().all<Array<Omit<PayrollLineItemRecord, 'metadata'> & { metadata_json: string | null }>>(
    `SELECT id, payroll_result_id, payroll_period_id, employee_id, item_type,
            source_type, COALESCE(source_id, '') AS source_id,
            COALESCE(code, '') AS code, name, amount, taxable,
            contribution_basis, employer_amount,
            metadata_json, sort_order
       FROM payroll_line_items
      WHERE payroll_result_id = ?
      ORDER BY sort_order, name COLLATE NOCASE`,
    result.id,
  );

  result.line_items = rows.map((row) => ({
    ...row,
    metadata: safeJson(row.metadata_json),
  }));
  return result;
}

export async function createPayrollPeriod(value: unknown): Promise<{ period: PayrollPeriodRecord }> {
  const input = validatePeriodInput(value);
  await validatePeriodOverlap(input);
  const id = `payroll_period_${randomUUID()}`;

  await getDb().run(
    `INSERT INTO payroll_periods (
      id, name, start_date, end_date, payment_date, frequency,
      status, workflow_status, notes, workdays_per_month,
      hours_per_day, overtime_multiplier, night_differential_rate,
      created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'open', 'draft', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id,
    input.name,
    input.start_date,
    input.end_date,
    input.payment_date,
    input.frequency,
    input.notes || null,
    input.workdays_per_month,
    input.hours_per_day,
    input.overtime_multiplier,
    input.night_differential_rate,
    input.created_by || null,
  );
  await logAction(id, 'created', input.created_by ?? '', 'Payroll period created.');
  return { period: await requirePeriod(id) };
}

export async function updatePayrollPeriod(id: string, value: unknown): Promise<PayrollPeriodRecord> {
  const existing = await requirePeriod(id);
  requireEditable(existing);
  const input = validatePeriodInput(value);
  await validatePeriodOverlap(input, id);

  await getDb().run(
    `UPDATE payroll_periods
        SET name = ?, start_date = ?, end_date = ?, payment_date = ?,
            frequency = ?, notes = ?, workdays_per_month = ?, hours_per_day = ?,
            overtime_multiplier = ?, night_differential_rate = ?,
            updated_at = datetime('now')
      WHERE id = ?`,
    input.name,
    input.start_date,
    input.end_date,
    input.payment_date,
    input.frequency,
    input.notes || null,
    input.workdays_per_month,
    input.hours_per_day,
    input.overtime_multiplier,
    input.night_differential_rate,
    id,
  );
  await logAction(id, 'updated', input.created_by ?? '', 'Payroll-period settings updated.');
  return requirePeriod(id);
}

export async function deletePayrollPeriod(id: string): Promise<{ id: string }> {
  const existing = await requirePeriod(id);
  requireEditable(existing);
  await getDb().run('DELETE FROM payroll_periods WHERE id = ?', id);
  return { id };
}

export async function calculatePayrollPeriod(
  id: string,
  actor = '',
): Promise<PayrollPeriodDetails> {
  const period = await requirePeriod(id);
  if (!['draft', 'calculated'].includes(period.workflow_status)) {
    throw new Error(`Payroll cannot be calculated while its status is "${period.workflow_status}".`);
  }

  const db = getDb();
  await db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.run('DELETE FROM payroll_validation_issues WHERE payroll_period_id = ?', id);
    await db.run('DELETE FROM payroll_line_items WHERE payroll_period_id = ?', id);
    await db.run('DELETE FROM payroll_employee_results WHERE payroll_period_id = ?', id);

    const employees = await db.all<EmployeeRow[]>(
      `SELECT id, employee_number, name, department, role_title, salary_type,
              basic_salary, bank_account, sss_number, philhealth_number,
              pagibig_number, tin_number
         FROM employees
        WHERE is_active = 1
        ORDER BY name COLLATE NOCASE`,
    );

    if (!employees.length) {
      await addIssue(id, null, {
        severity: 'error',
        code: 'NO_EMPLOYEES',
        message: 'No active employees are available for payroll.',
      });
    }

    for (const employee of employees) {
      await calculateEmployee(period, employee);
    }

    const totals = await db.get<{
      employee_count: number;
      gross_total: number;
      deduction_total: number;
      net_total: number;
      employer_total: number;
    }>(
      `SELECT COUNT(*) AS employee_count,
              COALESCE(SUM(gross_income), 0) AS gross_total,
              COALESCE(SUM(total_deductions), 0) AS deduction_total,
              COALESCE(SUM(net_pay), 0) AS net_total,
              COALESCE(SUM(employer_contributions), 0) AS employer_total
         FROM payroll_employee_results
        WHERE payroll_period_id = ?`,
      id,
    );
    const issueCounts = await db.get<{ errors: number; warnings: number }>(
      `SELECT
         COALESCE(SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END), 0) AS errors,
         COALESCE(SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END), 0) AS warnings
       FROM payroll_validation_issues
       WHERE payroll_period_id = ?`,
      id,
    );

    await db.run(
      `UPDATE payroll_periods
          SET status = 'processing', workflow_status = 'calculated',
              employee_count = ?, gross_total = ?, deduction_total = ?,
              net_total = ?, employer_contribution_total = ?,
              validation_error_count = ?, validation_warning_count = ?,
              calculated_at = datetime('now'), approved_at = NULL,
              updated_at = datetime('now')
        WHERE id = ?`,
      totals?.employee_count ?? 0,
      roundMoney(totals?.gross_total ?? 0),
      roundMoney(totals?.deduction_total ?? 0),
      roundMoney(totals?.net_total ?? 0),
      roundMoney(totals?.employer_total ?? 0),
      issueCounts?.errors ?? 0,
      issueCounts?.warnings ?? 0,
      id,
    );
    await logAction(id, 'calculated', actor, 'Payroll calculation completed.');
    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }

  const details = await getPayrollPeriodDetails(id);
  if (!details) throw new Error('Payroll calculation completed but the period could not be loaded.');
  return details;
}

export async function approvePayrollPeriod(id: string, actor = ''): Promise<PayrollPeriodRecord> {
  const period = await requirePeriod(id);
  if (period.workflow_status !== 'calculated') {
    throw new Error('Only calculated payroll can be approved.');
  }
  if (period.validation_error_count > 0) {
    throw new Error('Resolve all payroll validation errors before approval.');
  }
  await getDb().run(
    `UPDATE payroll_periods
        SET workflow_status = 'approved', approved_at = datetime('now'),
            updated_at = datetime('now')
      WHERE id = ?`,
    id,
  );
  await logAction(id, 'approved', actor, 'Payroll approved.');
  return requirePeriod(id);
}

export async function finalizePayrollPeriod(id: string, actor = ''): Promise<PayrollPeriodRecord> {
  const period = await requirePeriod(id);
  if (period.workflow_status !== 'approved') {
    throw new Error('Only approved payroll can be finalized.');
  }

  const db = getDb();
  await db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const results = await db.all<PayrollEmployeeResultRecord[]>(
      `${payrollResultSelect} WHERE payroll_period_id = ?`,
      id,
    );
    for (const result of results) {
      const lineItems = await getDb().all<Array<{
        source_type: string;
        source_id: string | null;
        amount: number;
        employer_amount: number;
        metadata_json: string | null;
      }>>(
        `SELECT source_type, source_id, amount, employer_amount, metadata_json
           FROM payroll_line_items
          WHERE payroll_result_id = ?`,
        result.id,
      );
      await postPayrollItems(period, result, lineItems);
    }

    await db.run(
      `UPDATE payroll_periods
          SET status = 'completed', workflow_status = 'finalized',
              finalized_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?`,
      id,
    );
    await logAction(id, 'finalized', actor, 'Payroll finalized and source transactions posted.');
    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }
  return requirePeriod(id);
}

export async function lockPayrollPeriod(id: string, actor = ''): Promise<PayrollPeriodRecord> {
  const period = await requirePeriod(id);
  if (period.workflow_status !== 'finalized') {
    throw new Error('Only finalized payroll can be locked.');
  }
  await getDb().run(
    `UPDATE payroll_periods
        SET status = 'locked', workflow_status = 'locked',
            locked_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?`,
    id,
  );
  await logAction(id, 'locked', actor, 'Payroll locked against further changes.');
  return requirePeriod(id);
}

export async function cancelPayrollPeriod(id: string, actor = ''): Promise<PayrollPeriodRecord> {
  const period = await requirePeriod(id);
  if (['finalized', 'locked'].includes(period.workflow_status)) {
    throw new Error('Finalized or locked payroll cannot be cancelled.');
  }
  await getDb().run(
    `UPDATE payroll_periods
        SET status = 'cancelled', workflow_status = 'cancelled',
            updated_at = datetime('now')
      WHERE id = ?`,
    id,
  );
  await logAction(id, 'cancelled', actor, 'Payroll period cancelled.');
  return requirePeriod(id);
}

export async function getPayrollRegister(id: string): Promise<{
  period: PayrollPeriodRecord;
  employees: PayrollEmployeeResultRecord[];
  totals: {
    basic_pay: number;
    overtime_pay: number;
    other_earnings: number;
    gross_income: number;
    attendance_deductions: number;
    other_deductions: number;
    government_deductions: number;
    total_deductions: number;
    employer_contributions: number;
    net_pay: number;
  };
}> {
  const period = await requirePeriod(id);
  const employees = await getDb().all<PayrollEmployeeResultRecord[]>(
    `${payrollResultSelect} WHERE payroll_period_id = ? ORDER BY department COLLATE NOCASE, employee_name COLLATE NOCASE`,
    id,
  );
  const totals = employees.reduce(
    (sum, row) => ({
      basic_pay: roundMoney(sum.basic_pay + row.period_basic_pay),
      overtime_pay: roundMoney(sum.overtime_pay + row.overtime_pay + row.night_differential_pay),
      other_earnings: roundMoney(sum.other_earnings + row.other_earnings),
      gross_income: roundMoney(sum.gross_income + row.gross_income),
      attendance_deductions: roundMoney(sum.attendance_deductions + row.attendance_deductions),
      other_deductions: roundMoney(sum.other_deductions + row.other_deductions),
      government_deductions: roundMoney(sum.government_deductions + row.government_deductions),
      total_deductions: roundMoney(sum.total_deductions + row.total_deductions),
      employer_contributions: roundMoney(sum.employer_contributions + row.employer_contributions),
      net_pay: roundMoney(sum.net_pay + row.net_pay),
    }),
    {
      basic_pay: 0,
      overtime_pay: 0,
      other_earnings: 0,
      gross_income: 0,
      attendance_deductions: 0,
      other_deductions: 0,
      government_deductions: 0,
      total_deductions: 0,
      employer_contributions: 0,
      net_pay: 0,
    },
  );
  return { period, employees, totals };
}

export async function getEmployeePayrollHistory(filters?: unknown): Promise<{
  data: Array<PayrollEmployeeResultRecord & {
    period_name: string;
    start_date: string;
    end_date: string;
    payment_date: string;
    workflow_status: PayrollWorkflowStatus;
  }>;
  total: number;
}> {
  const value = asRecord(filters);
  const employeeId = optionalString(value.employee_id);
  const dateFrom = optionalDate(value.date_from, 'Date from');
  const dateTo = optionalDate(value.date_to, 'Date to');
  const clauses = ["COALESCE(payroll_periods.workflow_status, 'draft') IN ('finalized','locked')"];
  const params: unknown[] = [];
  if (employeeId) {
    clauses.push('payroll_employee_results.employee_id = ?');
    params.push(employeeId);
  }
  if (dateFrom) {
    clauses.push('payroll_periods.end_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    clauses.push('payroll_periods.start_date <= ?');
    params.push(dateTo);
  }
  const data = await getDb().all<Array<PayrollEmployeeResultRecord & {
    period_name: string;
    start_date: string;
    end_date: string;
    payment_date: string;
    workflow_status: PayrollWorkflowStatus;
  }>>(
    `SELECT payroll_employee_results.*,
            payroll_periods.name AS period_name,
            payroll_periods.start_date,
            payroll_periods.end_date,
            COALESCE(payroll_periods.payment_date, payroll_periods.end_date) AS payment_date,
            COALESCE(payroll_periods.workflow_status, 'draft') AS workflow_status
       FROM payroll_employee_results
       INNER JOIN payroll_periods ON payroll_periods.id = payroll_employee_results.payroll_period_id
      WHERE ${clauses.join(' AND ')}
      ORDER BY payroll_periods.payment_date DESC, payroll_periods.end_date DESC`,
    ...params,
  );
  return { data, total: data.length };
}

// Kept for compatibility with the Phase A preload API.
export async function runPayroll(periodId: string): Promise<{ periodId: string; status: string }> {
  const details = await calculatePayrollPeriod(periodId);
  return { periodId, status: details.period.workflow_status };
}

async function calculateEmployee(period: PayrollPeriodRecord, employee: EmployeeRow): Promise<void> {
  const attendance = await getDb().all<AttendanceRow[]>(
    `SELECT attendance_records.id, attendance_records.work_date,
            attendance_records.status, attendance_records.regular_hours,
            attendance_records.overtime_hours, attendance_records.night_diff_hours,
            attendance_records.late_minutes, attendance_records.undertime_minutes,
            attendance_records.leave_request_id,
            leave_types.is_paid AS leave_is_paid,
            leave_requests.duration_type AS leave_duration_type
       FROM attendance_records
       LEFT JOIN leave_requests ON leave_requests.id = attendance_records.leave_request_id
       LEFT JOIN leave_types ON leave_types.id = leave_requests.leave_type_id
      WHERE attendance_records.employee_id = ?
        AND attendance_records.work_date BETWEEN ? AND ?
      ORDER BY attendance_records.work_date`,
    employee.id,
    period.start_date,
    period.end_date,
  );

  const issues: CalculationIssue[] = [];
  const lineItems: CalculationLineItem[] = [];
  const dailyRate = employee.salary_type === 'monthly'
    ? safeDivide(employee.basic_salary, period.workdays_per_month)
    : employee.salary_type === 'daily'
      ? employee.basic_salary
      : employee.salary_type === 'hourly'
        ? employee.basic_salary * period.hours_per_day
        : safeDivide(employee.basic_salary, period.workdays_per_month);
  const hourlyRate = employee.salary_type === 'hourly'
    ? employee.basic_salary
    : safeDivide(dailyRate, period.hours_per_day);

  let paidDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let regularHours = 0;
  let overtimeHours = 0;
  let nightHours = 0;
  let lateMinutes = 0;
  let undertimeMinutes = 0;

  for (const row of attendance) {
    const leaveFactor = row.leave_duration_type?.startsWith('half-day') ? 0.5 : 1;
    if (['present', 'official-business', 'work-from-home', 'holiday'].includes(row.status)) {
      paidDays += 1;
    } else if (row.status === 'leave') {
      if (row.leave_is_paid === 1) {
        paidDays += leaveFactor;
        paidLeaveDays += leaveFactor;
      } else {
        unpaidLeaveDays += leaveFactor;
        absentDays += leaveFactor;
      }
    } else if (row.status === 'absent') {
      absentDays += 1;
    }
    regularHours += numberValue(row.regular_hours);
    overtimeHours += numberValue(row.overtime_hours);
    nightHours += numberValue(row.night_diff_hours);
    lateMinutes += numberValue(row.late_minutes);
    undertimeMinutes += numberValue(row.undertime_minutes);
  }

  let periodBasicPay = 0;
  if (employee.salary_type === 'monthly') {
    periodBasicPay = monthlyPeriodPay(employee.basic_salary, period.frequency);
  } else if (employee.salary_type === 'daily') {
    periodBasicPay = dailyRate * paidDays;
  } else if (employee.salary_type === 'hourly') {
    periodBasicPay = hourlyRate * regularHours;
  } else {
    periodBasicPay = employee.basic_salary;
  }
  periodBasicPay = roundMoney(periodBasicPay);

  if (employee.basic_salary <= 0) {
    issues.push({ severity: 'error', code: 'INVALID_SALARY', message: 'Basic salary must be greater than zero.' });
  }
  if (!attendance.length) {
    issues.push({
      severity: employee.salary_type === 'daily' || employee.salary_type === 'hourly' ? 'error' : 'warning',
      code: 'NO_ATTENDANCE',
      message: 'No attendance records were found for this payroll period.',
    });
  }
  if (!employee.bank_account?.trim()) {
    issues.push({ severity: 'warning', code: 'MISSING_BANK_ACCOUNT', message: 'Employee bank account is missing.' });
  }

  lineItems.push({
    item_type: 'earning', source_type: 'basic-pay', code: 'BASIC',
    name: 'Basic Pay', amount: periodBasicPay, taxable: 1,
    contribution_basis: 1, sort_order: 10,
    metadata: { daily_rate: roundMoney(dailyRate), hourly_rate: roundMoney(hourlyRate) },
  });

  const absenceDeduction = employee.salary_type === 'monthly' || employee.salary_type === 'fixed-contract'
    ? roundMoney(absentDays * dailyRate)
    : 0;
  const timeDeduction = employee.salary_type === 'monthly' || employee.salary_type === 'daily' || employee.salary_type === 'fixed-contract'
    ? roundMoney(((lateMinutes + undertimeMinutes) / 60) * hourlyRate)
    : 0;
  if (absenceDeduction > 0) {
    lineItems.push({
      item_type: 'deduction', source_type: 'attendance', code: 'ABSENCE',
      name: 'Absence / Unpaid Leave', amount: absenceDeduction,
      sort_order: 100, metadata: { absent_days: roundMoney(absentDays) },
    });
  }
  if (timeDeduction > 0) {
    lineItems.push({
      item_type: 'deduction', source_type: 'attendance', code: 'LATE-UT',
      name: 'Late and Undertime', amount: timeDeduction,
      sort_order: 110, metadata: { late_minutes: lateMinutes, undertime_minutes: undertimeMinutes },
    });
  }

  const overtimePay = roundMoney(overtimeHours * hourlyRate * period.overtime_multiplier);
  const nightDifferentialPay = roundMoney(nightHours * hourlyRate * period.night_differential_rate);
  if (overtimePay > 0) {
    lineItems.push({
      item_type: 'earning', source_type: 'attendance', code: 'OT',
      name: 'Overtime Pay', amount: overtimePay, taxable: 1,
      contribution_basis: 1, sort_order: 20,
      metadata: { hours: roundMoney(overtimeHours), multiplier: period.overtime_multiplier },
    });
  }
  if (nightDifferentialPay > 0) {
    lineItems.push({
      item_type: 'earning', source_type: 'attendance', code: 'ND',
      name: 'Night Differential', amount: nightDifferentialPay, taxable: 1,
      contribution_basis: 1, sort_order: 30,
      metadata: { hours: roundMoney(nightHours), rate: period.night_differential_rate },
    });
  }

  await addEarningItems(period, employee.id, lineItems);
  const preContributionGross = sumItems(lineItems, 'earning');
  const taxableIncome = roundMoney(lineItems
    .filter((item) => item.item_type === 'earning' && item.taxable)
    .reduce((sum, item) => sum + item.amount, 0));
  const contributionBasis = roundMoney(lineItems
    .filter((item) => item.item_type === 'earning' && item.contribution_basis)
    .reduce((sum, item) => sum + item.amount, 0));

  await addDeductionItems(period, employee.id, preContributionGross, lineItems);
  await addContributionItems(period, employee, taxableIncome, contributionBasis, lineItems, issues);

  const grossIncome = roundMoney(sumItems(lineItems, 'earning'));
  const attendanceDeductions = roundMoney(lineItems
    .filter((item) => item.item_type === 'deduction' && item.source_type === 'attendance')
    .reduce((sum, item) => sum + item.amount, 0));
  const governmentDeductions = roundMoney(lineItems
    .filter((item) => item.item_type === 'contribution')
    .reduce((sum, item) => sum + item.amount, 0));
  const otherDeductions = roundMoney(lineItems
    .filter((item) => item.item_type === 'deduction' && item.source_type !== 'attendance')
    .reduce((sum, item) => sum + item.amount, 0));
  const employerContributions = roundMoney(lineItems
    .filter((item) => item.item_type === 'employer-contribution')
    .reduce((sum, item) => sum + item.amount, 0));
  const totalDeductions = roundMoney(attendanceDeductions + otherDeductions + governmentDeductions);
  const netPay = roundMoney(grossIncome - totalDeductions);

  if (netPay < 0) {
    issues.push({ severity: 'error', code: 'NEGATIVE_NET_PAY', message: 'Total deductions exceed gross income.' });
  } else if (netPay === 0) {
    issues.push({ severity: 'warning', code: 'ZERO_NET_PAY', message: 'Net pay is zero.' });
  }

  const validationStatus = issues.some((item) => item.severity === 'error')
    ? 'error'
    : issues.length
      ? 'warning'
      : 'ok';
  const resultId = `payroll_result_${randomUUID()}`;
  await getDb().run(
    `INSERT INTO payroll_employee_results (
      id, payroll_period_id, employee_id, employee_number, employee_name,
      department, role_title, salary_type, basic_salary, period_basic_pay,
      overtime_pay, night_differential_pay, other_earnings, gross_income,
      attendance_deductions, other_deductions, government_deductions,
      employer_contributions, total_deductions, net_pay, taxable_income,
      contribution_basis, attendance_days, paid_days, absent_days,
      paid_leave_days, unpaid_leave_days, regular_hours, overtime_hours,
      late_minutes, undertime_minutes, validation_status, calculated_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))`,
    resultId, period.id, employee.id, employee.employee_number, employee.name,
    employee.department || null, employee.role_title || null, employee.salary_type,
    employee.basic_salary, periodBasicPay, overtimePay, nightDifferentialPay,
    roundMoney(grossIncome - periodBasicPay - overtimePay - nightDifferentialPay),
    grossIncome, attendanceDeductions, otherDeductions, governmentDeductions,
    employerContributions, totalDeductions, netPay, taxableIncome,
    contributionBasis, attendance.length, roundMoney(paidDays), roundMoney(absentDays),
    roundMoney(paidLeaveDays), roundMoney(unpaidLeaveDays), roundMoney(regularHours),
    roundMoney(overtimeHours), lateMinutes, undertimeMinutes, validationStatus,
  );

  for (const item of lineItems) {
    await getDb().run(
      `INSERT INTO payroll_line_items (
        id, payroll_result_id, payroll_period_id, employee_id,
        item_type, source_type, source_id, code, name, amount,
        taxable, contribution_basis, employer_amount, metadata_json,
        sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      `payroll_item_${randomUUID()}`, resultId, period.id, employee.id,
      item.item_type, item.source_type, item.source_id || null,
      item.code || null, item.name, roundMoney(item.amount), item.taxable ?? 0,
      item.contribution_basis ?? 0, roundMoney(item.employer_amount ?? 0),
      item.metadata ? JSON.stringify(item.metadata) : null, item.sort_order,
    );
  }
  for (const issue of issues) await addIssue(period.id, employee.id, issue);
}

async function addEarningItems(
  period: PayrollPeriodRecord,
  employeeId: string,
  items: CalculationLineItem[],
): Promise<void> {
  const assignments = await getDb().all<Array<{
    id: string; amount: number; code: string; name: string;
    taxability: string; include_in_contribution_basis: number;
  }>>(
    `SELECT earning_assignments.id, earning_assignments.amount,
            earning_types.code, earning_types.name, earning_types.taxability,
            earning_types.include_in_contribution_basis
       FROM earning_assignments
       INNER JOIN earning_types ON earning_types.id = earning_assignments.earning_type_id
      WHERE earning_assignments.employee_id = ?
        AND earning_assignments.is_active = 1
        AND earning_types.is_active = 1
        AND earning_assignments.effective_from <= ?
        AND (earning_assignments.effective_to IS NULL
          OR earning_assignments.effective_to = ''
          OR earning_assignments.effective_to >= ?)
      ORDER BY earning_types.name COLLATE NOCASE`,
    employeeId,
    period.end_date,
    period.start_date,
  );
  for (const row of assignments) {
    items.push({
      item_type: 'earning', source_type: 'earning-assignment', source_id: row.id,
      code: row.code, name: row.name, amount: roundMoney(row.amount),
      taxable: row.taxability === 'taxable' ? 1 : 0,
      contribution_basis: row.include_in_contribution_basis,
      sort_order: 40,
    });
  }

  const transactions = await getDb().all<Array<{
    id: string; amount: number; code: string; name: string;
    taxability: string; include_in_contribution_basis: number;
  }>>(
    `SELECT earning_transactions.id, earning_transactions.amount,
            earning_types.code, earning_types.name, earning_types.taxability,
            earning_types.include_in_contribution_basis
       FROM earning_transactions
       INNER JOIN earning_types ON earning_types.id = earning_transactions.earning_type_id
      WHERE earning_transactions.employee_id = ?
        AND earning_transactions.status = 'approved'
        AND (earning_transactions.payroll_period_id = ?
          OR (earning_transactions.payroll_period_id IS NULL
            AND earning_transactions.transaction_date BETWEEN ? AND ?))
      ORDER BY earning_transactions.transaction_date, earning_types.name COLLATE NOCASE`,
    employeeId,
    period.id,
    period.start_date,
    period.end_date,
  );
  for (const row of transactions) {
    items.push({
      item_type: 'earning', source_type: 'earning-transaction', source_id: row.id,
      code: row.code, name: row.name, amount: roundMoney(row.amount),
      taxable: row.taxability === 'taxable' ? 1 : 0,
      contribution_basis: row.include_in_contribution_basis,
      sort_order: 50,
    });
  }
}

async function addDeductionItems(
  period: PayrollPeriodRecord,
  employeeId: string,
  grossIncome: number,
  items: CalculationLineItem[],
): Promise<void> {
  const assignments = await getDb().all<Array<{
    id: string; amount: number; percentage: number;
    calculation_type: string; code: string; name: string; priority: number;
  }>>(
    `SELECT deduction_assignments.id, deduction_assignments.amount,
            deduction_assignments.percentage, deduction_types.calculation_type,
            deduction_types.code, deduction_types.name, deduction_types.priority
       FROM deduction_assignments
       INNER JOIN deduction_types ON deduction_types.id = deduction_assignments.deduction_type_id
      WHERE deduction_assignments.employee_id = ?
        AND deduction_assignments.is_active = 1
        AND deduction_types.is_active = 1
        AND deduction_assignments.effective_from <= ?
        AND (deduction_assignments.effective_to IS NULL
          OR deduction_assignments.effective_to = ''
          OR deduction_assignments.effective_to >= ?)
      ORDER BY deduction_types.priority, deduction_types.name COLLATE NOCASE`,
    employeeId,
    period.end_date,
    period.start_date,
  );
  for (const row of assignments) {
    const amount = row.calculation_type === 'percentage'
      ? roundMoney(grossIncome * row.percentage / 100)
      : roundMoney(row.amount);
    if (amount <= 0) continue;
    items.push({
      item_type: 'deduction', source_type: 'deduction-assignment', source_id: row.id,
      code: row.code, name: row.name, amount, sort_order: 200 + row.priority,
      metadata: { percentage: row.percentage },
    });
  }

  const transactions = await getDb().all<Array<{
    id: string; amount: number; code: string; name: string;
  }>>(
    `SELECT deduction_transactions.id, deduction_transactions.amount,
            deduction_types.code, deduction_types.name
       FROM deduction_transactions
       INNER JOIN deduction_types ON deduction_types.id = deduction_transactions.deduction_type_id
      WHERE deduction_transactions.employee_id = ?
        AND deduction_transactions.status = 'approved'
        AND deduction_transactions.loan_id IS NULL
        AND (deduction_transactions.payroll_period_id = ?
          OR (deduction_transactions.payroll_period_id IS NULL
            AND deduction_transactions.transaction_date BETWEEN ? AND ?))
      ORDER BY deduction_transactions.transaction_date, deduction_types.priority`,
    employeeId,
    period.id,
    period.start_date,
    period.end_date,
  );
  for (const row of transactions) {
    items.push({
      item_type: 'deduction', source_type: 'deduction-transaction', source_id: row.id,
      code: row.code, name: row.name, amount: roundMoney(row.amount), sort_order: 300,
    });
  }

  const loans = await getDb().all<Array<{
    loan_id: string; loan_number: string; code: string; name: string;
    outstanding_balance: number; amount_due: number;
  }>>(
    `SELECT employee_loans.id AS loan_id, employee_loans.loan_number,
            deduction_types.code, deduction_types.name,
            employee_loans.outstanding_balance,
            COALESCE(SUM(MAX(0, loan_installments.amount_due - loan_installments.amount_paid)), 0) AS amount_due
       FROM employee_loans
       INNER JOIN deduction_types ON deduction_types.id = employee_loans.deduction_type_id
       INNER JOIN loan_installments ON loan_installments.loan_id = employee_loans.id
      WHERE employee_loans.employee_id = ?
        AND employee_loans.status = 'active'
        AND loan_installments.status IN ('scheduled','partial')
        AND loan_installments.due_date BETWEEN ? AND ?
      GROUP BY employee_loans.id, employee_loans.loan_number,
               deduction_types.code, deduction_types.name,
               employee_loans.outstanding_balance
      ORDER BY employee_loans.loan_number`,
    employeeId,
    period.start_date,
    period.end_date,
  );
  for (const row of loans) {
    const amount = roundMoney(Math.min(row.outstanding_balance, row.amount_due));
    if (amount <= 0) continue;
    items.push({
      item_type: 'deduction', source_type: 'loan-installment', source_id: row.loan_id,
      code: row.code, name: `${row.name} (${row.loan_number})`, amount,
      sort_order: 250, metadata: { loan_number: row.loan_number },
    });
  }
}

async function addContributionItems(
  period: PayrollPeriodRecord,
  employee: EmployeeRow,
  taxableIncome: number,
  contributionBasis: number,
  items: CalculationLineItem[],
  issues: CalculationIssue[],
): Promise<void> {
  const types = await getDb().all<Array<{
    id: string; code: string; name: string; is_tax: number;
  }>>(
    `SELECT id, code, name, is_tax
       FROM government_contribution_types
      WHERE is_active = 1
      ORDER BY is_tax, name COLLATE NOCASE`,
  );
  for (const type of types) {
    const basis = type.is_tax ? Math.max(0, taxableIncome) : Math.max(0, contributionBasis);
    const table = await getDb().get<{ id: string }>(
      `SELECT id
         FROM government_contribution_tables
        WHERE contribution_type_id = ?
          AND status = 'active'
          AND effective_from <= ?
          AND (effective_to IS NULL OR effective_to = '' OR effective_to >= ?)
        ORDER BY effective_from DESC
        LIMIT 1`,
      type.id,
      period.payment_date,
      period.payment_date,
    );
    if (!table) {
      issues.push({
        severity: 'warning',
        code: `NO_${type.code}_TABLE`,
        message: `No active ${type.name} table applies on ${period.payment_date}.`,
      });
      continue;
    }
    try {
      const calculation = await calculateContribution({
        employee_id: employee.id,
        contribution_type_id: type.id,
        contribution_date: period.payment_date,
        compensation_basis: basis,
        table_version_id: table.id,
      });
      if (calculation.missing_government_number) {
        issues.push({
          severity: 'warning',
          code: `MISSING_${type.code}_NUMBER`,
          message: `${type.name} membership or identification number is missing.`,
        });
      }
      if (calculation.employee_share > 0) {
        items.push({
          item_type: 'contribution', source_type: 'government-contribution',
          source_id: type.id, code: type.code, name: type.name,
          amount: calculation.employee_share, employer_amount: calculation.employer_share,
          sort_order: 400, metadata: {
            table_version_id: calculation.table_version_id,
            contribution_date: calculation.contribution_date,
            compensation_basis: calculation.compensation_basis,
            government_number: calculation.government_number,
          },
        });
      }
      if (calculation.employer_share > 0) {
        items.push({
          item_type: 'employer-contribution', source_type: 'government-contribution',
          source_id: type.id, code: type.code, name: `${type.name} — Employer Share`,
          amount: calculation.employer_share, employer_amount: calculation.employer_share,
          sort_order: 500, metadata: {
            table_version_id: calculation.table_version_id,
            contribution_date: calculation.contribution_date,
            compensation_basis: calculation.compensation_basis,
            government_number: calculation.government_number,
          },
        });
      }
    } catch (error) {
      issues.push({
        severity: 'warning',
        code: `CONTRIBUTION_${type.code}_ERROR`,
        message: error instanceof Error ? error.message : `Unable to calculate ${type.name}.`,
      });
    }
  }
}

async function postPayrollItems(
  period: PayrollPeriodRecord,
  result: PayrollEmployeeResultRecord,
  rows: Array<{
    source_type: string;
    source_id: string | null;
    amount: number;
    employer_amount: number;
    metadata_json: string | null;
  }>,
): Promise<void> {
  for (const row of rows) {
    const sourceId = row.source_id || '';
    const metadata = safeJson(row.metadata_json);
    if (row.source_type === 'earning-assignment' && sourceId) {
      const exists = await getDb().get<{ count: number }>(
        `SELECT COUNT(*) AS count FROM earning_transactions
          WHERE assignment_id = ? AND payroll_period_id = ? AND status <> 'cancelled'`,
        sourceId,
        period.id,
      );
      if (!(exists?.count ?? 0)) {
        const assignment = await getDb().get<{ earning_type_id: string }>(
          'SELECT earning_type_id FROM earning_assignments WHERE id = ?',
          sourceId,
        );
        if (assignment) {
          await getDb().run(
            `INSERT INTO earning_transactions (
              id, employee_id, earning_type_id, assignment_id, transaction_date,
              payroll_period_id, amount, reference, notes, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', datetime('now'), datetime('now'))`,
            `earning_transaction_${randomUUID()}`, result.employee_id,
            assignment.earning_type_id, sourceId, period.payment_date, period.id,
            row.amount, period.name, 'Generated during payroll finalization.',
          );
        }
      }
    } else if (row.source_type === 'earning-transaction' && sourceId) {
      await getDb().run(
        `UPDATE earning_transactions
            SET payroll_period_id = COALESCE(payroll_period_id, ?), updated_at = datetime('now')
          WHERE id = ?`,
        period.id,
        sourceId,
      );
    } else if (row.source_type === 'deduction-assignment' && sourceId) {
      const exists = await getDb().get<{ count: number }>(
        `SELECT COUNT(*) AS count FROM deduction_transactions
          WHERE assignment_id = ? AND payroll_period_id = ? AND status <> 'cancelled'`,
        sourceId,
        period.id,
      );
      if (!(exists?.count ?? 0)) {
        const assignment = await getDb().get<{ deduction_type_id: string }>(
          'SELECT deduction_type_id FROM deduction_assignments WHERE id = ?',
          sourceId,
        );
        if (assignment) {
          await getDb().run(
            `INSERT INTO deduction_transactions (
              id, employee_id, deduction_type_id, assignment_id, loan_id,
              transaction_date, payroll_period_id, amount, reference, notes,
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'approved', datetime('now'), datetime('now'))`,
            `deduction_transaction_${randomUUID()}`, result.employee_id,
            assignment.deduction_type_id, sourceId, period.payment_date, period.id,
            row.amount, period.name, 'Generated during payroll finalization.',
          );
        }
      }
    } else if (row.source_type === 'deduction-transaction' && sourceId) {
      await getDb().run(
        `UPDATE deduction_transactions
            SET payroll_period_id = COALESCE(payroll_period_id, ?), updated_at = datetime('now')
          WHERE id = ?`,
        period.id,
        sourceId,
      );
    } else if (row.source_type === 'loan-installment' && sourceId) {
      const exists = await getDb().get<{ count: number }>(
        `SELECT COUNT(*) AS count FROM deduction_transactions
          WHERE loan_id = ? AND payroll_period_id = ? AND status = 'approved'`,
        sourceId,
        period.id,
      );
      if (!(exists?.count ?? 0)) {
        await recordLoanPayment(sourceId, {
          amount: row.amount,
          transaction_date: period.payment_date,
          payroll_period_id: period.id,
          reference: period.name,
          notes: 'Generated during payroll finalization.',
        });
      }
    } else if (row.source_type === 'government-contribution' && sourceId && row.amount >= 0) {
      const tableVersionId = stringValue(metadata.table_version_id);
      if (!tableVersionId) continue;
      const exists = await getDb().get<{ count: number }>(
        `SELECT COUNT(*) AS count FROM government_contribution_records
          WHERE employee_id = ? AND contribution_type_id = ?
            AND payroll_period_id = ? AND status <> 'cancelled'`,
        result.employee_id,
        sourceId,
        period.id,
      );
      if (!(exists?.count ?? 0)) {
        await createContributionRecord({
          employee_id: result.employee_id,
          contribution_type_id: sourceId,
          table_version_id: tableVersionId,
          contribution_date: period.payment_date,
          compensation_basis: numberValue(metadata.compensation_basis),
          payroll_period_id: period.id,
          reference: period.name,
          notes: 'Generated during payroll finalization.',
          status: 'approved',
        });
      }
    }
  }
}

async function getPayrollValidationIssues(periodId: string): Promise<PayrollValidationIssueRecord[]> {
  return getDb().all<PayrollValidationIssueRecord[]>(
    `SELECT payroll_validation_issues.id,
            payroll_validation_issues.payroll_period_id,
            COALESCE(payroll_validation_issues.employee_id, '') AS employee_id,
            COALESCE(employees.employee_number, '') AS employee_number,
            COALESCE(employees.name, 'Payroll period') AS employee_name,
            payroll_validation_issues.severity,
            payroll_validation_issues.code,
            payroll_validation_issues.message,
            payroll_validation_issues.created_at
       FROM payroll_validation_issues
       LEFT JOIN employees ON employees.id = payroll_validation_issues.employee_id
      WHERE payroll_validation_issues.payroll_period_id = ?
      ORDER BY CASE payroll_validation_issues.severity WHEN 'error' THEN 0 ELSE 1 END,
               employees.name COLLATE NOCASE,
               payroll_validation_issues.code`,
    periodId,
  );
}

async function addIssue(
  periodId: string,
  employeeId: string | null,
  issue: CalculationIssue,
): Promise<void> {
  await getDb().run(
    `INSERT INTO payroll_validation_issues (
      id, payroll_period_id, employee_id, severity, code, message, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    `payroll_issue_${randomUUID()}`,
    periodId,
    employeeId,
    issue.severity,
    issue.code,
    issue.message,
  );
}

async function logAction(periodId: string, action: string, actor: string, notes: string): Promise<void> {
  await getDb().run(
    `INSERT INTO payroll_action_logs (
      id, payroll_period_id, action, actor, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    `payroll_action_${randomUUID()}`,
    periodId,
    action,
    actor || null,
    notes || null,
  );
}

async function requirePeriod(id: string): Promise<PayrollPeriodRecord> {
  const period = await getPayrollPeriod(id);
  if (!period) throw new Error('Payroll period was not found.');
  return period;
}

function requireEditable(period: PayrollPeriodRecord): void {
  if (!['draft', 'calculated'].includes(period.workflow_status)) {
    throw new Error(`Payroll cannot be edited while its status is "${period.workflow_status}".`);
  }
}

async function validatePeriodOverlap(input: PayrollPeriodInput, excludeId = ''): Promise<void> {
  const overlap = await getDb().get<{ id: string; name: string }>(
    `SELECT id, name FROM payroll_periods
      WHERE id <> ?
        AND COALESCE(workflow_status, 'draft') <> 'cancelled'
        AND start_date <= ? AND end_date >= ?
      LIMIT 1`,
    excludeId,
    input.end_date,
    input.start_date,
  );
  if (overlap) {
    throw new Error(`Payroll dates overlap with "${overlap.name}".`);
  }
}

function validatePeriodInput(value: unknown): PayrollPeriodInput {
  const input = asRecord(value);
  const startDate = requiredDate(input.start_date, 'Start date');
  const endDate = requiredDate(input.end_date, 'End date');
  const paymentDate = requiredDate(input.payment_date || endDate, 'Payment date');
  if (endDate < startDate) throw new Error('End date cannot be before start date.');
  return {
    name: requiredString(input.name, 'Period name'),
    start_date: startDate,
    end_date: endDate,
    payment_date: paymentDate,
    frequency: enumValue(input.frequency, ['weekly', 'biweekly', 'semimonthly', 'monthly'], 'Frequency'),
    notes: optionalString(input.notes),
    workdays_per_month: positiveNumber(input.workdays_per_month ?? 22, 'Workdays per month'),
    hours_per_day: positiveNumber(input.hours_per_day ?? 8, 'Hours per day'),
    overtime_multiplier: positiveNumber(input.overtime_multiplier ?? 1.25, 'Overtime multiplier'),
    night_differential_rate: nonNegativeNumber(input.night_differential_rate ?? 0.10, 'Night differential rate'),
    created_by: optionalString(input.created_by),
  };
}

function parsePeriodFilters(value: unknown): {
  query: string;
  status: PayrollWorkflowStatus | 'all';
  date_from: string;
  date_to: string;
} {
  const input = asRecord(value);
  return {
    query: optionalString(input.query),
    status: enumValue(
      input.status || 'all',
      ['all', 'draft', 'calculated', 'approved', 'finalized', 'locked', 'cancelled'],
      'Status',
    ),
    date_from: optionalDate(input.date_from, 'Date from'),
    date_to: optionalDate(input.date_to, 'Date to'),
  };
}

function monthlyPeriodPay(monthlySalary: number, frequency: PayrollFrequency): number {
  const periodsPerYear: Record<PayrollFrequency, number> = {
    weekly: 52,
    biweekly: 26,
    semimonthly: 24,
    monthly: 12,
  };
  return roundMoney(monthlySalary * 12 / periodsPerYear[frequency]);
}

function sumItems(items: CalculationLineItem[], type: CalculationLineItem['item_type']): number {
  return roundMoney(items.filter((item) => item.item_type === type)
    .reduce((sum, item) => sum + item.amount, 0));
}

function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function roundMoney(value: number): number {
  return Math.round((numberValue(value) + Number.EPSILON) * 100) / 100;
}

function numberValue(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function requiredDate(value: unknown, label: string): string {
  const date = requiredString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }
  return date;
}

function optionalDate(value: unknown, label: string): string {
  if (value === undefined || value === null || value === '') return '';
  return requiredDate(value, label);
}

function positiveNumber(value: unknown, label: string): number {
  const number = numberValue(value);
  if (number <= 0) throw new Error(`${label} must be greater than zero.`);
  return number;
}

function nonNegativeNumber(value: unknown, label: string): number {
  const number = numberValue(value);
  if (number < 0) throw new Error(`${label} cannot be negative.`);
  return number;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new Error(`${label} is invalid.`);
  }
  return value as T;
}

function safeJson(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}
