import { randomUUID } from 'node:crypto';
import { getDb } from '../db';

export type EarningCategory =
  | 'allowance'
  | 'bonus'
  | 'incentive'
  | 'commission'
  | 'reimbursement'
  | 'adjustment'
  | 'other';
export type CalculationType = 'fixed' | 'variable';
export type EarningRecurrence = 'recurring' | 'one-time';
export type Taxability = 'taxable' | 'non-taxable';
export type EarningTransactionStatus = 'draft' | 'approved' | 'cancelled';

export interface EarningTypeRecord {
  id: string;
  code: string;
  name: string;
  category: EarningCategory;
  description: string;
  calculation_type: CalculationType;
  default_amount: number;
  recurrence: EarningRecurrence;
  taxability: Taxability;
  include_in_gross: number;
  include_in_contribution_basis: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface EarningAssignmentRecord {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  earning_type_id: string;
  earning_code: string;
  earning_name: string;
  category: EarningCategory;
  taxability: Taxability;
  amount: number;
  effective_from: string;
  effective_to: string;
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface EarningTransactionRecord {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  earning_type_id: string;
  earning_code: string;
  earning_name: string;
  category: EarningCategory;
  taxability: Taxability;
  include_in_gross: number;
  include_in_contribution_basis: number;
  assignment_id: string;
  transaction_date: string;
  payroll_period_id: string;
  payroll_period_name: string;
  amount: number;
  reference: string;
  notes: string;
  status: EarningTransactionStatus;
  created_at: string;
  updated_at: string;
}

interface EarningTypeInput {
  code: string;
  name: string;
  category: EarningCategory;
  description: string;
  calculation_type: CalculationType;
  default_amount: number;
  recurrence: EarningRecurrence;
  taxability: Taxability;
  include_in_gross: number;
  include_in_contribution_basis: number;
  is_active: number;
}

interface EarningAssignmentInput {
  employee_id: string;
  earning_type_id: string;
  amount: number;
  effective_from: string;
  effective_to: string;
  notes: string;
  is_active: number;
}

interface EarningTransactionInput {
  employee_id: string;
  earning_type_id: string;
  assignment_id: string;
  transaction_date: string;
  payroll_period_id: string;
  amount: number;
  reference: string;
  notes: string;
  status: EarningTransactionStatus;
}

const earningTypeSelect = `
  SELECT
    id, code, name, category, COALESCE(description, '') AS description,
    calculation_type, default_amount, recurrence, taxability,
    include_in_gross, include_in_contribution_basis, is_active,
    created_at, updated_at
  FROM earning_types
`;

const assignmentSelect = `
  SELECT
    earning_assignments.id,
    earning_assignments.employee_id,
    employees.employee_number,
    employees.name AS employee_name,
    COALESCE(employees.department, '') AS department,
    COALESCE(employees.role_title, '') AS role_title,
    earning_assignments.earning_type_id,
    earning_types.code AS earning_code,
    earning_types.name AS earning_name,
    earning_types.category,
    earning_types.taxability,
    earning_assignments.amount,
    earning_assignments.effective_from,
    COALESCE(earning_assignments.effective_to, '') AS effective_to,
    COALESCE(earning_assignments.notes, '') AS notes,
    earning_assignments.is_active,
    earning_assignments.created_at,
    earning_assignments.updated_at
  FROM earning_assignments
  INNER JOIN employees ON employees.id = earning_assignments.employee_id
  INNER JOIN earning_types ON earning_types.id = earning_assignments.earning_type_id
`;

const transactionSelect = `
  SELECT
    earning_transactions.id,
    earning_transactions.employee_id,
    employees.employee_number,
    employees.name AS employee_name,
    COALESCE(employees.department, '') AS department,
    COALESCE(employees.role_title, '') AS role_title,
    earning_transactions.earning_type_id,
    earning_types.code AS earning_code,
    earning_types.name AS earning_name,
    earning_types.category,
    earning_types.taxability,
    earning_types.include_in_gross,
    earning_types.include_in_contribution_basis,
    COALESCE(earning_transactions.assignment_id, '') AS assignment_id,
    earning_transactions.transaction_date,
    COALESCE(earning_transactions.payroll_period_id, '') AS payroll_period_id,
    COALESCE(payroll_periods.name, '') AS payroll_period_name,
    earning_transactions.amount,
    COALESCE(earning_transactions.reference, '') AS reference,
    COALESCE(earning_transactions.notes, '') AS notes,
    earning_transactions.status,
    earning_transactions.created_at,
    earning_transactions.updated_at
  FROM earning_transactions
  INNER JOIN employees ON employees.id = earning_transactions.employee_id
  INNER JOIN earning_types ON earning_types.id = earning_transactions.earning_type_id
  LEFT JOIN payroll_periods ON payroll_periods.id = earning_transactions.payroll_period_id
`;

export async function getEarningTypes(filters?: unknown): Promise<{
  data: EarningTypeRecord[];
  total: number;
}> {
  const parsed = parseTypeFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (!parsed.include_inactive) clauses.push('is_active = 1');
  if (parsed.category !== 'all') {
    clauses.push('category = ?');
    values.push(parsed.category);
  }
  if (parsed.query) {
    clauses.push('(code LIKE ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE)');
    const value = `%${parsed.query}%`;
    values.push(value, value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await getDb().all<EarningTypeRecord[]>(
    `${earningTypeSelect} ${where} ORDER BY is_active DESC, category, name COLLATE NOCASE`,
    ...values,
  );
  return { data: rows, total: rows.length };
}

export async function getEarningType(id: string): Promise<EarningTypeRecord | null> {
  return (await getDb().get<EarningTypeRecord>(`${earningTypeSelect} WHERE id = ?`, id)) ?? null;
}

export async function createEarningType(payload: unknown): Promise<EarningTypeRecord> {
  const input = validateEarningTypeInput(payload);
  const id = `earning_type_${randomUUID()}`;
  try {
    await getDb().run(
      `INSERT INTO earning_types (
        id, code, name, category, description, calculation_type,
        default_amount, recurrence, taxability, include_in_gross,
        include_in_contribution_basis, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id, input.code, input.name, input.category, input.description || null,
      input.calculation_type, input.default_amount, input.recurrence,
      input.taxability, input.include_in_gross,
      input.include_in_contribution_basis, input.is_active,
    );
  } catch (error) {
    throw translateTypeError(error);
  }
  return requireEarningType(id);
}

export async function updateEarningType(id: string, payload: unknown): Promise<EarningTypeRecord> {
  await requireEarningType(id);
  const input = validateEarningTypeInput(payload);
  try {
    await getDb().run(
      `UPDATE earning_types SET
        code = ?, name = ?, category = ?, description = ?, calculation_type = ?,
        default_amount = ?, recurrence = ?, taxability = ?, include_in_gross = ?,
        include_in_contribution_basis = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`,
      input.code, input.name, input.category, input.description || null,
      input.calculation_type, input.default_amount, input.recurrence,
      input.taxability, input.include_in_gross,
      input.include_in_contribution_basis, input.is_active, id,
    );
  } catch (error) {
    throw translateTypeError(error);
  }
  return requireEarningType(id);
}

export async function setEarningTypeStatus(id: string, active: boolean): Promise<EarningTypeRecord> {
  await requireEarningType(id);
  await getDb().run(
    `UPDATE earning_types SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    active ? 1 : 0,
    id,
  );
  return requireEarningType(id);
}

export async function deleteEarningType(id: string): Promise<{ id: string; deactivated: boolean }> {
  await requireEarningType(id);
  const references = await getDb().get<{ count: number }>(
    `SELECT (
      (SELECT COUNT(*) FROM earning_assignments WHERE earning_type_id = ?)
      + (SELECT COUNT(*) FROM earning_transactions WHERE earning_type_id = ?)
    ) AS count`,
    id,
    id,
  );
  if ((references?.count ?? 0) > 0) {
    await setEarningTypeStatus(id, false);
    return { id, deactivated: true };
  }
  await getDb().run('DELETE FROM earning_types WHERE id = ?', id);
  return { id, deactivated: false };
}

export async function getEarningAssignments(filters?: unknown): Promise<{
  data: EarningAssignmentRecord[];
  total: number;
}> {
  const parsed = parseAssignmentFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (!parsed.include_inactive) clauses.push('earning_assignments.is_active = 1');
  if (parsed.employee_id) {
    clauses.push('earning_assignments.employee_id = ?');
    values.push(parsed.employee_id);
  }
  if (parsed.earning_type_id) {
    clauses.push('earning_assignments.earning_type_id = ?');
    values.push(parsed.earning_type_id);
  }
  if (parsed.as_of) {
    clauses.push('earning_assignments.effective_from <= ? AND (earning_assignments.effective_to IS NULL OR earning_assignments.effective_to = \'\' OR earning_assignments.effective_to >= ?)');
    values.push(parsed.as_of, parsed.as_of);
  }
  if (parsed.query) {
    clauses.push(`(
      employees.employee_number LIKE ? COLLATE NOCASE OR employees.name LIKE ? COLLATE NOCASE
      OR employees.department LIKE ? COLLATE NOCASE OR earning_types.code LIKE ? COLLATE NOCASE
      OR earning_types.name LIKE ? COLLATE NOCASE
    )`);
    const value = `%${parsed.query}%`;
    values.push(value, value, value, value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await getDb().all<EarningAssignmentRecord[]>(
    `${assignmentSelect} ${where}
     ORDER BY earning_assignments.is_active DESC, employees.name COLLATE NOCASE, earning_types.name COLLATE NOCASE`,
    ...values,
  );
  return { data: rows, total: rows.length };
}

export async function getEarningAssignment(id: string): Promise<EarningAssignmentRecord | null> {
  return (await getDb().get<EarningAssignmentRecord>(`${assignmentSelect} WHERE earning_assignments.id = ?`, id)) ?? null;
}

export async function createEarningAssignment(payload: unknown): Promise<EarningAssignmentRecord> {
  const input = validateAssignmentInput(payload);
  await validateAssignmentReferences(input);
  await ensureNoAssignmentOverlap(input);
  const id = `earning_assignment_${randomUUID()}`;
  await getDb().run(
    `INSERT INTO earning_assignments (
      id, employee_id, earning_type_id, amount, effective_from, effective_to,
      notes, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id, input.employee_id, input.earning_type_id, input.amount, input.effective_from,
    input.effective_to || null, input.notes || null, input.is_active,
  );
  return requireEarningAssignment(id);
}

export async function updateEarningAssignment(id: string, payload: unknown): Promise<EarningAssignmentRecord> {
  await requireEarningAssignment(id);
  const input = validateAssignmentInput(payload);
  await validateAssignmentReferences(input);
  await ensureNoAssignmentOverlap(input, id);
  await getDb().run(
    `UPDATE earning_assignments SET
      employee_id = ?, earning_type_id = ?, amount = ?, effective_from = ?,
      effective_to = ?, notes = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`,
    input.employee_id, input.earning_type_id, input.amount, input.effective_from,
    input.effective_to || null, input.notes || null, input.is_active, id,
  );
  return requireEarningAssignment(id);
}

export async function setEarningAssignmentStatus(id: string, active: boolean): Promise<EarningAssignmentRecord> {
  await requireEarningAssignment(id);
  await getDb().run(
    `UPDATE earning_assignments SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    active ? 1 : 0,
    id,
  );
  return requireEarningAssignment(id);
}

export async function deleteEarningAssignment(id: string): Promise<{ id: string; deactivated: boolean }> {
  await requireEarningAssignment(id);
  const reference = await getDb().get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM earning_transactions WHERE assignment_id = ?',
    id,
  );
  if ((reference?.count ?? 0) > 0) {
    await setEarningAssignmentStatus(id, false);
    return { id, deactivated: true };
  }
  await getDb().run('DELETE FROM earning_assignments WHERE id = ?', id);
  return { id, deactivated: false };
}

export async function getEarningTransactions(filters?: unknown): Promise<{
  data: EarningTransactionRecord[];
  total: number;
}> {
  const parsed = parseTransactionFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (parsed.employee_id) {
    clauses.push('earning_transactions.employee_id = ?');
    values.push(parsed.employee_id);
  }
  if (parsed.earning_type_id) {
    clauses.push('earning_transactions.earning_type_id = ?');
    values.push(parsed.earning_type_id);
  }
  if (parsed.category !== 'all') {
    clauses.push('earning_types.category = ?');
    values.push(parsed.category);
  }
  if (parsed.status !== 'all') {
    clauses.push('earning_transactions.status = ?');
    values.push(parsed.status);
  }
  if (parsed.date_from) {
    clauses.push('earning_transactions.transaction_date >= ?');
    values.push(parsed.date_from);
  }
  if (parsed.date_to) {
    clauses.push('earning_transactions.transaction_date <= ?');
    values.push(parsed.date_to);
  }
  if (parsed.query) {
    clauses.push(`(
      employees.employee_number LIKE ? COLLATE NOCASE OR employees.name LIKE ? COLLATE NOCASE
      OR employees.department LIKE ? COLLATE NOCASE OR earning_types.code LIKE ? COLLATE NOCASE
      OR earning_types.name LIKE ? COLLATE NOCASE OR earning_transactions.reference LIKE ? COLLATE NOCASE
    )`);
    const value = `%${parsed.query}%`;
    values.push(value, value, value, value, value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await getDb().all<EarningTransactionRecord[]>(
    `${transactionSelect} ${where}
     ORDER BY earning_transactions.transaction_date DESC, earning_transactions.created_at DESC`,
    ...values,
  );
  return { data: rows, total: rows.length };
}

export async function getEarningTransaction(id: string): Promise<EarningTransactionRecord | null> {
  return (await getDb().get<EarningTransactionRecord>(`${transactionSelect} WHERE earning_transactions.id = ?`, id)) ?? null;
}

export async function getEarningSummary(filters?: unknown): Promise<{
  total: number;
  draft: number;
  approved: number;
  cancelled: number;
  taxable: number;
  non_taxable: number;
  recurring_assignments: number;
}> {
  const parsed = parseTransactionFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (parsed.employee_id) { clauses.push('earning_transactions.employee_id = ?'); values.push(parsed.employee_id); }
  if (parsed.earning_type_id) { clauses.push('earning_transactions.earning_type_id = ?'); values.push(parsed.earning_type_id); }
  if (parsed.category !== 'all') { clauses.push('earning_types.category = ?'); values.push(parsed.category); }
  if (parsed.date_from) { clauses.push('earning_transactions.transaction_date >= ?'); values.push(parsed.date_from); }
  if (parsed.date_to) { clauses.push('earning_transactions.transaction_date <= ?'); values.push(parsed.date_to); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const row = await getDb().get<{
    total: number; draft: number; approved: number; cancelled: number;
    taxable: number; non_taxable: number;
  }>(
    `SELECT
      COALESCE(SUM(CASE WHEN earning_transactions.status <> 'cancelled' THEN earning_transactions.amount ELSE 0 END), 0) AS total,
      COALESCE(SUM(CASE WHEN earning_transactions.status = 'draft' THEN earning_transactions.amount ELSE 0 END), 0) AS draft,
      COALESCE(SUM(CASE WHEN earning_transactions.status = 'approved' THEN earning_transactions.amount ELSE 0 END), 0) AS approved,
      COALESCE(SUM(CASE WHEN earning_transactions.status = 'cancelled' THEN earning_transactions.amount ELSE 0 END), 0) AS cancelled,
      COALESCE(SUM(CASE WHEN earning_transactions.status = 'approved' AND earning_types.taxability = 'taxable' THEN earning_transactions.amount ELSE 0 END), 0) AS taxable,
      COALESCE(SUM(CASE WHEN earning_transactions.status = 'approved' AND earning_types.taxability = 'non-taxable' THEN earning_transactions.amount ELSE 0 END), 0) AS non_taxable
     FROM earning_transactions
     INNER JOIN earning_types ON earning_types.id = earning_transactions.earning_type_id
     ${where}`,
    ...values,
  );
  const today = new Date().toISOString().slice(0, 10);
  const recurring = await getDb().get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM earning_assignments
      INNER JOIN earning_types ON earning_types.id = earning_assignments.earning_type_id
     WHERE earning_assignments.is_active = 1 AND earning_types.recurrence = 'recurring'
       AND earning_assignments.effective_from <= ?
       AND (earning_assignments.effective_to IS NULL OR earning_assignments.effective_to = '' OR earning_assignments.effective_to >= ?)`,
    today,
    today,
  );
  return {
    total: row?.total ?? 0,
    draft: row?.draft ?? 0,
    approved: row?.approved ?? 0,
    cancelled: row?.cancelled ?? 0,
    taxable: row?.taxable ?? 0,
    non_taxable: row?.non_taxable ?? 0,
    recurring_assignments: recurring?.count ?? 0,
  };
}

export async function createEarningTransaction(payload: unknown): Promise<EarningTransactionRecord> {
  const input = validateTransactionInput(payload);
  await validateTransactionReferences(input);
  await ensureNoDuplicateTransaction(input);
  const id = `earning_transaction_${randomUUID()}`;
  await getDb().run(
    `INSERT INTO earning_transactions (
      id, employee_id, earning_type_id, assignment_id, transaction_date,
      payroll_period_id, amount, reference, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id, input.employee_id, input.earning_type_id, input.assignment_id || null,
    input.transaction_date, input.payroll_period_id || null, input.amount,
    input.reference || null, input.notes || null, input.status,
  );
  return requireEarningTransaction(id);
}

export async function updateEarningTransaction(id: string, payload: unknown): Promise<EarningTransactionRecord> {
  const current = await requireEarningTransaction(id);
  if (current.status === 'cancelled') throw new Error('Cancelled earning transactions cannot be edited.');
  const input = validateTransactionInput(payload);
  await validateTransactionReferences(input);
  await ensureNoDuplicateTransaction(input, id);
  await getDb().run(
    `UPDATE earning_transactions SET
      employee_id = ?, earning_type_id = ?, assignment_id = ?, transaction_date = ?,
      payroll_period_id = ?, amount = ?, reference = ?, notes = ?, status = ?,
      updated_at = datetime('now') WHERE id = ?`,
    input.employee_id, input.earning_type_id, input.assignment_id || null,
    input.transaction_date, input.payroll_period_id || null, input.amount,
    input.reference || null, input.notes || null, input.status, id,
  );
  return requireEarningTransaction(id);
}

export async function setEarningTransactionStatus(
  id: string,
  status: EarningTransactionStatus,
): Promise<EarningTransactionRecord> {
  const current = await requireEarningTransaction(id);
  if (current.status === 'cancelled' && status !== 'cancelled') {
    throw new Error('Cancelled earning transactions cannot be reopened.');
  }
  await getDb().run(
    `UPDATE earning_transactions SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    status,
    id,
  );
  return requireEarningTransaction(id);
}

export async function deleteEarningTransaction(id: string): Promise<{ id: string; cancelled: boolean }> {
  const current = await requireEarningTransaction(id);
  if (current.status === 'approved') {
    await setEarningTransactionStatus(id, 'cancelled');
    return { id, cancelled: true };
  }
  await getDb().run('DELETE FROM earning_transactions WHERE id = ?', id);
  return { id, cancelled: false };
}

async function requireEarningType(id: string): Promise<EarningTypeRecord> {
  const row = await getEarningType(id);
  if (!row) throw new Error('Earning type was not found.');
  return row;
}
async function requireEarningAssignment(id: string): Promise<EarningAssignmentRecord> {
  const row = await getEarningAssignment(id);
  if (!row) throw new Error('Earning assignment was not found.');
  return row;
}
async function requireEarningTransaction(id: string): Promise<EarningTransactionRecord> {
  const row = await getEarningTransaction(id);
  if (!row) throw new Error('Earning transaction was not found.');
  return row;
}

async function validateAssignmentReferences(input: EarningAssignmentInput): Promise<void> {
  const employee = await getDb().get<{ id: string; is_active: number }>('SELECT id, is_active FROM employees WHERE id = ?', input.employee_id);
  if (!employee) throw new Error('Selected employee was not found.');
  const type = await requireEarningType(input.earning_type_id);
  if (!type.is_active && input.is_active) throw new Error('An inactive earning type cannot be assigned as active.');
}

async function ensureNoAssignmentOverlap(input: EarningAssignmentInput, excludeId = ''): Promise<void> {
  if (!input.is_active) return;
  const overlap = await getDb().get<{ id: string }>(
    `SELECT id FROM earning_assignments
      WHERE employee_id = ? AND earning_type_id = ? AND is_active = 1 AND id <> ?
        AND effective_from <= COALESCE(NULLIF(?, ''), '9999-12-31')
        AND COALESCE(NULLIF(effective_to, ''), '9999-12-31') >= ?
      LIMIT 1`,
    input.employee_id,
    input.earning_type_id,
    excludeId,
    input.effective_to,
    input.effective_from,
  );
  if (overlap) throw new Error('This employee already has an overlapping active assignment for the selected earning type.');
}

async function validateTransactionReferences(input: EarningTransactionInput): Promise<void> {
  const employee = await getDb().get<{ id: string }>('SELECT id FROM employees WHERE id = ?', input.employee_id);
  if (!employee) throw new Error('Selected employee was not found.');
  await requireEarningType(input.earning_type_id);
  if (input.assignment_id) {
    const assignment = await requireEarningAssignment(input.assignment_id);
    if (assignment.employee_id !== input.employee_id || assignment.earning_type_id !== input.earning_type_id) {
      throw new Error('The selected assignment does not match the employee and earning type.');
    }
  }
  if (input.payroll_period_id) {
    const period = await getDb().get<{ id: string }>('SELECT id FROM payroll_periods WHERE id = ?', input.payroll_period_id);
    if (!period) throw new Error('Selected payroll period was not found.');
  }
}

async function ensureNoDuplicateTransaction(input: EarningTransactionInput, excludeId = ''): Promise<void> {
  if (!input.reference) return;
  const duplicate = await getDb().get<{ id: string }>(
    `SELECT id FROM earning_transactions
      WHERE employee_id = ? AND earning_type_id = ? AND transaction_date = ?
        AND reference = ? COLLATE NOCASE AND status <> 'cancelled' AND id <> ? LIMIT 1`,
    input.employee_id,
    input.earning_type_id,
    input.transaction_date,
    input.reference,
    excludeId,
  );
  if (duplicate) throw new Error('A non-cancelled earning transaction with the same employee, type, date, and reference already exists.');
}

function validateEarningTypeInput(payload: unknown): EarningTypeInput {
  const data = requireRecord(payload, 'earning type');
  const code = requiredText(data.code, 'Code').toUpperCase();
  const name = requiredText(data.name, 'Name');
  const category = enumValue(data.category, ['allowance', 'bonus', 'incentive', 'commission', 'reimbursement', 'adjustment', 'other'] as const, 'category');
  const calculation_type = enumValue(data.calculation_type, ['fixed', 'variable'] as const, 'calculation type');
  const recurrence = enumValue(data.recurrence, ['recurring', 'one-time'] as const, 'recurrence');
  const taxability = enumValue(data.taxability, ['taxable', 'non-taxable'] as const, 'taxability');
  return {
    code, name, category,
    description: optionalText(data.description),
    calculation_type,
    default_amount: nonNegativeNumber(data.default_amount, 'Default amount'),
    recurrence,
    taxability,
    include_in_gross: booleanNumber(data.include_in_gross, true),
    include_in_contribution_basis: booleanNumber(data.include_in_contribution_basis, false),
    is_active: booleanNumber(data.is_active, true),
  };
}

function validateAssignmentInput(payload: unknown): EarningAssignmentInput {
  const data = requireRecord(payload, 'earning assignment');
  const effective_from = validDate(data.effective_from, 'Effective-from date');
  const effective_to = optionalDate(data.effective_to, 'Effective-to date');
  if (effective_to && effective_to < effective_from) throw new Error('Effective-to date cannot be before the effective-from date.');
  return {
    employee_id: requiredText(data.employee_id, 'Employee'),
    earning_type_id: requiredText(data.earning_type_id, 'Earning type'),
    amount: nonNegativeNumber(data.amount, 'Amount'),
    effective_from,
    effective_to,
    notes: optionalText(data.notes),
    is_active: booleanNumber(data.is_active, true),
  };
}

function validateTransactionInput(payload: unknown): EarningTransactionInput {
  const data = requireRecord(payload, 'earning transaction');
  return {
    employee_id: requiredText(data.employee_id, 'Employee'),
    earning_type_id: requiredText(data.earning_type_id, 'Earning type'),
    assignment_id: optionalText(data.assignment_id),
    transaction_date: validDate(data.transaction_date, 'Transaction date'),
    payroll_period_id: optionalText(data.payroll_period_id),
    amount: positiveNumber(data.amount, 'Amount'),
    reference: optionalText(data.reference),
    notes: optionalText(data.notes),
    status: enumValue(data.status, ['draft', 'approved', 'cancelled'] as const, 'status'),
  };
}

function parseTypeFilters(filters: unknown): { query: string; category: 'all' | EarningCategory; include_inactive: boolean } {
  const data = isRecord(filters) ? filters : {};
  const rawCategory = optionalText(data.category);
  const categories = ['allowance', 'bonus', 'incentive', 'commission', 'reimbursement', 'adjustment', 'other'];
  return {
    query: optionalText(data.query),
    category: categories.includes(rawCategory) ? rawCategory as EarningCategory : 'all',
    include_inactive: data.include_inactive === true,
  };
}
function parseAssignmentFilters(filters: unknown): { query: string; employee_id: string; earning_type_id: string; as_of: string; include_inactive: boolean } {
  const data = isRecord(filters) ? filters : {};
  return {
    query: optionalText(data.query), employee_id: optionalText(data.employee_id),
    earning_type_id: optionalText(data.earning_type_id),
    as_of: optionalDate(data.as_of, 'As-of date'), include_inactive: data.include_inactive === true,
  };
}
function parseTransactionFilters(filters: unknown): {
  query: string; employee_id: string; earning_type_id: string; category: 'all' | EarningCategory;
  status: 'all' | EarningTransactionStatus; date_from: string; date_to: string;
} {
  const data = isRecord(filters) ? filters : {};
  const rawCategory = optionalText(data.category);
  const rawStatus = optionalText(data.status);
  const categories = ['allowance', 'bonus', 'incentive', 'commission', 'reimbursement', 'adjustment', 'other'];
  const statuses = ['draft', 'approved', 'cancelled'];
  return {
    query: optionalText(data.query), employee_id: optionalText(data.employee_id),
    earning_type_id: optionalText(data.earning_type_id),
    category: categories.includes(rawCategory) ? rawCategory as EarningCategory : 'all',
    status: statuses.includes(rawStatus) ? rawStatus as EarningTransactionStatus : 'all',
    date_from: optionalDate(data.date_from, 'From date'), date_to: optionalDate(data.date_to, 'To date'),
  };
}

function translateTypeError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('earning_types.code')) return new Error('Earning type code already exists.');
  if (message.includes('earning_types.name')) return new Error('Earning type name already exists.');
  return error instanceof Error ? error : new Error(message);
}
function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`A valid ${label} payload is required.`);
  return value;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function requiredText(value: unknown, label: string): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`${label} is required.`);
  return text;
}
function optionalText(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function booleanNumber(value: unknown, fallback: boolean): number {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (value === 1 || value === '1') return 1;
  if (value === 0 || value === '0') return 0;
  return fallback ? 1 : 0;
}
function nonNegativeNumber(value: unknown, label: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be zero or greater.`);
  return Math.round(number * 100) / 100;
}
function positiveNumber(value: unknown, label: string): number {
  const number = nonNegativeNumber(value, label);
  if (number <= 0) throw new Error(`${label} must be greater than zero.`);
  return number;
}
function validDate(value: unknown, label: string): string {
  const text = requiredText(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00`))) throw new Error(`${label} must be a valid date.`);
  return text;
}
function optionalDate(value: unknown, label: string): string {
  const text = optionalText(value);
  return text ? validDate(text, label) : '';
}
function enumValue<T extends readonly string[]>(value: unknown, options: T, label: string): T[number] {
  const text = optionalText(value);
  if (!options.includes(text)) throw new Error(`Invalid ${label}.`);
  return text as T[number];
}
