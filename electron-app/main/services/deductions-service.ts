import { randomUUID } from 'node:crypto';
import { getDb } from '../db';

export type DeductionCategory =
  | 'loan'
  | 'statutory'
  | 'company'
  | 'advance'
  | 'penalty'
  | 'insurance'
  | 'cooperative'
  | 'other';
export type DeductionCalculationType = 'fixed' | 'percentage';
export type DeductionRecurrence = 'recurring' | 'one-time';
export type DeductionTransactionStatus = 'draft' | 'approved' | 'cancelled';
export type LoanStatus = 'draft' | 'active' | 'suspended' | 'paid' | 'cancelled';
export type DeductionFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export interface DeductionTypeRecord {
  id: string;
  code: string;
  name: string;
  category: DeductionCategory;
  description: string;
  calculation_type: DeductionCalculationType;
  default_amount: number;
  default_percentage: number;
  recurrence: DeductionRecurrence;
  priority: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DeductionAssignmentRecord {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  deduction_type_id: string;
  deduction_code: string;
  deduction_name: string;
  category: DeductionCategory;
  calculation_type: DeductionCalculationType;
  amount: number;
  percentage: number;
  effective_from: string;
  effective_to: string;
  notes: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface LoanInstallmentRecord {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: 'scheduled' | 'partial' | 'paid' | 'skipped';
  transaction_id: string;
  paid_at: string;
  notes: string;
}

export interface EmployeeLoanRecord {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  deduction_type_id: string;
  deduction_code: string;
  deduction_name: string;
  loan_number: string;
  principal_amount: number;
  interest_rate: number;
  total_payable: number;
  loan_date: string;
  first_deduction_date: string;
  number_of_installments: number;
  deduction_frequency: DeductionFrequency;
  installment_amount: number;
  outstanding_balance: number;
  status: LoanStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  installments?: LoanInstallmentRecord[];
}

export interface DeductionTransactionRecord {
  id: string;
  employee_id: string;
  employee_number: string;
  employee_name: string;
  department: string;
  role_title: string;
  deduction_type_id: string;
  deduction_code: string;
  deduction_name: string;
  category: DeductionCategory;
  assignment_id: string;
  loan_id: string;
  loan_number: string;
  transaction_date: string;
  payroll_period_id: string;
  payroll_period_name: string;
  amount: number;
  reference: string;
  notes: string;
  status: DeductionTransactionStatus;
  created_at: string;
  updated_at: string;
}

interface DeductionTypeInput {
  code: string;
  name: string;
  category: DeductionCategory;
  description: string;
  calculation_type: DeductionCalculationType;
  default_amount: number;
  default_percentage: number;
  recurrence: DeductionRecurrence;
  priority: number;
  is_active: number;
}

interface DeductionAssignmentInput {
  employee_id: string;
  deduction_type_id: string;
  amount: number;
  percentage: number;
  effective_from: string;
  effective_to: string;
  notes: string;
  is_active: number;
}

interface LoanInput {
  employee_id: string;
  deduction_type_id: string;
  loan_number: string;
  principal_amount: number;
  interest_rate: number;
  loan_date: string;
  first_deduction_date: string;
  number_of_installments: number;
  deduction_frequency: DeductionFrequency;
  status: LoanStatus;
  notes: string;
}

interface DeductionTransactionInput {
  employee_id: string;
  deduction_type_id: string;
  assignment_id: string;
  loan_id: string;
  transaction_date: string;
  payroll_period_id: string;
  amount: number;
  reference: string;
  notes: string;
  status: DeductionTransactionStatus;
}

const typeSelect = `
  SELECT id, code, name, category, COALESCE(description, '') AS description,
    calculation_type, default_amount, default_percentage, recurrence,
    priority, is_active, created_at, updated_at
  FROM deduction_types
`;

const assignmentSelect = `
  SELECT deduction_assignments.id, deduction_assignments.employee_id,
    employees.employee_number, employees.name AS employee_name,
    COALESCE(employees.department, '') AS department,
    COALESCE(employees.role_title, '') AS role_title,
    deduction_assignments.deduction_type_id,
    deduction_types.code AS deduction_code,
    deduction_types.name AS deduction_name,
    deduction_types.category,
    deduction_types.calculation_type,
    deduction_assignments.amount,
    deduction_assignments.percentage,
    deduction_assignments.effective_from,
    COALESCE(deduction_assignments.effective_to, '') AS effective_to,
    COALESCE(deduction_assignments.notes, '') AS notes,
    deduction_assignments.is_active,
    deduction_assignments.created_at,
    deduction_assignments.updated_at
  FROM deduction_assignments
  INNER JOIN employees ON employees.id = deduction_assignments.employee_id
  INNER JOIN deduction_types ON deduction_types.id = deduction_assignments.deduction_type_id
`;

const loanSelect = `
  SELECT employee_loans.id, employee_loans.employee_id,
    employees.employee_number, employees.name AS employee_name,
    COALESCE(employees.department, '') AS department,
    COALESCE(employees.role_title, '') AS role_title,
    employee_loans.deduction_type_id,
    deduction_types.code AS deduction_code,
    deduction_types.name AS deduction_name,
    employee_loans.loan_number, employee_loans.principal_amount,
    employee_loans.interest_rate, employee_loans.total_payable,
    employee_loans.loan_date, employee_loans.first_deduction_date,
    employee_loans.number_of_installments,
    employee_loans.deduction_frequency,
    employee_loans.installment_amount,
    employee_loans.outstanding_balance,
    employee_loans.status,
    COALESCE(employee_loans.notes, '') AS notes,
    employee_loans.created_at, employee_loans.updated_at
  FROM employee_loans
  INNER JOIN employees ON employees.id = employee_loans.employee_id
  INNER JOIN deduction_types ON deduction_types.id = employee_loans.deduction_type_id
`;

const transactionSelect = `
  SELECT deduction_transactions.id, deduction_transactions.employee_id,
    employees.employee_number, employees.name AS employee_name,
    COALESCE(employees.department, '') AS department,
    COALESCE(employees.role_title, '') AS role_title,
    deduction_transactions.deduction_type_id,
    deduction_types.code AS deduction_code,
    deduction_types.name AS deduction_name,
    deduction_types.category,
    COALESCE(deduction_transactions.assignment_id, '') AS assignment_id,
    COALESCE(deduction_transactions.loan_id, '') AS loan_id,
    COALESCE(employee_loans.loan_number, '') AS loan_number,
    deduction_transactions.transaction_date,
    COALESCE(deduction_transactions.payroll_period_id, '') AS payroll_period_id,
    COALESCE(payroll_periods.name, '') AS payroll_period_name,
    deduction_transactions.amount,
    COALESCE(deduction_transactions.reference, '') AS reference,
    COALESCE(deduction_transactions.notes, '') AS notes,
    deduction_transactions.status,
    deduction_transactions.created_at,
    deduction_transactions.updated_at
  FROM deduction_transactions
  INNER JOIN employees ON employees.id = deduction_transactions.employee_id
  INNER JOIN deduction_types ON deduction_types.id = deduction_transactions.deduction_type_id
  LEFT JOIN employee_loans ON employee_loans.id = deduction_transactions.loan_id
  LEFT JOIN payroll_periods ON payroll_periods.id = deduction_transactions.payroll_period_id
`;

export async function getDeductionTypes(filters?: unknown) {
  const parsed = parseTypeFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (!parsed.include_inactive) clauses.push('is_active = 1');
  if (parsed.category !== 'all') { clauses.push('category = ?'); values.push(parsed.category); }
  if (parsed.query) {
    clauses.push('(code LIKE ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE)');
    const value = `%${parsed.query}%`; values.push(value, value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const data = await getDb().all<DeductionTypeRecord[]>(
    `${typeSelect} ${where} ORDER BY is_active DESC, priority, category, name COLLATE NOCASE`,
    ...values,
  );
  return { data, total: data.length };
}

export async function getDeductionType(id: string) {
  return (await getDb().get<DeductionTypeRecord>(`${typeSelect} WHERE id = ?`, id)) ?? null;
}

export async function createDeductionType(payload: unknown) {
  const input = validateTypeInput(payload);
  const id = `deduction_type_${randomUUID()}`;
  try {
    await getDb().run(
      `INSERT INTO deduction_types (
        id, code, name, category, description, calculation_type,
        default_amount, default_percentage, recurrence, priority,
        is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id, input.code, input.name, input.category, input.description || null,
      input.calculation_type, input.default_amount, input.default_percentage,
      input.recurrence, input.priority, input.is_active,
    );
  } catch (error) { throw translateTypeError(error); }
  return requireType(id);
}

export async function updateDeductionType(id: string, payload: unknown) {
  await requireType(id);
  const input = validateTypeInput(payload);
  try {
    await getDb().run(
      `UPDATE deduction_types SET code = ?, name = ?, category = ?, description = ?,
        calculation_type = ?, default_amount = ?, default_percentage = ?,
        recurrence = ?, priority = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`,
      input.code, input.name, input.category, input.description || null,
      input.calculation_type, input.default_amount, input.default_percentage,
      input.recurrence, input.priority, input.is_active, id,
    );
  } catch (error) { throw translateTypeError(error); }
  return requireType(id);
}

export async function setDeductionTypeStatus(id: string, active: boolean) {
  await requireType(id);
  await getDb().run('UPDATE deduction_types SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?', active ? 1 : 0, id);
  return requireType(id);
}

export async function deleteDeductionType(id: string) {
  await requireType(id);
  const refs = await getDb().get<{ count: number }>(
    `SELECT ((SELECT COUNT(*) FROM deduction_assignments WHERE deduction_type_id = ?)
      + (SELECT COUNT(*) FROM employee_loans WHERE deduction_type_id = ?)
      + (SELECT COUNT(*) FROM deduction_transactions WHERE deduction_type_id = ?)) AS count`, id, id, id,
  );
  if ((refs?.count ?? 0) > 0) {
    await setDeductionTypeStatus(id, false);
    return { id, deactivated: true };
  }
  await getDb().run('DELETE FROM deduction_types WHERE id = ?', id);
  return { id, deactivated: false };
}

export async function getDeductionAssignments(filters?: unknown) {
  const parsed = parseAssignmentFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (!parsed.include_inactive) clauses.push('deduction_assignments.is_active = 1');
  if (parsed.employee_id) { clauses.push('deduction_assignments.employee_id = ?'); values.push(parsed.employee_id); }
  if (parsed.deduction_type_id) { clauses.push('deduction_assignments.deduction_type_id = ?'); values.push(parsed.deduction_type_id); }
  if (parsed.as_of) {
    clauses.push(`deduction_assignments.effective_from <= ? AND (
      deduction_assignments.effective_to IS NULL OR deduction_assignments.effective_to = '' OR deduction_assignments.effective_to >= ?)`);
    values.push(parsed.as_of, parsed.as_of);
  }
  if (parsed.query) {
    clauses.push(`(employees.employee_number LIKE ? COLLATE NOCASE OR employees.name LIKE ? COLLATE NOCASE
      OR employees.department LIKE ? COLLATE NOCASE OR deduction_types.code LIKE ? COLLATE NOCASE
      OR deduction_types.name LIKE ? COLLATE NOCASE)`);
    const value = `%${parsed.query}%`; values.push(value, value, value, value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const data = await getDb().all<DeductionAssignmentRecord[]>(
    `${assignmentSelect} ${where} ORDER BY deduction_assignments.is_active DESC, employees.name COLLATE NOCASE, deduction_types.priority`, ...values,
  );
  return { data, total: data.length };
}

export async function getDeductionAssignment(id: string) {
  return (await getDb().get<DeductionAssignmentRecord>(`${assignmentSelect} WHERE deduction_assignments.id = ?`, id)) ?? null;
}

export async function createDeductionAssignment(payload: unknown) {
  const input = validateAssignmentInput(payload);
  await validateAssignmentReferences(input);
  await ensureNoAssignmentOverlap(input);
  const id = `deduction_assignment_${randomUUID()}`;
  await getDb().run(
    `INSERT INTO deduction_assignments (
      id, employee_id, deduction_type_id, amount, percentage, effective_from,
      effective_to, notes, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id, input.employee_id, input.deduction_type_id, input.amount, input.percentage,
    input.effective_from, input.effective_to || null, input.notes || null, input.is_active,
  );
  return requireAssignment(id);
}

export async function updateDeductionAssignment(id: string, payload: unknown) {
  await requireAssignment(id);
  const input = validateAssignmentInput(payload);
  await validateAssignmentReferences(input);
  await ensureNoAssignmentOverlap(input, id);
  await getDb().run(
    `UPDATE deduction_assignments SET employee_id = ?, deduction_type_id = ?, amount = ?,
      percentage = ?, effective_from = ?, effective_to = ?, notes = ?, is_active = ?,
      updated_at = datetime('now') WHERE id = ?`,
    input.employee_id, input.deduction_type_id, input.amount, input.percentage,
    input.effective_from, input.effective_to || null, input.notes || null, input.is_active, id,
  );
  return requireAssignment(id);
}

export async function setDeductionAssignmentStatus(id: string, active: boolean) {
  await requireAssignment(id);
  await getDb().run('UPDATE deduction_assignments SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?', active ? 1 : 0, id);
  return requireAssignment(id);
}

export async function deleteDeductionAssignment(id: string) {
  await requireAssignment(id);
  const refs = await getDb().get<{ count: number }>('SELECT COUNT(*) AS count FROM deduction_transactions WHERE assignment_id = ?', id);
  if ((refs?.count ?? 0) > 0) {
    await setDeductionAssignmentStatus(id, false);
    return { id, deactivated: true };
  }
  await getDb().run('DELETE FROM deduction_assignments WHERE id = ?', id);
  return { id, deactivated: false };
}

export async function getEmployeeLoans(filters?: unknown) {
  const parsed = parseLoanFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (parsed.employee_id) { clauses.push('employee_loans.employee_id = ?'); values.push(parsed.employee_id); }
  if (parsed.status !== 'all') { clauses.push('employee_loans.status = ?'); values.push(parsed.status); }
  if (parsed.query) {
    clauses.push(`(employees.employee_number LIKE ? COLLATE NOCASE OR employees.name LIKE ? COLLATE NOCASE
      OR employee_loans.loan_number LIKE ? COLLATE NOCASE OR deduction_types.name LIKE ? COLLATE NOCASE)`);
    const value = `%${parsed.query}%`; values.push(value, value, value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const data = await getDb().all<EmployeeLoanRecord[]>(
    `${loanSelect} ${where} ORDER BY CASE employee_loans.status WHEN 'active' THEN 0 WHEN 'suspended' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
      employee_loans.first_deduction_date, employees.name COLLATE NOCASE`, ...values,
  );
  return { data, total: data.length };
}

export async function getEmployeeLoan(id: string): Promise<EmployeeLoanRecord | null> {
  const loan = (await getDb().get<EmployeeLoanRecord>(`${loanSelect} WHERE employee_loans.id = ?`, id)) ?? null;
  if (!loan) return null;
  loan.installments = await getDb().all<LoanInstallmentRecord[]>(
    `SELECT id, loan_id, installment_number, due_date, amount_due, amount_paid, status,
      COALESCE(transaction_id, '') AS transaction_id, COALESCE(paid_at, '') AS paid_at,
      COALESCE(notes, '') AS notes
     FROM loan_installments WHERE loan_id = ? ORDER BY installment_number`, id,
  );
  return loan;
}

export async function getLoanSummary(filters?: unknown) {
  const parsed = parseLoanFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (parsed.employee_id) { clauses.push('employee_id = ?'); values.push(parsed.employee_id); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const row = await getDb().get<{
    total_principal: number; total_payable: number; outstanding: number;
    active_count: number; suspended_count: number; paid_count: number;
  }>(`SELECT COALESCE(SUM(principal_amount), 0) AS total_principal,
      COALESCE(SUM(total_payable), 0) AS total_payable,
      COALESCE(SUM(CASE WHEN status IN ('active','suspended','draft') THEN outstanding_balance ELSE 0 END), 0) AS outstanding,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
      SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS suspended_count,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count
    FROM employee_loans ${where}`, ...values);
  return {
    total_principal: row?.total_principal ?? 0,
    total_payable: row?.total_payable ?? 0,
    outstanding: row?.outstanding ?? 0,
    active_count: row?.active_count ?? 0,
    suspended_count: row?.suspended_count ?? 0,
    paid_count: row?.paid_count ?? 0,
  };
}

export async function createEmployeeLoan(payload: unknown) {
  const input = validateLoanInput(payload);
  await validateLoanReferences(input);
  const totalPayable = roundMoney(input.principal_amount * (1 + input.interest_rate / 100));
  const installmentAmount = roundMoney(totalPayable / input.number_of_installments);
  const id = `loan_${randomUUID()}`;
  try {
    await getDb().run(
      `INSERT INTO employee_loans (
        id, employee_id, deduction_type_id, loan_number, principal_amount,
        interest_rate, total_payable, loan_date, first_deduction_date,
        number_of_installments, deduction_frequency, installment_amount,
        outstanding_balance, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id, input.employee_id, input.deduction_type_id, input.loan_number,
      input.principal_amount, input.interest_rate, totalPayable, input.loan_date,
      input.first_deduction_date, input.number_of_installments,
      input.deduction_frequency, installmentAmount, totalPayable,
      input.status, input.notes || null,
    );
  } catch (error) { throw translateLoanError(error); }
  await generateLoanSchedule(id);
  return requireLoan(id);
}

export async function updateEmployeeLoan(id: string, payload: unknown) {
  const existing = await requireLoan(id);
  const paid = await getDb().get<{ count: number }>('SELECT COUNT(*) AS count FROM loan_installments WHERE loan_id = ? AND amount_paid > 0', id);
  if ((paid?.count ?? 0) > 0) throw new Error('A loan with recorded payments cannot be restructured from this form.');
  const input = validateLoanInput(payload);
  await validateLoanReferences(input);
  const totalPayable = roundMoney(input.principal_amount * (1 + input.interest_rate / 100));
  const installmentAmount = roundMoney(totalPayable / input.number_of_installments);
  try {
    await getDb().run(
      `UPDATE employee_loans SET employee_id = ?, deduction_type_id = ?, loan_number = ?,
        principal_amount = ?, interest_rate = ?, total_payable = ?, loan_date = ?,
        first_deduction_date = ?, number_of_installments = ?, deduction_frequency = ?,
        installment_amount = ?, outstanding_balance = ?, status = ?, notes = ?,
        updated_at = datetime('now') WHERE id = ?`,
      input.employee_id, input.deduction_type_id, input.loan_number,
      input.principal_amount, input.interest_rate, totalPayable, input.loan_date,
      input.first_deduction_date, input.number_of_installments, input.deduction_frequency,
      installmentAmount, totalPayable, input.status, input.notes || null, id,
    );
  } catch (error) { throw translateLoanError(error); }
  await getDb().run('DELETE FROM loan_installments WHERE loan_id = ?', id);
  await generateLoanSchedule(id);
  void existing;
  return requireLoan(id);
}

export async function setEmployeeLoanStatus(id: string, status: LoanStatus) {
  const loan = await requireLoan(id);
  if (loan.status === 'paid' && status !== 'paid') throw new Error('A paid loan cannot be reopened.');
  if (status === 'paid' && loan.outstanding_balance > 0.005) throw new Error('The outstanding balance must be zero before marking the loan paid.');
  await getDb().run('UPDATE employee_loans SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', status, id);
  return requireLoan(id);
}

export async function deleteEmployeeLoan(id: string) {
  const loan = await requireLoan(id);
  const payments = await getDb().get<{ count: number }>('SELECT COUNT(*) AS count FROM deduction_transactions WHERE loan_id = ? AND status = \'approved\'', id);
  if ((payments?.count ?? 0) > 0) {
    if (loan.status !== 'cancelled') await setEmployeeLoanStatus(id, 'cancelled');
    return { id, cancelled: true };
  }
  await getDb().run('DELETE FROM employee_loans WHERE id = ?', id);
  return { id, cancelled: false };
}

export async function recordLoanPayment(id: string, payload: unknown) {
  const loan = await requireLoan(id);
  if (!['active', 'suspended'].includes(loan.status)) throw new Error('Only active or suspended loans can receive payments.');
  const value = asRecord(payload);
  const amount = positiveNumber(value.amount, 'Payment amount');
  if (amount > loan.outstanding_balance + 0.005) throw new Error('Payment cannot exceed the outstanding balance.');
  const transaction = await createDeductionTransaction({
    employee_id: loan.employee_id,
    deduction_type_id: loan.deduction_type_id,
    assignment_id: '',
    loan_id: loan.id,
    transaction_date: requiredDate(value.transaction_date, 'Payment date'),
    payroll_period_id: optionalString(value.payroll_period_id),
    amount,
    reference: optionalString(value.reference),
    notes: optionalString(value.notes),
    status: 'approved',
  });
  return { loan: await requireLoan(id), transaction };
}

export async function getDeductionTransactions(filters?: unknown) {
  const parsed = parseTransactionFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (parsed.employee_id) { clauses.push('deduction_transactions.employee_id = ?'); values.push(parsed.employee_id); }
  if (parsed.deduction_type_id) { clauses.push('deduction_transactions.deduction_type_id = ?'); values.push(parsed.deduction_type_id); }
  if (parsed.category !== 'all') { clauses.push('deduction_types.category = ?'); values.push(parsed.category); }
  if (parsed.status !== 'all') { clauses.push('deduction_transactions.status = ?'); values.push(parsed.status); }
  if (parsed.date_from) { clauses.push('deduction_transactions.transaction_date >= ?'); values.push(parsed.date_from); }
  if (parsed.date_to) { clauses.push('deduction_transactions.transaction_date <= ?'); values.push(parsed.date_to); }
  if (parsed.query) {
    clauses.push(`(employees.employee_number LIKE ? COLLATE NOCASE OR employees.name LIKE ? COLLATE NOCASE
      OR deduction_types.code LIKE ? COLLATE NOCASE OR deduction_types.name LIKE ? COLLATE NOCASE
      OR deduction_transactions.reference LIKE ? COLLATE NOCASE OR employee_loans.loan_number LIKE ? COLLATE NOCASE)`);
    const value = `%${parsed.query}%`; values.push(value, value, value, value, value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const data = await getDb().all<DeductionTransactionRecord[]>(
    `${transactionSelect} ${where} ORDER BY deduction_transactions.transaction_date DESC, deduction_transactions.created_at DESC`, ...values,
  );
  return { data, total: data.length };
}

export async function getDeductionTransaction(id: string) {
  return (await getDb().get<DeductionTransactionRecord>(`${transactionSelect} WHERE deduction_transactions.id = ?`, id)) ?? null;
}

export async function getDeductionSummary(filters?: unknown) {
  const parsed = parseTransactionFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (parsed.employee_id) { clauses.push('deduction_transactions.employee_id = ?'); values.push(parsed.employee_id); }
  if (parsed.date_from) { clauses.push('deduction_transactions.transaction_date >= ?'); values.push(parsed.date_from); }
  if (parsed.date_to) { clauses.push('deduction_transactions.transaction_date <= ?'); values.push(parsed.date_to); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const row = await getDb().get<{
    total: number; draft: number; approved: number; cancelled: number; loan_payments: number;
  }>(`SELECT COALESCE(SUM(CASE WHEN status <> 'cancelled' THEN amount ELSE 0 END), 0) AS total,
      COALESCE(SUM(CASE WHEN status = 'draft' THEN amount ELSE 0 END), 0) AS draft,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS approved,
      COALESCE(SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END), 0) AS cancelled,
      COALESCE(SUM(CASE WHEN status = 'approved' AND loan_id IS NOT NULL THEN amount ELSE 0 END), 0) AS loan_payments
    FROM deduction_transactions ${where}`, ...values);
  const assignments = await getDb().get<{ count: number }>('SELECT COUNT(*) AS count FROM deduction_assignments WHERE is_active = 1');
  const loans = await getDb().get<{ count: number; outstanding: number }>(
    `SELECT COUNT(*) AS count, COALESCE(SUM(outstanding_balance), 0) AS outstanding
     FROM employee_loans WHERE status IN ('active','suspended')`,
  );
  return { ...row, recurring_assignments: assignments?.count ?? 0, active_loans: loans?.count ?? 0, outstanding_loans: loans?.outstanding ?? 0 };
}

export async function createDeductionTransaction(payload: unknown) {
  const input = validateTransactionInput(payload);
  await validateTransactionReferences(input);
  const id = `deduction_transaction_${randomUUID()}`;
  await getDb().run(
    `INSERT INTO deduction_transactions (
      id, employee_id, deduction_type_id, assignment_id, loan_id, transaction_date,
      payroll_period_id, amount, reference, notes, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id, input.employee_id, input.deduction_type_id, input.assignment_id || null,
    input.loan_id || null, input.transaction_date, input.payroll_period_id || null,
    input.amount, input.reference || null, input.notes || null, input.status,
  );
  if (input.status === 'approved' && input.loan_id) await applyLoanPayment(id, input.loan_id, input.amount, input.transaction_date);
  return requireTransaction(id);
}

export async function updateDeductionTransaction(id: string, payload: unknown) {
  const existing = await requireTransaction(id);
  if (existing.status === 'approved') throw new Error('Approved deductions must be cancelled before replacement.');
  if (existing.status === 'cancelled') throw new Error('Cancelled deductions cannot be edited.');
  const input = validateTransactionInput(payload);
  await validateTransactionReferences(input);
  await getDb().run(
    `UPDATE deduction_transactions SET employee_id = ?, deduction_type_id = ?, assignment_id = ?,
      loan_id = ?, transaction_date = ?, payroll_period_id = ?, amount = ?, reference = ?, notes = ?,
      status = ?, updated_at = datetime('now') WHERE id = ?`,
    input.employee_id, input.deduction_type_id, input.assignment_id || null,
    input.loan_id || null, input.transaction_date, input.payroll_period_id || null,
    input.amount, input.reference || null, input.notes || null, input.status, id,
  );
  if (input.status === 'approved' && input.loan_id) await applyLoanPayment(id, input.loan_id, input.amount, input.transaction_date);
  return requireTransaction(id);
}

export async function setDeductionTransactionStatus(id: string, status: DeductionTransactionStatus) {
  const existing = await requireTransaction(id);
  if (existing.status === status) return existing;
  if (existing.status === 'cancelled') throw new Error('A cancelled deduction cannot be reopened.');
  if (status === 'draft' && existing.status === 'approved') throw new Error('Approved deductions cannot return to draft.');
  if (status === 'approved' && existing.loan_id) await applyLoanPayment(id, existing.loan_id, existing.amount, existing.transaction_date);
  if (status === 'cancelled' && existing.status === 'approved' && existing.loan_id) await reverseLoanPayment(id, existing.loan_id, existing.amount);
  await getDb().run('UPDATE deduction_transactions SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', status, id);
  return requireTransaction(id);
}

export async function deleteDeductionTransaction(id: string) {
  const existing = await requireTransaction(id);
  if (existing.status === 'approved') {
    await setDeductionTransactionStatus(id, 'cancelled');
    return { id, cancelled: true };
  }
  await getDb().run('DELETE FROM deduction_transactions WHERE id = ?', id);
  return { id, cancelled: false };
}

async function generateLoanSchedule(loanId: string) {
  const loan = await requireLoan(loanId);
  const first = parseDate(loan.first_deduction_date);
  let allocated = 0;
  for (let index = 1; index <= loan.number_of_installments; index += 1) {
    const amount = index === loan.number_of_installments
      ? roundMoney(loan.total_payable - allocated)
      : loan.installment_amount;
    allocated = roundMoney(allocated + amount);
    const due = addFrequency(first, loan.deduction_frequency, index - 1);
    await getDb().run(
      `INSERT INTO loan_installments (
        id, loan_id, installment_number, due_date, amount_due, amount_paid,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0, 'scheduled', datetime('now'), datetime('now'))`,
      `loan_installment_${randomUUID()}`, loanId, index, formatDate(due), amount,
    );
  }
}

async function applyLoanPayment(transactionId: string, loanId: string, amount: number, transactionDate: string) {
  const transactionAlreadyApplied = await getDb().get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM loan_payment_allocations WHERE transaction_id = ?', transactionId,
  );
  if ((transactionAlreadyApplied?.count ?? 0) > 0) return;
  const loan = await requireLoan(loanId);
  if (amount > loan.outstanding_balance + 0.005) throw new Error('Deduction exceeds the loan outstanding balance.');
  let remaining = roundMoney(amount);
  const installments = await getDb().all<LoanInstallmentRecord[]>(
    `SELECT id, loan_id, installment_number, due_date, amount_due, amount_paid, status,
      COALESCE(transaction_id, '') AS transaction_id, COALESCE(paid_at, '') AS paid_at,
      COALESCE(notes, '') AS notes
     FROM loan_installments WHERE loan_id = ? AND status IN ('scheduled','partial') ORDER BY installment_number`, loanId,
  );
  for (const installment of installments) {
    if (remaining <= 0.005) break;
    const due = roundMoney(installment.amount_due - installment.amount_paid);
    const applied = Math.min(due, remaining);
    const newPaid = roundMoney(installment.amount_paid + applied);
    remaining = roundMoney(remaining - applied);
    await getDb().run(
      `UPDATE loan_installments SET amount_paid = ?, status = ?, transaction_id = ?, paid_at = ?,
        updated_at = datetime('now') WHERE id = ?`,
      newPaid, newPaid + 0.005 >= installment.amount_due ? 'paid' : 'partial',
      transactionId, transactionDate, installment.id,
    );
    await getDb().run(
      `INSERT INTO loan_payment_allocations (
        id, transaction_id, installment_id, amount, created_at
      ) VALUES (?, ?, ?, ?, datetime('now'))`,
      `loan_allocation_${randomUUID()}`, transactionId, installment.id, applied,
    );
  }
  if (remaining > 0.005) throw new Error('Unable to allocate the full payment to the installment schedule.');
  const outstanding = roundMoney(loan.outstanding_balance - amount);
  await getDb().run(
    `UPDATE employee_loans SET outstanding_balance = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
    Math.max(0, outstanding), outstanding <= 0.005 ? 'paid' : loan.status === 'draft' ? 'active' : loan.status, loanId,
  );
}

async function reverseLoanPayment(transactionId: string, loanId: string, amount: number) {
  const allocations = await getDb().all<Array<{ installment_id: string; amount: number }>>(
    `SELECT installment_id, amount
     FROM loan_payment_allocations
     WHERE transaction_id = ?`,
    transactionId,
  );
  let reversed = 0;
  for (const allocation of allocations) {
    const installment = await getDb().get<{ amount_due: number; amount_paid: number }>(
      'SELECT amount_due, amount_paid FROM loan_installments WHERE id = ?',
      allocation.installment_id,
    );
    if (!installment) continue;
    const newPaid = roundMoney(Math.max(0, installment.amount_paid - allocation.amount));
    reversed = roundMoney(reversed + allocation.amount);
    await getDb().run(
      `UPDATE loan_installments SET amount_paid = ?, status = ?,
        transaction_id = NULL, paid_at = NULL, updated_at = datetime('now')
       WHERE id = ?`,
      newPaid,
      newPaid <= 0.005 ? 'scheduled' : newPaid + 0.005 >= installment.amount_due ? 'paid' : 'partial',
      allocation.installment_id,
    );
  }
  await getDb().run('DELETE FROM loan_payment_allocations WHERE transaction_id = ?', transactionId);
  const restore = reversed > 0 ? reversed : amount;
  await getDb().run(
    `UPDATE employee_loans SET outstanding_balance = MIN(total_payable, outstanding_balance + ?),
      status = CASE WHEN status = 'paid' THEN 'active' ELSE status END,
      updated_at = datetime('now') WHERE id = ?`,
    restore,
    loanId,
  );
}

async function requireType(id: string) {
  const value = await getDeductionType(id);
  if (!value) throw new Error('Deduction type not found.');
  return value;
}
async function requireAssignment(id: string) {
  const value = await getDeductionAssignment(id);
  if (!value) throw new Error('Deduction assignment not found.');
  return value;
}
async function requireLoan(id: string) {
  const value = await getEmployeeLoan(id);
  if (!value) throw new Error('Employee loan not found.');
  return value;
}
async function requireTransaction(id: string) {
  const value = await getDeductionTransaction(id);
  if (!value) throw new Error('Deduction transaction not found.');
  return value;
}

function validateTypeInput(payload: unknown): DeductionTypeInput {
  const value = asRecord(payload);
  const calculation = enumValue(value.calculation_type, ['fixed', 'percentage'], 'Calculation type');
  return {
    code: requiredString(value.code, 'Code').toUpperCase(),
    name: requiredString(value.name, 'Name'),
    category: enumValue(value.category, ['loan','statutory','company','advance','penalty','insurance','cooperative','other'], 'Category'),
    description: optionalString(value.description),
    calculation_type: calculation,
    default_amount: nonNegativeNumber(value.default_amount, 'Default amount'),
    default_percentage: percentageNumber(value.default_percentage, 'Default percentage'),
    recurrence: enumValue(value.recurrence, ['recurring','one-time'], 'Recurrence'),
    priority: nonNegativeInteger(value.priority, 'Priority'),
    is_active: booleanNumber(value.is_active, true),
  };
}

function validateAssignmentInput(payload: unknown): DeductionAssignmentInput {
  const value = asRecord(payload);
  const input = {
    employee_id: requiredString(value.employee_id, 'Employee'),
    deduction_type_id: requiredString(value.deduction_type_id, 'Deduction type'),
    amount: nonNegativeNumber(value.amount, 'Amount'),
    percentage: percentageNumber(value.percentage, 'Percentage'),
    effective_from: requiredDate(value.effective_from, 'Effective from'),
    effective_to: optionalDate(value.effective_to, 'Effective to'),
    notes: optionalString(value.notes),
    is_active: booleanNumber(value.is_active, true),
  };
  if (input.effective_to && input.effective_to < input.effective_from) throw new Error('Effective-to date cannot be before effective-from date.');
  return input;
}

function validateLoanInput(payload: unknown): LoanInput {
  const value = asRecord(payload);
  return {
    employee_id: requiredString(value.employee_id, 'Employee'),
    deduction_type_id: requiredString(value.deduction_type_id, 'Loan type'),
    loan_number: requiredString(value.loan_number, 'Loan number').toUpperCase(),
    principal_amount: positiveNumber(value.principal_amount, 'Principal amount'),
    interest_rate: percentageNumber(value.interest_rate, 'Interest rate'),
    loan_date: requiredDate(value.loan_date, 'Loan date'),
    first_deduction_date: requiredDate(value.first_deduction_date, 'First deduction date'),
    number_of_installments: positiveInteger(value.number_of_installments, 'Number of installments'),
    deduction_frequency: enumValue(value.deduction_frequency, ['weekly','biweekly','semimonthly','monthly'], 'Deduction frequency'),
    status: enumValue(value.status, ['draft','active','suspended','paid','cancelled'], 'Loan status'),
    notes: optionalString(value.notes),
  };
}

function validateTransactionInput(payload: unknown): DeductionTransactionInput {
  const value = asRecord(payload);
  return {
    employee_id: requiredString(value.employee_id, 'Employee'),
    deduction_type_id: requiredString(value.deduction_type_id, 'Deduction type'),
    assignment_id: optionalString(value.assignment_id),
    loan_id: optionalString(value.loan_id),
    transaction_date: requiredDate(value.transaction_date, 'Transaction date'),
    payroll_period_id: optionalString(value.payroll_period_id),
    amount: positiveNumber(value.amount, 'Amount'),
    reference: optionalString(value.reference),
    notes: optionalString(value.notes),
    status: enumValue(value.status, ['draft','approved','cancelled'], 'Status'),
  };
}

async function validateAssignmentReferences(input: DeductionAssignmentInput) {
  const employee = await getDb().get('SELECT id FROM employees WHERE id = ? AND is_active = 1', input.employee_id);
  if (!employee) throw new Error('Select an active employee.');
  const type = await requireType(input.deduction_type_id);
  if (!type.is_active) throw new Error('Select an active deduction type.');
  if (type.category === 'loan') throw new Error('Loan deductions must be created from the Employee Loans page.');
}

async function validateLoanReferences(input: LoanInput) {
  const employee = await getDb().get('SELECT id FROM employees WHERE id = ? AND is_active = 1', input.employee_id);
  if (!employee) throw new Error('Select an active employee.');
  const type = await requireType(input.deduction_type_id);
  if (!type.is_active || type.category !== 'loan') throw new Error('Select an active loan deduction type.');
}

async function validateTransactionReferences(input: DeductionTransactionInput) {
  const employee = await getDb().get('SELECT id FROM employees WHERE id = ? AND is_active = 1', input.employee_id);
  if (!employee) throw new Error('Select an active employee.');
  const type = await requireType(input.deduction_type_id);
  if (!type.is_active) throw new Error('Select an active deduction type.');
  if (input.assignment_id) {
    const assignment = await requireAssignment(input.assignment_id);
    if (assignment.employee_id !== input.employee_id || assignment.deduction_type_id !== input.deduction_type_id) {
      throw new Error('The selected assignment does not match the employee and deduction type.');
    }
  }
  if (input.loan_id) {
    const loan = await requireLoan(input.loan_id);
    if (loan.employee_id !== input.employee_id || loan.deduction_type_id !== input.deduction_type_id) {
      throw new Error('The selected loan does not match the employee and deduction type.');
    }
  }
}

async function ensureNoAssignmentOverlap(input: DeductionAssignmentInput, excludedId = '') {
  const row = await getDb().get<{ id: string }>(
    `SELECT id FROM deduction_assignments
     WHERE employee_id = ? AND deduction_type_id = ? AND is_active = 1 AND id <> ?
       AND effective_from <= COALESCE(NULLIF(?, ''), '9999-12-31')
       AND COALESCE(NULLIF(effective_to, ''), '9999-12-31') >= ? LIMIT 1`,
    input.employee_id, input.deduction_type_id, excludedId, input.effective_to, input.effective_from,
  );
  if (row) throw new Error('An overlapping active assignment already exists for this employee and deduction type.');
}

function parseTypeFilters(filters: unknown) {
  const value = isRecord(filters) ? filters : {};
  return {
    query: optionalString(value.query), include_inactive: Boolean(value.include_inactive),
    category: enumFilter(value.category, ['loan','statutory','company','advance','penalty','insurance','cooperative','other']),
  };
}
function parseAssignmentFilters(filters: unknown) {
  const value = isRecord(filters) ? filters : {};
  return { query: optionalString(value.query), employee_id: optionalString(value.employee_id),
    deduction_type_id: optionalString(value.deduction_type_id), as_of: optionalDate(value.as_of, 'As-of date'),
    include_inactive: Boolean(value.include_inactive) };
}
function parseLoanFilters(filters: unknown) {
  const value = isRecord(filters) ? filters : {};
  return { query: optionalString(value.query), employee_id: optionalString(value.employee_id),
    status: enumFilter(value.status, ['draft','active','suspended','paid','cancelled']) as 'all' | LoanStatus };
}
function parseTransactionFilters(filters: unknown) {
  const value = isRecord(filters) ? filters : {};
  return { query: optionalString(value.query), employee_id: optionalString(value.employee_id),
    deduction_type_id: optionalString(value.deduction_type_id),
    category: enumFilter(value.category, ['loan','statutory','company','advance','penalty','insurance','cooperative','other']),
    status: enumFilter(value.status, ['draft','approved','cancelled']) as 'all' | DeductionTransactionStatus,
    date_from: optionalDate(value.date_from, 'From date'), date_to: optionalDate(value.date_to, 'To date') };
}

function asRecord(value: unknown): Record<string, unknown> { if (!isRecord(value)) throw new Error('Invalid request payload.'); return value; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function requiredString(value: unknown, label: string) { const result = optionalString(value); if (!result) throw new Error(`${label} is required.`); return result; }
function optionalString(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function requiredDate(value: unknown, label: string) { const result = optionalDate(value, label); if (!result) throw new Error(`${label} is required.`); return result; }
function optionalDate(value: unknown, label: string) { const result = optionalString(value); if (!result) return ''; if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(new Date(`${result}T00:00:00`).getTime())) throw new Error(`${label} must be a valid date.`); return result; }
function nonNegativeNumber(value: unknown, label: string) { const result = Number(value ?? 0); if (!Number.isFinite(result) || result < 0) throw new Error(`${label} must be zero or greater.`); return roundMoney(result); }
function positiveNumber(value: unknown, label: string) { const result = Number(value); if (!Number.isFinite(result) || result <= 0) throw new Error(`${label} must be greater than zero.`); return roundMoney(result); }
function percentageNumber(value: unknown, label: string) { const result = Number(value ?? 0); if (!Number.isFinite(result) || result < 0 || result > 100) throw new Error(`${label} must be between 0 and 100.`); return roundMoney(result); }
function nonNegativeInteger(value: unknown, label: string) { const result = Number(value ?? 0); if (!Number.isInteger(result) || result < 0) throw new Error(`${label} must be a whole number of zero or more.`); return result; }
function positiveInteger(value: unknown, label: string) { const result = Number(value); if (!Number.isInteger(result) || result <= 0 || result > 600) throw new Error(`${label} must be a whole number between 1 and 600.`); return result; }
function booleanNumber(value: unknown, fallback: boolean) { if (typeof value === 'boolean') return value ? 1 : 0; if (value === 0 || value === 1) return value; return fallback ? 1 : 0; }
function enumValue<T extends string>(value: unknown, allowed: readonly T[], label: string): T { if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error(`${label} is invalid.`); return value as T; }
function enumFilter<T extends string>(value: unknown, allowed: readonly T[]): 'all' | T { return typeof value === 'string' && allowed.includes(value as T) ? value as T : 'all'; }
function roundMoney(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function parseDate(value: string) { const date = new Date(`${value}T00:00:00`); if (Number.isNaN(date.getTime())) throw new Error('Invalid schedule date.'); return date; }
function formatDate(value: Date) { return value.toISOString().slice(0, 10); }
function addFrequency(start: Date, frequency: DeductionFrequency, offset: number) {
  const date = new Date(start);
  if (frequency === 'weekly') date.setDate(date.getDate() + 7 * offset);
  else if (frequency === 'biweekly') date.setDate(date.getDate() + 14 * offset);
  else if (frequency === 'monthly') date.setMonth(date.getMonth() + offset);
  else date.setDate(date.getDate() + 15 * offset);
  return date;
}
function translateTypeError(error: unknown) { const message = error instanceof Error ? error.message : String(error); if (message.includes('deduction_types.code')) return new Error('Deduction code already exists.'); if (message.includes('deduction_types.name')) return new Error('Deduction name already exists.'); return error instanceof Error ? error : new Error(message); }
function translateLoanError(error: unknown) { const message = error instanceof Error ? error.message : String(error); if (message.includes('employee_loans.loan_number')) return new Error('Loan number already exists.'); return error instanceof Error ? error : new Error(message); }
