import { getDb } from '../db';

type UnknownRecord = Record<string, unknown>;

interface NormalizedReportFilters {
  period_id: string;
  date_from: string;
  date_to: string;
  employee_id: string;
  department: string;
  status: string;
  query: string;
}

interface ReportPeriodRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  frequency: string;
  workflow_status: string;
}

interface ReportEmployeeRow {
  id: string;
  employee_number: string;
  name: string;
  department: string;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalDate(value: unknown, label: string): string {
  const text = optionalString(value);
  if (!text) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${label} must use YYYY-MM-DD format.`);
  }
  return text;
}

function roundMoney(value: number): number {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFilters(filters: unknown): NormalizedReportFilters {
  const value = asRecord(filters);
  const status = optionalString(value.status);
  const allowedStatuses = new Set([
    '',
    'all',
    'draft',
    'calculated',
    'approved',
    'finalized',
    'locked',
    'cancelled',
  ]);
  if (!allowedStatuses.has(status)) {
    throw new Error('Invalid payroll workflow status filter.');
  }

  const dateFrom = optionalDate(value.date_from, 'Date from');
  const dateTo = optionalDate(value.date_to, 'Date to');
  if (dateFrom && dateTo && dateTo < dateFrom) {
    throw new Error('Date to cannot be earlier than date from.');
  }

  return {
    period_id: optionalString(value.period_id),
    date_from: dateFrom,
    date_to: dateTo,
    employee_id: optionalString(value.employee_id),
    department: optionalString(value.department),
    status: status === 'all' ? '' : status,
    query: optionalString(value.query),
  };
}

function resultWhere(
  filters: NormalizedReportFilters,
  periodAlias = 'payroll_periods',
  resultAlias = 'payroll_employee_results',
): { sql: string; params: unknown[] } {
  const clauses: string[] = ['1 = 1'];
  const params: unknown[] = [];

  if (filters.period_id) {
    clauses.push(`${periodAlias}.id = ?`);
    params.push(filters.period_id);
  }
  if (filters.date_from) {
    clauses.push(`COALESCE(${periodAlias}.payment_date, ${periodAlias}.end_date) >= ?`);
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    clauses.push(`COALESCE(${periodAlias}.payment_date, ${periodAlias}.end_date) <= ?`);
    params.push(filters.date_to);
  }
  if (filters.employee_id) {
    clauses.push(`${resultAlias}.employee_id = ?`);
    params.push(filters.employee_id);
  }
  if (filters.department) {
    clauses.push(`COALESCE(${resultAlias}.department, '') = ?`);
    params.push(filters.department);
  }
  if (filters.status) {
    clauses.push(`COALESCE(${periodAlias}.workflow_status, 'draft') = ?`);
    params.push(filters.status);
  }
  if (filters.query) {
    const query = `%${filters.query}%`;
    clauses.push(`(
      ${resultAlias}.employee_name LIKE ?
      OR ${resultAlias}.employee_number LIKE ?
      OR COALESCE(${resultAlias}.department, '') LIKE ?
      OR ${periodAlias}.name LIKE ?
    )`);
    params.push(query, query, query, query);
  }

  return { sql: clauses.join(' AND '), params };
}

export async function getReportOptions(): Promise<{
  periods: ReportPeriodRow[];
  employees: ReportEmployeeRow[];
  departments: string[];
}> {
  const periods = await getDb().all<ReportPeriodRow[]>(
    `SELECT payroll_periods.id,
            payroll_periods.name,
            payroll_periods.start_date,
            payroll_periods.end_date,
            COALESCE(payroll_periods.payment_date, payroll_periods.end_date) AS payment_date,
            payroll_periods.frequency,
            COALESCE(payroll_periods.workflow_status, 'draft') AS workflow_status
       FROM payroll_periods
      WHERE EXISTS (
        SELECT 1
          FROM payroll_employee_results
         WHERE payroll_employee_results.payroll_period_id = payroll_periods.id
      )
      ORDER BY COALESCE(payroll_periods.payment_date, payroll_periods.end_date) DESC,
               payroll_periods.end_date DESC`,
  );

  const employees = await getDb().all<ReportEmployeeRow[]>(
    `SELECT employees.id,
            COALESCE(NULLIF(employees.employee_number, ''), employees.id) AS employee_number,
            employees.name,
            COALESCE(employees.department, '') AS department
       FROM employees
      ORDER BY employees.name`,
  );

  const departmentRows = await getDb().all<Array<{ department: string }>>(
    `SELECT DISTINCT trim(department) AS department
       FROM employees
      WHERE department IS NOT NULL
        AND trim(department) <> ''
      UNION
     SELECT DISTINCT trim(department) AS department
       FROM payroll_employee_results
      WHERE department IS NOT NULL
        AND trim(department) <> ''
      ORDER BY department`,
  );

  return {
    periods,
    employees,
    departments: departmentRows.map((row) => row.department),
  };
}

export async function getReportsDashboard(filters: unknown): Promise<{
  totals: {
    periods: number;
    employee_records: number;
    employees: number;
    departments: number;
    gross_income: number;
    total_deductions: number;
    net_pay: number;
    employer_contributions: number;
  };
  recent_periods: Array<ReportPeriodRow & {
    employee_count: number;
    gross_total: number;
    deduction_total: number;
    net_total: number;
  }>;
}> {
  const normalized = normalizeFilters(filters);
  const where = resultWhere(normalized);

  const totalsRow = await getDb().get<{
    periods: number;
    employee_records: number;
    employees: number;
    departments: number;
    gross_income: number;
    total_deductions: number;
    net_pay: number;
    employer_contributions: number;
  }>(
    `SELECT COUNT(DISTINCT payroll_periods.id) AS periods,
            COUNT(payroll_employee_results.id) AS employee_records,
            COUNT(DISTINCT payroll_employee_results.employee_id) AS employees,
            COUNT(DISTINCT NULLIF(trim(COALESCE(payroll_employee_results.department, '')), '')) AS departments,
            COALESCE(SUM(payroll_employee_results.gross_income), 0) AS gross_income,
            COALESCE(SUM(payroll_employee_results.total_deductions), 0) AS total_deductions,
            COALESCE(SUM(payroll_employee_results.net_pay), 0) AS net_pay,
            COALESCE(SUM(payroll_employee_results.employer_contributions), 0) AS employer_contributions
       FROM payroll_employee_results
       INNER JOIN payroll_periods
               ON payroll_periods.id = payroll_employee_results.payroll_period_id
      WHERE ${where.sql}`,
    ...where.params,
  );

  const recentPeriods = await getDb().all<Array<ReportPeriodRow & {
    employee_count: number;
    gross_total: number;
    deduction_total: number;
    net_total: number;
  }>>(
    `SELECT payroll_periods.id,
            payroll_periods.name,
            payroll_periods.start_date,
            payroll_periods.end_date,
            COALESCE(payroll_periods.payment_date, payroll_periods.end_date) AS payment_date,
            payroll_periods.frequency,
            COALESCE(payroll_periods.workflow_status, 'draft') AS workflow_status,
            COUNT(payroll_employee_results.id) AS employee_count,
            COALESCE(SUM(payroll_employee_results.gross_income), 0) AS gross_total,
            COALESCE(SUM(payroll_employee_results.total_deductions), 0) AS deduction_total,
            COALESCE(SUM(payroll_employee_results.net_pay), 0) AS net_total
       FROM payroll_employee_results
       INNER JOIN payroll_periods
               ON payroll_periods.id = payroll_employee_results.payroll_period_id
      WHERE ${where.sql}
      GROUP BY payroll_periods.id
      ORDER BY COALESCE(payroll_periods.payment_date, payroll_periods.end_date) DESC
      LIMIT 8`,
    ...where.params,
  );

  return {
    totals: {
      periods: numberValue(totalsRow?.periods),
      employee_records: numberValue(totalsRow?.employee_records),
      employees: numberValue(totalsRow?.employees),
      departments: numberValue(totalsRow?.departments),
      gross_income: roundMoney(numberValue(totalsRow?.gross_income)),
      total_deductions: roundMoney(numberValue(totalsRow?.total_deductions)),
      net_pay: roundMoney(numberValue(totalsRow?.net_pay)),
      employer_contributions: roundMoney(numberValue(totalsRow?.employer_contributions)),
    },
    recent_periods: recentPeriods,
  };
}

export async function getPayrollRegisterReport(filters: unknown): Promise<{
  rows: Array<Record<string, unknown>>;
  totals: Record<string, number>;
}> {
  const normalized = normalizeFilters(filters);
  const where = resultWhere(normalized);
  const rows = await getDb().all<Array<Record<string, unknown>>>(
    `SELECT payroll_periods.id AS period_id,
            payroll_periods.name AS period_name,
            payroll_periods.start_date,
            payroll_periods.end_date,
            COALESCE(payroll_periods.payment_date, payroll_periods.end_date) AS payment_date,
            COALESCE(payroll_periods.workflow_status, 'draft') AS workflow_status,
            payroll_employee_results.*
       FROM payroll_employee_results
       INNER JOIN payroll_periods
               ON payroll_periods.id = payroll_employee_results.payroll_period_id
      WHERE ${where.sql}
      ORDER BY COALESCE(payroll_periods.payment_date, payroll_periods.end_date) DESC,
               payroll_employee_results.employee_name`,
    ...where.params,
  );

  const totals = rows.reduce<{
    period_basic_pay: number;
    overtime_pay: number;
    night_differential_pay: number;
    other_earnings: number;
    gross_income: number;
    attendance_deductions: number;
    other_deductions: number;
    government_deductions: number;
    total_deductions: number;
    employer_contributions: number;
    net_pay: number;
  }>((current, row) => ({
    period_basic_pay: current.period_basic_pay + numberValue(row.period_basic_pay),
    overtime_pay: current.overtime_pay + numberValue(row.overtime_pay),
    night_differential_pay: current.night_differential_pay + numberValue(row.night_differential_pay),
    other_earnings: current.other_earnings + numberValue(row.other_earnings),
    gross_income: current.gross_income + numberValue(row.gross_income),
    attendance_deductions: current.attendance_deductions + numberValue(row.attendance_deductions),
    other_deductions: current.other_deductions + numberValue(row.other_deductions),
    government_deductions: current.government_deductions + numberValue(row.government_deductions),
    total_deductions: current.total_deductions + numberValue(row.total_deductions),
    employer_contributions: current.employer_contributions + numberValue(row.employer_contributions),
    net_pay: current.net_pay + numberValue(row.net_pay),
  }), {
    period_basic_pay: 0,
    overtime_pay: 0,
    night_differential_pay: 0,
    other_earnings: 0,
    gross_income: 0,
    attendance_deductions: 0,
    other_deductions: 0,
    government_deductions: 0,
    total_deductions: 0,
    employer_contributions: 0,
    net_pay: 0,
  });

  for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[key] = roundMoney(totals[key]);
  }
  return { rows, totals };
}

export async function getPayrollSummaryReport(filters: unknown): Promise<{
  periods: Array<Record<string, unknown>>;
  departments: Array<Record<string, unknown>>;
  totals: Record<string, number>;
}> {
  const normalized = normalizeFilters(filters);
  const where = resultWhere(normalized);

  const periods = await getDb().all<Array<Record<string, unknown>>>(
    `SELECT payroll_periods.id AS period_id,
            payroll_periods.name AS period_name,
            payroll_periods.start_date,
            payroll_periods.end_date,
            COALESCE(payroll_periods.payment_date, payroll_periods.end_date) AS payment_date,
            payroll_periods.frequency,
            COALESCE(payroll_periods.workflow_status, 'draft') AS workflow_status,
            COUNT(payroll_employee_results.id) AS employee_count,
            COALESCE(SUM(payroll_employee_results.gross_income), 0) AS gross_income,
            COALESCE(SUM(payroll_employee_results.total_deductions), 0) AS total_deductions,
            COALESCE(SUM(payroll_employee_results.employer_contributions), 0) AS employer_contributions,
            COALESCE(SUM(payroll_employee_results.net_pay), 0) AS net_pay
       FROM payroll_employee_results
       INNER JOIN payroll_periods
               ON payroll_periods.id = payroll_employee_results.payroll_period_id
      WHERE ${where.sql}
      GROUP BY payroll_periods.id
      ORDER BY COALESCE(payroll_periods.payment_date, payroll_periods.end_date) DESC`,
    ...where.params,
  );

  const departments = await getDb().all<Array<Record<string, unknown>>>(
    `SELECT COALESCE(NULLIF(trim(payroll_employee_results.department), ''), 'Unassigned') AS department,
            COUNT(DISTINCT payroll_employee_results.employee_id) AS employee_count,
            COUNT(DISTINCT payroll_periods.id) AS period_count,
            COALESCE(SUM(payroll_employee_results.gross_income), 0) AS gross_income,
            COALESCE(SUM(payroll_employee_results.total_deductions), 0) AS total_deductions,
            COALESCE(SUM(payroll_employee_results.employer_contributions), 0) AS employer_contributions,
            COALESCE(SUM(payroll_employee_results.net_pay), 0) AS net_pay
       FROM payroll_employee_results
       INNER JOIN payroll_periods
               ON payroll_periods.id = payroll_employee_results.payroll_period_id
      WHERE ${where.sql}
      GROUP BY COALESCE(NULLIF(trim(payroll_employee_results.department), ''), 'Unassigned')
      ORDER BY department`,
    ...where.params,
  );

  const totals = periods.reduce<{
    employee_records: number;
    gross_income: number;
    total_deductions: number;
    employer_contributions: number;
    net_pay: number;
  }>((current, row) => ({
    employee_records: current.employee_records + numberValue(row.employee_count),
    gross_income: current.gross_income + numberValue(row.gross_income),
    total_deductions: current.total_deductions + numberValue(row.total_deductions),
    employer_contributions: current.employer_contributions + numberValue(row.employer_contributions),
    net_pay: current.net_pay + numberValue(row.net_pay),
  }), {
    employee_records: 0,
    gross_income: 0,
    total_deductions: 0,
    employer_contributions: 0,
    net_pay: 0,
  });

  totals.gross_income = roundMoney(totals.gross_income);
  totals.total_deductions = roundMoney(totals.total_deductions);
  totals.employer_contributions = roundMoney(totals.employer_contributions);
  totals.net_pay = roundMoney(totals.net_pay);
  return { periods, departments, totals };
}

async function getLineItemReport(
  filters: unknown,
  itemTypes: string[],
): Promise<{
  rows: Array<Record<string, unknown>>;
  summary: Array<{ code: string; name: string; source_type: string; amount: number; records: number }>;
  total: number;
}> {
  const normalized = normalizeFilters(filters);
  const where = resultWhere(normalized);
  const placeholders = itemTypes.map(() => '?').join(', ');
  const rows = await getDb().all<Array<Record<string, unknown>>>(
    `SELECT payroll_line_items.id,
            payroll_periods.id AS period_id,
            payroll_periods.name AS period_name,
            COALESCE(payroll_periods.payment_date, payroll_periods.end_date) AS payment_date,
            COALESCE(payroll_periods.workflow_status, 'draft') AS workflow_status,
            payroll_employee_results.employee_id,
            payroll_employee_results.employee_number,
            payroll_employee_results.employee_name,
            COALESCE(payroll_employee_results.department, '') AS department,
            payroll_line_items.item_type,
            payroll_line_items.source_type,
            COALESCE(payroll_line_items.code, '') AS code,
            payroll_line_items.name,
            payroll_line_items.amount,
            payroll_line_items.taxable,
            payroll_line_items.contribution_basis
       FROM payroll_line_items
       INNER JOIN payroll_employee_results
               ON payroll_employee_results.id = payroll_line_items.payroll_result_id
       INNER JOIN payroll_periods
               ON payroll_periods.id = payroll_line_items.payroll_period_id
      WHERE payroll_line_items.item_type IN (${placeholders})
        AND ${where.sql}
      ORDER BY COALESCE(payroll_periods.payment_date, payroll_periods.end_date) DESC,
               payroll_employee_results.employee_name,
               payroll_line_items.sort_order,
               payroll_line_items.name`,
    ...itemTypes,
    ...where.params,
  );

  const summaryMap = new Map<string, {
    code: string;
    name: string;
    source_type: string;
    amount: number;
    records: number;
  }>();
  let total = 0;
  for (const row of rows) {
    const amount = numberValue(row.amount);
    total += amount;
    const key = `${String(row.source_type)}\u0000${String(row.code)}\u0000${String(row.name)}`;
    const existing = summaryMap.get(key) ?? {
      code: String(row.code || ''),
      name: String(row.name || ''),
      source_type: String(row.source_type || ''),
      amount: 0,
      records: 0,
    };
    existing.amount += amount;
    existing.records += 1;
    summaryMap.set(key, existing);
  }

  return {
    rows,
    summary: [...summaryMap.values()]
      .map((row) => ({ ...row, amount: roundMoney(row.amount) }))
      .sort((left, right) => right.amount - left.amount),
    total: roundMoney(total),
  };
}

export async function getEarningsReport(filters: unknown) {
  return getLineItemReport(filters, ['earning']);
}

export async function getDeductionsReport(filters: unknown) {
  return getLineItemReport(filters, ['deduction', 'contribution']);
}

export async function getContributionsReport(filters: unknown): Promise<{
  rows: Array<Record<string, unknown>>;
  summary: Array<Record<string, unknown>>;
  totals: { employee_share: number; employer_share: number; total_contribution: number };
}> {
  const normalized = normalizeFilters(filters);
  const where = resultWhere(normalized);
  const rows = await getDb().all<Array<Record<string, unknown>>>(
    `SELECT payroll_periods.id AS period_id,
            payroll_periods.name AS period_name,
            COALESCE(payroll_periods.payment_date, payroll_periods.end_date) AS payment_date,
            COALESCE(payroll_periods.workflow_status, 'draft') AS workflow_status,
            payroll_employee_results.employee_id,
            payroll_employee_results.employee_number,
            payroll_employee_results.employee_name,
            COALESCE(payroll_employee_results.department, '') AS department,
            COALESCE(payroll_line_items.source_id, payroll_line_items.code, payroll_line_items.name) AS contribution_key,
            COALESCE(payroll_line_items.code, '') AS code,
            COALESCE(
              MAX(CASE WHEN payroll_line_items.item_type = 'contribution' THEN payroll_line_items.name END),
              REPLACE(MAX(payroll_line_items.name), ' — Employer Share', '')
            ) AS name,
            COALESCE(SUM(CASE WHEN payroll_line_items.item_type = 'contribution' THEN payroll_line_items.amount ELSE 0 END), 0) AS employee_share,
            COALESCE(SUM(CASE WHEN payroll_line_items.item_type = 'employer-contribution' THEN payroll_line_items.amount ELSE 0 END), 0) AS employer_share,
            COALESCE(SUM(payroll_line_items.amount), 0) AS total_contribution
       FROM payroll_line_items
       INNER JOIN payroll_employee_results
               ON payroll_employee_results.id = payroll_line_items.payroll_result_id
       INNER JOIN payroll_periods
               ON payroll_periods.id = payroll_line_items.payroll_period_id
      WHERE payroll_line_items.item_type IN ('contribution', 'employer-contribution')
        AND ${where.sql}
      GROUP BY payroll_periods.id,
               payroll_employee_results.employee_id,
               COALESCE(payroll_line_items.source_id, payroll_line_items.code, payroll_line_items.name),
               payroll_line_items.code
      ORDER BY COALESCE(payroll_periods.payment_date, payroll_periods.end_date) DESC,
               payroll_employee_results.employee_name,
               code`,
    ...where.params,
  );

  const summaryMap = new Map<string, Record<string, unknown>>();
  let employeeShare = 0;
  let employerShare = 0;
  for (const row of rows) {
    const employee = numberValue(row.employee_share);
    const employer = numberValue(row.employer_share);
    employeeShare += employee;
    employerShare += employer;
    const key = String(row.contribution_key || row.code || row.name);
    const existing = summaryMap.get(key) ?? {
      code: row.code,
      name: row.name,
      employee_share: 0,
      employer_share: 0,
      total_contribution: 0,
      employees: 0,
    };
    existing.employee_share = numberValue(existing.employee_share) + employee;
    existing.employer_share = numberValue(existing.employer_share) + employer;
    existing.total_contribution = numberValue(existing.total_contribution) + employee + employer;
    existing.employees = numberValue(existing.employees) + 1;
    summaryMap.set(key, existing);
  }

  return {
    rows,
    summary: [...summaryMap.values()].map((row) => ({
      ...row,
      employee_share: roundMoney(numberValue(row.employee_share)),
      employer_share: roundMoney(numberValue(row.employer_share)),
      total_contribution: roundMoney(numberValue(row.total_contribution)),
    })),
    totals: {
      employee_share: roundMoney(employeeShare),
      employer_share: roundMoney(employerShare),
      total_contribution: roundMoney(employeeShare + employerShare),
    },
  };
}

export async function getNetPayReport(filters: unknown): Promise<{
  rows: Array<Record<string, unknown>>;
  totals: { employees: number; gross_income: number; total_deductions: number; net_pay: number };
}> {
  const result = await getPayrollRegisterReport(filters);
  const rows = result.rows.map((row) => ({
    period_id: row.period_id,
    period_name: row.period_name,
    payment_date: row.payment_date,
    workflow_status: row.workflow_status,
    employee_id: row.employee_id,
    employee_number: row.employee_number,
    employee_name: row.employee_name,
    department: row.department,
    gross_income: row.gross_income,
    total_deductions: row.total_deductions,
    net_pay: row.net_pay,
    validation_status: row.validation_status,
  }));
  return {
    rows,
    totals: {
      employees: rows.length,
      gross_income: result.totals.gross_income,
      total_deductions: result.totals.total_deductions,
      net_pay: result.totals.net_pay,
    },
  };
}

export async function getPayrollVarianceReport(payload: unknown): Promise<{
  current_period: ReportPeriodRow;
  comparison_period: ReportPeriodRow;
  rows: Array<Record<string, unknown>>;
  totals: Record<string, number>;
}> {
  const value = asRecord(payload);
  const currentPeriodId = optionalString(value.current_period_id);
  const comparisonPeriodId = optionalString(value.comparison_period_id);
  const department = optionalString(value.department);
  const query = optionalString(value.query);
  if (!currentPeriodId || !comparisonPeriodId) {
    throw new Error('Select both a current and comparison payroll period.');
  }
  if (currentPeriodId === comparisonPeriodId) {
    throw new Error('The current and comparison periods must be different.');
  }

  const periodRows = await getDb().all<ReportPeriodRow[]>(
    `SELECT id, name, start_date, end_date,
            COALESCE(payment_date, end_date) AS payment_date,
            frequency,
            COALESCE(workflow_status, 'draft') AS workflow_status
       FROM payroll_periods
      WHERE id IN (?, ?)`,
    currentPeriodId,
    comparisonPeriodId,
  );
  const currentPeriod = periodRows.find((period) => period.id === currentPeriodId);
  const comparisonPeriod = periodRows.find((period) => period.id === comparisonPeriodId);
  if (!currentPeriod || !comparisonPeriod) {
    throw new Error('One or both payroll periods could not be found.');
  }

  const clauses = ['1 = 1'];
  const params: unknown[] = [currentPeriodId, comparisonPeriodId, currentPeriodId, comparisonPeriodId];
  if (department) {
    clauses.push("COALESCE(current_result.department, comparison_result.department, '') = ?");
    params.push(department);
  }
  if (query) {
    const search = `%${query}%`;
    clauses.push(`(
      COALESCE(current_result.employee_name, comparison_result.employee_name, '') LIKE ?
      OR COALESCE(current_result.employee_number, comparison_result.employee_number, '') LIKE ?
    )`);
    params.push(search, search);
  }

  const rows = await getDb().all<Array<Record<string, unknown>>>(
    `WITH employee_ids AS (
       SELECT employee_id
         FROM payroll_employee_results
        WHERE payroll_period_id = ?
       UNION
       SELECT employee_id
         FROM payroll_employee_results
        WHERE payroll_period_id = ?
     )
     SELECT employee_ids.employee_id,
            COALESCE(current_result.employee_number, comparison_result.employee_number, '') AS employee_number,
            COALESCE(current_result.employee_name, comparison_result.employee_name, '') AS employee_name,
            COALESCE(current_result.department, comparison_result.department, '') AS department,
            COALESCE(comparison_result.gross_income, 0) AS comparison_gross,
            COALESCE(current_result.gross_income, 0) AS current_gross,
            COALESCE(current_result.gross_income, 0) - COALESCE(comparison_result.gross_income, 0) AS gross_variance,
            COALESCE(comparison_result.total_deductions, 0) AS comparison_deductions,
            COALESCE(current_result.total_deductions, 0) AS current_deductions,
            COALESCE(current_result.total_deductions, 0) - COALESCE(comparison_result.total_deductions, 0) AS deduction_variance,
            COALESCE(comparison_result.net_pay, 0) AS comparison_net,
            COALESCE(current_result.net_pay, 0) AS current_net,
            COALESCE(current_result.net_pay, 0) - COALESCE(comparison_result.net_pay, 0) AS net_variance
       FROM employee_ids
       LEFT JOIN payroll_employee_results AS current_result
              ON current_result.employee_id = employee_ids.employee_id
             AND current_result.payroll_period_id = ?
       LEFT JOIN payroll_employee_results AS comparison_result
              ON comparison_result.employee_id = employee_ids.employee_id
             AND comparison_result.payroll_period_id = ?
      WHERE ${clauses.join(' AND ')}
      ORDER BY employee_name`,
    ...params,
  );

  const totals = rows.reduce<{
    comparison_gross: number;
    current_gross: number;
    gross_variance: number;
    comparison_deductions: number;
    current_deductions: number;
    deduction_variance: number;
    comparison_net: number;
    current_net: number;
    net_variance: number;
  }>((current, row) => ({
    comparison_gross: current.comparison_gross + numberValue(row.comparison_gross),
    current_gross: current.current_gross + numberValue(row.current_gross),
    gross_variance: current.gross_variance + numberValue(row.gross_variance),
    comparison_deductions: current.comparison_deductions + numberValue(row.comparison_deductions),
    current_deductions: current.current_deductions + numberValue(row.current_deductions),
    deduction_variance: current.deduction_variance + numberValue(row.deduction_variance),
    comparison_net: current.comparison_net + numberValue(row.comparison_net),
    current_net: current.current_net + numberValue(row.current_net),
    net_variance: current.net_variance + numberValue(row.net_variance),
  }), {
    comparison_gross: 0,
    current_gross: 0,
    gross_variance: 0,
    comparison_deductions: 0,
    current_deductions: 0,
    deduction_variance: 0,
    comparison_net: 0,
    current_net: 0,
    net_variance: 0,
  });
  for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
    totals[key] = roundMoney(totals[key]);
  }

  return { current_period: currentPeriod, comparison_period: comparisonPeriod, rows, totals };
}

export async function getBankTransferReport(filters: unknown): Promise<{
  period: ReportPeriodRow;
  rows: Array<Record<string, unknown>>;
  totals: { employees: number; ready: number; missing_accounts: number; net_pay: number };
}> {
  const normalized = normalizeFilters(filters);
  if (!normalized.period_id) {
    throw new Error('Select a finalized or locked payroll period.');
  }
  const period = await getDb().get<ReportPeriodRow>(
    `SELECT id, name, start_date, end_date,
            COALESCE(payment_date, end_date) AS payment_date,
            frequency,
            COALESCE(workflow_status, 'draft') AS workflow_status
       FROM payroll_periods
      WHERE id = ?`,
    normalized.period_id,
  );
  if (!period) throw new Error('Payroll period could not be found.');
  if (!['finalized', 'locked'].includes(period.workflow_status)) {
    throw new Error('Bank transfer reports are available only for finalized or locked payroll periods.');
  }

  const where = resultWhere(normalized);
  const rows = await getDb().all<Array<Record<string, unknown>>>(
    `SELECT payroll_employee_results.employee_id,
            payroll_employee_results.employee_number,
            payroll_employee_results.employee_name,
            COALESCE(payroll_employee_results.department, '') AS department,
            COALESCE(employees.bank_name, '') AS bank_name,
            COALESCE(employees.bank_account, '') AS bank_account,
            payroll_employee_results.net_pay,
            CASE
              WHEN employees.bank_account IS NULL OR trim(employees.bank_account) = '' THEN 0
              ELSE 1
            END AS ready
       FROM payroll_employee_results
       INNER JOIN payroll_periods
               ON payroll_periods.id = payroll_employee_results.payroll_period_id
       INNER JOIN employees
               ON employees.id = payroll_employee_results.employee_id
      WHERE ${where.sql}
      ORDER BY payroll_employee_results.employee_name`,
    ...where.params,
  );

  const ready = rows.filter((row) => numberValue(row.ready) === 1).length;
  return {
    period,
    rows,
    totals: {
      employees: rows.length,
      ready,
      missing_accounts: rows.length - ready,
      net_pay: roundMoney(rows.reduce((sum, row) => sum + numberValue(row.net_pay), 0)),
    },
  };
}
