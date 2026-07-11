import { randomUUID } from 'node:crypto';
import { getDb } from '../db';

export type ContributionCalculationMethod = 'bracket' | 'percentage' | 'fixed' | 'tax-bracket';
export type ContributionTableStatus = 'draft' | 'active' | 'archived';
export type ContributionRecordStatus = 'draft' | 'approved' | 'remitted' | 'cancelled';
export type GovernmentNumberField = 'sss_number' | 'philhealth_number' | 'pagibig_number' | 'tin_number' | 'none';

export interface ContributionTypeRecord {
  id: string;
  code: string;
  name: string;
  authority: string;
  description: string;
  calculation_method: ContributionCalculationMethod;
  government_number_field: GovernmentNumberField;
  employee_share_enabled: number;
  employer_share_enabled: number;
  is_tax: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ContributionTableVersionRecord {
  id: string;
  contribution_type_id: string;
  contribution_code: string;
  contribution_name: string;
  authority: string;
  version_name: string;
  effective_from: string;
  effective_to: string;
  status: ContributionTableStatus;
  notes: string;
  bracket_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContributionBracketRecord {
  id: string;
  table_version_id: string;
  min_compensation: number;
  max_compensation: number | null;
  employee_fixed: number;
  employee_rate: number;
  employee_excess_over: number;
  employer_fixed: number;
  employer_rate: number;
  employer_excess_over: number;
  notes: string;
  sort_order: number;
}

export interface ContributionCalculationResult {
  employee_id: string;
  employee_number: string;
  employee_name: string;
  contribution_type_id: string;
  contribution_code: string;
  contribution_name: string;
  table_version_id: string;
  table_version_name: string;
  contribution_date: string;
  compensation_basis: number;
  employee_share: number;
  employer_share: number;
  total_contribution: number;
  government_number: string;
  missing_government_number: boolean;
  bracket: ContributionBracketRecord;
}

export interface ContributionRecord extends ContributionCalculationResult {
  id: string;
  payroll_period_id: string;
  payroll_period_name: string;
  reference: string;
  notes: string;
  status: ContributionRecordStatus;
  created_at: string;
  updated_at: string;
}

export interface ContributionSummary {
  employee_share: number;
  employer_share: number;
  total_contribution: number;
  record_count: number;
  missing_number_count: number;
  draft_count: number;
  approved_count: number;
  remitted_count: number;
  by_type: Array<{
    contribution_type_id: string;
    contribution_code: string;
    contribution_name: string;
    employee_share: number;
    employer_share: number;
    total_contribution: number;
    record_count: number;
  }>;
}

interface ContributionTypeInput {
  code: string;
  name: string;
  authority: string;
  description: string;
  calculation_method: ContributionCalculationMethod;
  government_number_field: GovernmentNumberField;
  employee_share_enabled: number;
  employer_share_enabled: number;
  is_tax: number;
  is_active: number;
}

interface ContributionTableVersionInput {
  contribution_type_id: string;
  version_name: string;
  effective_from: string;
  effective_to: string;
  status: ContributionTableStatus;
  notes: string;
}

interface ContributionBracketInput {
  min_compensation: number;
  max_compensation: number | null;
  employee_fixed: number;
  employee_rate: number;
  employee_excess_over: number;
  employer_fixed: number;
  employer_rate: number;
  employer_excess_over: number;
  notes: string;
  sort_order: number;
}

interface ContributionCalculationInput {
  employee_id: string;
  contribution_type_id: string;
  contribution_date: string;
  compensation_basis: number;
  table_version_id: string;
}

interface ContributionRecordInput extends ContributionCalculationInput {
  payroll_period_id: string;
  reference: string;
  notes: string;
  status: ContributionRecordStatus;
}

const contributionTypeSelect = `
  SELECT
    id, code, name, authority, COALESCE(description, '') AS description,
    calculation_method, government_number_field, employee_share_enabled,
    employer_share_enabled, is_tax, is_active, created_at, updated_at
  FROM government_contribution_types
`;

const contributionTableSelect = `
  SELECT
    government_contribution_tables.id,
    government_contribution_tables.contribution_type_id,
    government_contribution_types.code AS contribution_code,
    government_contribution_types.name AS contribution_name,
    government_contribution_types.authority,
    government_contribution_tables.version_name,
    government_contribution_tables.effective_from,
    COALESCE(government_contribution_tables.effective_to, '') AS effective_to,
    government_contribution_tables.status,
    COALESCE(government_contribution_tables.notes, '') AS notes,
    (SELECT COUNT(*) FROM government_contribution_brackets
      WHERE table_version_id = government_contribution_tables.id) AS bracket_count,
    government_contribution_tables.created_at,
    government_contribution_tables.updated_at
  FROM government_contribution_tables
  INNER JOIN government_contribution_types
    ON government_contribution_types.id = government_contribution_tables.contribution_type_id
`;

const contributionRecordSelect = `
  SELECT
    government_contribution_records.id,
    government_contribution_records.employee_id,
    employees.employee_number,
    employees.name AS employee_name,
    government_contribution_records.contribution_type_id,
    government_contribution_types.code AS contribution_code,
    government_contribution_types.name AS contribution_name,
    government_contribution_records.table_version_id,
    government_contribution_tables.version_name AS table_version_name,
    government_contribution_records.contribution_date,
    government_contribution_records.compensation_basis,
    government_contribution_records.employee_share,
    government_contribution_records.employer_share,
    government_contribution_records.total_contribution,
    COALESCE(government_contribution_records.government_number, '') AS government_number,
    CASE WHEN trim(COALESCE(government_contribution_records.government_number, '')) = ''
      AND government_contribution_types.government_number_field <> 'none'
      THEN 1 ELSE 0 END AS missing_government_number,
    government_contribution_records.bracket_json,
    COALESCE(government_contribution_records.payroll_period_id, '') AS payroll_period_id,
    COALESCE(payroll_periods.name, '') AS payroll_period_name,
    COALESCE(government_contribution_records.reference, '') AS reference,
    COALESCE(government_contribution_records.notes, '') AS notes,
    government_contribution_records.status,
    government_contribution_records.created_at,
    government_contribution_records.updated_at
  FROM government_contribution_records
  INNER JOIN employees ON employees.id = government_contribution_records.employee_id
  INNER JOIN government_contribution_types
    ON government_contribution_types.id = government_contribution_records.contribution_type_id
  INNER JOIN government_contribution_tables
    ON government_contribution_tables.id = government_contribution_records.table_version_id
  LEFT JOIN payroll_periods
    ON payroll_periods.id = government_contribution_records.payroll_period_id
`;

export async function getContributionTypes(filters?: unknown): Promise<{ data: ContributionTypeRecord[]; total: number }> {
  const parsed = parseTypeFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (!parsed.include_inactive) clauses.push('is_active = 1');
  if (parsed.query) {
    clauses.push('(code LIKE ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE OR authority LIKE ? COLLATE NOCASE)');
    const value = `%${parsed.query}%`;
    values.push(value, value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await getDb().all<ContributionTypeRecord[]>(
    `${contributionTypeSelect} ${where} ORDER BY is_active DESC, name COLLATE NOCASE`,
    ...values,
  );
  return { data: rows, total: rows.length };
}

export async function getContributionType(id: string): Promise<ContributionTypeRecord | null> {
  return (await getDb().get<ContributionTypeRecord>(`${contributionTypeSelect} WHERE id = ?`, id)) ?? null;
}

export async function createContributionType(payload: unknown): Promise<ContributionTypeRecord> {
  const input = validateContributionTypeInput(payload);
  const id = `contribution_type_${randomUUID()}`;
  try {
    await getDb().run(
      `INSERT INTO government_contribution_types (
        id, code, name, authority, description, calculation_method,
        government_number_field, employee_share_enabled, employer_share_enabled,
        is_tax, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id, input.code, input.name, input.authority, input.description || null,
      input.calculation_method, input.government_number_field,
      input.employee_share_enabled, input.employer_share_enabled,
      input.is_tax, input.is_active,
    );
  } catch (error) {
    throw translateUniqueError(error, 'Contribution code and name must be unique.');
  }
  return requireContributionType(id);
}

export async function updateContributionType(id: string, payload: unknown): Promise<ContributionTypeRecord> {
  await requireContributionType(id);
  const input = validateContributionTypeInput(payload);
  try {
    await getDb().run(
      `UPDATE government_contribution_types SET
        code = ?, name = ?, authority = ?, description = ?, calculation_method = ?,
        government_number_field = ?, employee_share_enabled = ?, employer_share_enabled = ?,
        is_tax = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`,
      input.code, input.name, input.authority, input.description || null,
      input.calculation_method, input.government_number_field,
      input.employee_share_enabled, input.employer_share_enabled,
      input.is_tax, input.is_active, id,
    );
  } catch (error) {
    throw translateUniqueError(error, 'Contribution code and name must be unique.');
  }
  return requireContributionType(id);
}

export async function setContributionTypeStatus(id: string, active: boolean): Promise<ContributionTypeRecord> {
  await requireContributionType(id);
  await getDb().run(
    `UPDATE government_contribution_types SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
    active ? 1 : 0,
    id,
  );
  return requireContributionType(id);
}

export async function deleteContributionType(id: string): Promise<{ id: string; deactivated: boolean }> {
  await requireContributionType(id);
  const reference = await getDb().get<{ count: number }>(
    `SELECT COUNT(*) AS count FROM government_contribution_tables WHERE contribution_type_id = ?`,
    id,
  );
  if ((reference?.count ?? 0) > 0) {
    await setContributionTypeStatus(id, false);
    return { id, deactivated: true };
  }
  await getDb().run('DELETE FROM government_contribution_types WHERE id = ?', id);
  return { id, deactivated: false };
}

export async function getContributionTables(filters?: unknown): Promise<{ data: ContributionTableVersionRecord[]; total: number }> {
  const parsed = parseTableFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (parsed.contribution_type_id) {
    clauses.push('government_contribution_tables.contribution_type_id = ?');
    values.push(parsed.contribution_type_id);
  }
  if (parsed.status !== 'all') {
    clauses.push('government_contribution_tables.status = ?');
    values.push(parsed.status);
  }
  if (parsed.as_of) {
    clauses.push('government_contribution_tables.effective_from <= ?');
    clauses.push('(government_contribution_tables.effective_to IS NULL OR government_contribution_tables.effective_to = \'\' OR government_contribution_tables.effective_to >= ?)');
    values.push(parsed.as_of, parsed.as_of);
  }
  if (parsed.query) {
    clauses.push('(government_contribution_tables.version_name LIKE ? COLLATE NOCASE OR government_contribution_types.name LIKE ? COLLATE NOCASE)');
    const value = `%${parsed.query}%`;
    values.push(value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await getDb().all<ContributionTableVersionRecord[]>(
    `${contributionTableSelect} ${where}
     ORDER BY government_contribution_tables.effective_from DESC,
              government_contribution_types.name COLLATE NOCASE`,
    ...values,
  );
  return { data: rows, total: rows.length };
}

export async function getContributionTable(id: string): Promise<{
  table: ContributionTableVersionRecord;
  brackets: ContributionBracketRecord[];
} | null> {
  const table = await getDb().get<ContributionTableVersionRecord>(
    `${contributionTableSelect} WHERE government_contribution_tables.id = ?`,
    id,
  );
  if (!table) return null;
  const brackets = await getContributionBrackets(id);
  return { table, brackets };
}

export async function createContributionTable(payload: unknown): Promise<ContributionTableVersionRecord> {
  const input = validateTableInput(payload);
  await requireContributionType(input.contribution_type_id);
  await assertNoActiveDateOverlap(input, '');
  const id = `contribution_table_${randomUUID()}`;
  await getDb().run(
    `INSERT INTO government_contribution_tables (
      id, contribution_type_id, version_name, effective_from, effective_to,
      status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    id, input.contribution_type_id, input.version_name, input.effective_from,
    input.effective_to || null, input.status, input.notes || null,
  );
  return requireContributionTable(id);
}

export async function updateContributionTable(id: string, payload: unknown): Promise<ContributionTableVersionRecord> {
  await requireContributionTable(id);
  const input = validateTableInput(payload);
  await requireContributionType(input.contribution_type_id);
  await assertNoActiveDateOverlap(input, id);
  await getDb().run(
    `UPDATE government_contribution_tables SET
      contribution_type_id = ?, version_name = ?, effective_from = ?, effective_to = ?,
      status = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`,
    input.contribution_type_id, input.version_name, input.effective_from,
    input.effective_to || null, input.status, input.notes || null, id,
  );
  return requireContributionTable(id);
}

export async function setContributionTableStatus(id: string, status: ContributionTableStatus): Promise<ContributionTableVersionRecord> {
  const existing = await requireContributionTable(id);
  if (status === 'active') {
    await assertNoActiveDateOverlap({
      contribution_type_id: existing.contribution_type_id,
      version_name: existing.version_name,
      effective_from: existing.effective_from,
      effective_to: existing.effective_to,
      status,
      notes: existing.notes,
    }, id);
    const count = await getDb().get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM government_contribution_brackets WHERE table_version_id = ?',
      id,
    );
    if ((count?.count ?? 0) === 0) {
      throw new Error('Add at least one contribution bracket before activating this table.');
    }
  }
  await getDb().run(
    `UPDATE government_contribution_tables SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    status,
    id,
  );
  return requireContributionTable(id);
}

export async function deleteContributionTable(id: string): Promise<{ id: string; archived: boolean }> {
  const existing = await requireContributionTable(id);
  const reference = await getDb().get<{ count: number }>(
    'SELECT COUNT(*) AS count FROM government_contribution_records WHERE table_version_id = ?',
    id,
  );
  if ((reference?.count ?? 0) > 0 || existing.status === 'active') {
    await setContributionTableStatus(id, 'archived');
    return { id, archived: true };
  }
  await getDb().run('DELETE FROM government_contribution_tables WHERE id = ?', id);
  return { id, archived: false };
}

export async function getContributionBrackets(tableVersionId: string): Promise<ContributionBracketRecord[]> {
  return getDb().all<ContributionBracketRecord[]>(
    `SELECT
      id, table_version_id, min_compensation, max_compensation,
      employee_fixed, employee_rate, employee_excess_over,
      employer_fixed, employer_rate, employer_excess_over,
      COALESCE(notes, '') AS notes, sort_order
     FROM government_contribution_brackets
     WHERE table_version_id = ?
     ORDER BY sort_order, min_compensation`,
    tableVersionId,
  );
}

export async function replaceContributionBrackets(tableVersionId: string, payload: unknown): Promise<ContributionBracketRecord[]> {
  const table = await requireContributionTable(tableVersionId);
  if (table.status === 'archived') throw new Error('Archived contribution tables cannot be edited.');
  const brackets = validateBracketList(payload);
  assertBracketRanges(brackets);
  const db = getDb();
  await db.exec('BEGIN TRANSACTION;');
  try {
    await db.run('DELETE FROM government_contribution_brackets WHERE table_version_id = ?', tableVersionId);
    for (const [index, bracket] of brackets.entries()) {
      await db.run(
        `INSERT INTO government_contribution_brackets (
          id, table_version_id, min_compensation, max_compensation,
          employee_fixed, employee_rate, employee_excess_over,
          employer_fixed, employer_rate, employer_excess_over,
          notes, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        `contribution_bracket_${randomUUID()}`, tableVersionId,
        bracket.min_compensation, bracket.max_compensation,
        bracket.employee_fixed, bracket.employee_rate, bracket.employee_excess_over,
        bracket.employer_fixed, bracket.employer_rate, bracket.employer_excess_over,
        bracket.notes || null, Number.isFinite(bracket.sort_order) ? bracket.sort_order : index,
      );
    }
    await db.run(
      `UPDATE government_contribution_tables SET updated_at = datetime('now') WHERE id = ?`,
      tableVersionId,
    );
    await db.exec('COMMIT;');
  } catch (error) {
    await db.exec('ROLLBACK;');
    throw error;
  }
  return getContributionBrackets(tableVersionId);
}

export async function calculateContribution(payload: unknown): Promise<ContributionCalculationResult> {
  const input = validateCalculationInput(payload);
  const employee = await getDb().get<{
    id: string;
    employee_number: string;
    name: string;
    sss_number: string | null;
    philhealth_number: string | null;
    pagibig_number: string | null;
    tin_number: string | null;
  }>(
    `SELECT id, employee_number, name, sss_number, philhealth_number, pagibig_number, tin_number
     FROM employees WHERE id = ? AND is_active = 1`,
    input.employee_id,
  );
  if (!employee) throw new Error('Active employee not found.');
  const type = await requireContributionType(input.contribution_type_id);
  const table = input.table_version_id
    ? await requireContributionTable(input.table_version_id)
    : await findActiveTable(type.id, input.contribution_date);
  if (table.contribution_type_id !== type.id) {
    throw new Error('The selected table does not belong to the selected contribution type.');
  }
  if (table.status !== 'active') {
    throw new Error('Only active contribution tables can be used for calculation.');
  }
  if (input.contribution_date < table.effective_from || (table.effective_to && input.contribution_date > table.effective_to)) {
    throw new Error('The selected contribution table is not effective on the contribution date.');
  }
  const bracket = await findBracket(table.id, input.compensation_basis);
  const employeeShare = type.employee_share_enabled
    ? calculateShare(input.compensation_basis, bracket.employee_fixed, bracket.employee_rate, bracket.employee_excess_over)
    : 0;
  const employerShare = type.employer_share_enabled
    ? calculateShare(input.compensation_basis, bracket.employer_fixed, bracket.employer_rate, bracket.employer_excess_over)
    : 0;
  const governmentNumber = getGovernmentNumber(employee, type.government_number_field);
  return {
    employee_id: employee.id,
    employee_number: employee.employee_number,
    employee_name: employee.name,
    contribution_type_id: type.id,
    contribution_code: type.code,
    contribution_name: type.name,
    table_version_id: table.id,
    table_version_name: table.version_name,
    contribution_date: input.contribution_date,
    compensation_basis: roundMoney(input.compensation_basis),
    employee_share: employeeShare,
    employer_share: employerShare,
    total_contribution: roundMoney(employeeShare + employerShare),
    government_number: governmentNumber,
    missing_government_number: type.government_number_field !== 'none' && !governmentNumber,
    bracket,
  };
}

export async function createContributionRecord(payload: unknown): Promise<ContributionRecord> {
  const input = validateRecordInput(payload);
  const calculation = await calculateContribution(input);
  const id = `contribution_record_${randomUUID()}`;
  try {
    await getDb().run(
      `INSERT INTO government_contribution_records (
        id, employee_id, contribution_type_id, table_version_id,
        payroll_period_id, contribution_date, compensation_basis,
        employee_share, employer_share, total_contribution,
        government_number, bracket_json, reference, notes, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      id, calculation.employee_id, calculation.contribution_type_id,
      calculation.table_version_id, input.payroll_period_id || null,
      calculation.contribution_date, calculation.compensation_basis,
      calculation.employee_share, calculation.employer_share,
      calculation.total_contribution, calculation.government_number || null,
      JSON.stringify(calculation.bracket), input.reference || null,
      input.notes || null, input.status,
    );
  } catch (error) {
    throw translateUniqueError(error, 'A contribution record for this employee, type, date, and payroll period already exists.');
  }
  return requireContributionRecord(id);
}

export async function getContributionRecords(filters?: unknown): Promise<{ data: ContributionRecord[]; total: number }> {
  const parsed = parseRecordFilters(filters);
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (parsed.employee_id) {
    clauses.push('government_contribution_records.employee_id = ?');
    values.push(parsed.employee_id);
  }
  if (parsed.contribution_type_id) {
    clauses.push('government_contribution_records.contribution_type_id = ?');
    values.push(parsed.contribution_type_id);
  }
  if (parsed.status !== 'all') {
    clauses.push('government_contribution_records.status = ?');
    values.push(parsed.status);
  }
  if (parsed.date_from) {
    clauses.push('government_contribution_records.contribution_date >= ?');
    values.push(parsed.date_from);
  }
  if (parsed.date_to) {
    clauses.push('government_contribution_records.contribution_date <= ?');
    values.push(parsed.date_to);
  }
  if (parsed.query) {
    clauses.push('(employees.name LIKE ? COLLATE NOCASE OR employees.employee_number LIKE ? COLLATE NOCASE OR government_contribution_types.name LIKE ? COLLATE NOCASE OR government_contribution_records.reference LIKE ? COLLATE NOCASE)');
    const value = `%${parsed.query}%`;
    values.push(value, value, value, value);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await getDb().all<Array<Omit<ContributionRecord, 'bracket'> & { bracket_json: string }>>(
    `${contributionRecordSelect} ${where}
     ORDER BY government_contribution_records.contribution_date DESC,
              employees.name COLLATE NOCASE,
              government_contribution_types.name COLLATE NOCASE`,
    ...values,
  );
  const data = rows.map((row) => ({ ...row, bracket: safeParseBracket(row.bracket_json) }));
  return { data, total: data.length };
}

export async function getContributionRecord(id: string): Promise<ContributionRecord | null> {
  const row = await getDb().get<Omit<ContributionRecord, 'bracket'> & { bracket_json: string }>(
    `${contributionRecordSelect} WHERE government_contribution_records.id = ?`,
    id,
  );
  return row ? { ...row, bracket: safeParseBracket(row.bracket_json) } : null;
}

export async function setContributionRecordStatus(id: string, status: ContributionRecordStatus): Promise<ContributionRecord> {
  const existing = await requireContributionRecord(id);
  if (existing.status === 'remitted' && status !== 'remitted') {
    throw new Error('A remitted contribution record cannot be reopened.');
  }
  await getDb().run(
    `UPDATE government_contribution_records SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    status,
    id,
  );
  return requireContributionRecord(id);
}

export async function deleteContributionRecord(id: string): Promise<{ id: string; cancelled: boolean }> {
  const existing = await requireContributionRecord(id);
  if (existing.status === 'remitted' || existing.status === 'approved') {
    await setContributionRecordStatus(id, 'cancelled');
    return { id, cancelled: true };
  }
  await getDb().run('DELETE FROM government_contribution_records WHERE id = ?', id);
  return { id, cancelled: false };
}

export async function getContributionSummary(filters?: unknown): Promise<ContributionSummary> {
  const parsed = parseRecordFilters(filters);
  const clauses = ["government_contribution_records.status <> 'cancelled'"];
  const values: unknown[] = [];
  if (parsed.employee_id) {
    clauses.push('government_contribution_records.employee_id = ?');
    values.push(parsed.employee_id);
  }
  if (parsed.contribution_type_id) {
    clauses.push('government_contribution_records.contribution_type_id = ?');
    values.push(parsed.contribution_type_id);
  }
  if (parsed.date_from) {
    clauses.push('government_contribution_records.contribution_date >= ?');
    values.push(parsed.date_from);
  }
  if (parsed.date_to) {
    clauses.push('government_contribution_records.contribution_date <= ?');
    values.push(parsed.date_to);
  }
  const where = `WHERE ${clauses.join(' AND ')}`;
  const total = await getDb().get<{
    employee_share: number;
    employer_share: number;
    total_contribution: number;
    record_count: number;
    missing_number_count: number;
    draft_count: number;
    approved_count: number;
    remitted_count: number;
  }>(
    `SELECT
      COALESCE(SUM(employee_share), 0) AS employee_share,
      COALESCE(SUM(employer_share), 0) AS employer_share,
      COALESCE(SUM(total_contribution), 0) AS total_contribution,
      COUNT(*) AS record_count,
      SUM(CASE WHEN trim(COALESCE(government_number, '')) = ''
        AND government_contribution_types.government_number_field <> 'none'
        THEN 1 ELSE 0 END) AS missing_number_count,
      SUM(CASE WHEN government_contribution_records.status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
      SUM(CASE WHEN government_contribution_records.status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
      SUM(CASE WHEN government_contribution_records.status = 'remitted' THEN 1 ELSE 0 END) AS remitted_count
     FROM government_contribution_records
     INNER JOIN government_contribution_types
       ON government_contribution_types.id = government_contribution_records.contribution_type_id
     ${where}`,
    ...values,
  );
  const byType = await getDb().all<ContributionSummary['by_type']>(
    `SELECT
      government_contribution_records.contribution_type_id,
      government_contribution_types.code AS contribution_code,
      government_contribution_types.name AS contribution_name,
      COALESCE(SUM(government_contribution_records.employee_share), 0) AS employee_share,
      COALESCE(SUM(government_contribution_records.employer_share), 0) AS employer_share,
      COALESCE(SUM(government_contribution_records.total_contribution), 0) AS total_contribution,
      COUNT(*) AS record_count
     FROM government_contribution_records
     INNER JOIN government_contribution_types
       ON government_contribution_types.id = government_contribution_records.contribution_type_id
     ${where}
     GROUP BY government_contribution_records.contribution_type_id,
              government_contribution_types.code,
              government_contribution_types.name
     ORDER BY government_contribution_types.name COLLATE NOCASE`,
    ...values,
  );
  return {
    employee_share: roundMoney(total?.employee_share ?? 0),
    employer_share: roundMoney(total?.employer_share ?? 0),
    total_contribution: roundMoney(total?.total_contribution ?? 0),
    record_count: total?.record_count ?? 0,
    missing_number_count: total?.missing_number_count ?? 0,
    draft_count: total?.draft_count ?? 0,
    approved_count: total?.approved_count ?? 0,
    remitted_count: total?.remitted_count ?? 0,
    by_type: byType.map((row) => ({
      ...row,
      employee_share: roundMoney(row.employee_share),
      employer_share: roundMoney(row.employer_share),
      total_contribution: roundMoney(row.total_contribution),
    })),
  };
}

async function requireContributionType(id: string): Promise<ContributionTypeRecord> {
  const record = await getContributionType(id);
  if (!record) throw new Error('Contribution type not found.');
  return record;
}

async function requireContributionTable(id: string): Promise<ContributionTableVersionRecord> {
  const record = await getDb().get<ContributionTableVersionRecord>(
    `${contributionTableSelect} WHERE government_contribution_tables.id = ?`,
    id,
  );
  if (!record) throw new Error('Contribution table not found.');
  return record;
}

async function requireContributionRecord(id: string): Promise<ContributionRecord> {
  const record = await getContributionRecord(id);
  if (!record) throw new Error('Contribution record not found.');
  return record;
}

async function findActiveTable(contributionTypeId: string, date: string): Promise<ContributionTableVersionRecord> {
  const table = await getDb().get<ContributionTableVersionRecord>(
    `${contributionTableSelect}
     WHERE government_contribution_tables.contribution_type_id = ?
       AND government_contribution_tables.status = 'active'
       AND government_contribution_tables.effective_from <= ?
       AND (government_contribution_tables.effective_to IS NULL
         OR government_contribution_tables.effective_to = ''
         OR government_contribution_tables.effective_to >= ?)
     ORDER BY government_contribution_tables.effective_from DESC
     LIMIT 1`,
    contributionTypeId,
    date,
    date,
  );
  if (!table) throw new Error('No active contribution table applies to the selected date.');
  return table;
}

async function findBracket(tableVersionId: string, compensationBasis: number): Promise<ContributionBracketRecord> {
  const bracket = await getDb().get<ContributionBracketRecord>(
    `SELECT id, table_version_id, min_compensation, max_compensation,
      employee_fixed, employee_rate, employee_excess_over,
      employer_fixed, employer_rate, employer_excess_over,
      COALESCE(notes, '') AS notes, sort_order
     FROM government_contribution_brackets
     WHERE table_version_id = ?
       AND min_compensation <= ?
       AND (max_compensation IS NULL OR max_compensation >= ?)
     ORDER BY min_compensation DESC, sort_order DESC
     LIMIT 1`,
    tableVersionId,
    compensationBasis,
    compensationBasis,
  );
  if (!bracket) throw new Error('No contribution bracket covers the selected compensation basis.');
  return bracket;
}

async function assertNoActiveDateOverlap(input: ContributionTableVersionInput, ignoredId: string): Promise<void> {
  if (input.status !== 'active') return;
  const overlap = await getDb().get<{ id: string }>(
    `SELECT id FROM government_contribution_tables
     WHERE contribution_type_id = ?
       AND status = 'active'
       AND id <> ?
       AND effective_from <= COALESCE(NULLIF(?, ''), '9999-12-31')
       AND COALESCE(NULLIF(effective_to, ''), '9999-12-31') >= ?
     LIMIT 1`,
    input.contribution_type_id,
    ignoredId,
    input.effective_to,
    input.effective_from,
  );
  if (overlap) throw new Error('This active table overlaps another active table for the same contribution type.');
}

function validateContributionTypeInput(payload: unknown): ContributionTypeInput {
  const input = asRecord(payload);
  return {
    code: requireText(input.code, 'Code').toUpperCase(),
    name: requireText(input.name, 'Name'),
    authority: requireText(input.authority, 'Authority'),
    description: optionalText(input.description),
    calculation_method: requireEnum(input.calculation_method, ['bracket', 'percentage', 'fixed', 'tax-bracket'], 'Calculation method'),
    government_number_field: requireEnum(input.government_number_field, ['sss_number', 'philhealth_number', 'pagibig_number', 'tin_number', 'none'], 'Government-number field'),
    employee_share_enabled: booleanNumber(input.employee_share_enabled),
    employer_share_enabled: booleanNumber(input.employer_share_enabled),
    is_tax: booleanNumber(input.is_tax),
    is_active: booleanNumber(input.is_active),
  };
}

function validateTableInput(payload: unknown): ContributionTableVersionInput {
  const input = asRecord(payload);
  const effectiveFrom = requireDate(input.effective_from, 'Effective-from date');
  const effectiveTo = optionalDate(input.effective_to, 'Effective-to date');
  if (effectiveTo && effectiveTo < effectiveFrom) throw new Error('Effective-to date cannot be earlier than effective-from date.');
  return {
    contribution_type_id: requireText(input.contribution_type_id, 'Contribution type'),
    version_name: requireText(input.version_name, 'Version name'),
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    status: requireEnum(input.status, ['draft', 'active', 'archived'], 'Table status'),
    notes: optionalText(input.notes),
  };
}

function validateBracketList(payload: unknown): ContributionBracketInput[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error('At least one contribution bracket is required.');
  }
  return payload.map((raw, index) => {
    const input = asRecord(raw);
    const min = nonNegativeNumber(input.min_compensation, `Bracket ${index + 1} minimum compensation`);
    const max = nullableNonNegativeNumber(input.max_compensation, `Bracket ${index + 1} maximum compensation`);
    if (max !== null && max < min) throw new Error(`Bracket ${index + 1} maximum compensation cannot be below its minimum.`);
    return {
      min_compensation: min,
      max_compensation: max,
      employee_fixed: nonNegativeNumber(input.employee_fixed, `Bracket ${index + 1} employee fixed share`),
      employee_rate: nonNegativeNumber(input.employee_rate, `Bracket ${index + 1} employee rate`),
      employee_excess_over: nonNegativeNumber(input.employee_excess_over, `Bracket ${index + 1} employee excess base`),
      employer_fixed: nonNegativeNumber(input.employer_fixed, `Bracket ${index + 1} employer fixed share`),
      employer_rate: nonNegativeNumber(input.employer_rate, `Bracket ${index + 1} employer rate`),
      employer_excess_over: nonNegativeNumber(input.employer_excess_over, `Bracket ${index + 1} employer excess base`),
      notes: optionalText(input.notes),
      sort_order: Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : index,
    };
  });
}

function assertBracketRanges(brackets: ContributionBracketInput[]): void {
  const sorted = [...brackets].sort((a, b) => a.min_compensation - b.min_compensation);
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous.max_compensation === null || previous.max_compensation >= current.min_compensation) {
      throw new Error('Contribution bracket compensation ranges cannot overlap.');
    }
  }
}

function validateCalculationInput(payload: unknown): ContributionCalculationInput {
  const input = asRecord(payload);
  return {
    employee_id: requireText(input.employee_id, 'Employee'),
    contribution_type_id: requireText(input.contribution_type_id, 'Contribution type'),
    contribution_date: requireDate(input.contribution_date, 'Contribution date'),
    compensation_basis: nonNegativeNumber(input.compensation_basis, 'Compensation basis'),
    table_version_id: optionalText(input.table_version_id),
  };
}

function validateRecordInput(payload: unknown): ContributionRecordInput {
  const input = asRecord(payload);
  const calculation = validateCalculationInput(input);
  return {
    ...calculation,
    payroll_period_id: optionalText(input.payroll_period_id),
    reference: optionalText(input.reference),
    notes: optionalText(input.notes),
    status: requireEnum(input.status ?? 'draft', ['draft', 'approved', 'remitted', 'cancelled'], 'Record status'),
  };
}

function parseTypeFilters(filters: unknown): { query: string; include_inactive: boolean } {
  const input = asRecord(filters, false);
  return { query: optionalText(input.query), include_inactive: Boolean(input.include_inactive) };
}

function parseTableFilters(filters: unknown): {
  contribution_type_id: string;
  status: ContributionTableStatus | 'all';
  as_of: string;
  query: string;
} {
  const input = asRecord(filters, false);
  return {
    contribution_type_id: optionalText(input.contribution_type_id),
    status: requireEnum(input.status ?? 'all', ['all', 'draft', 'active', 'archived'], 'Table filter status'),
    as_of: optionalDate(input.as_of, 'As-of date'),
    query: optionalText(input.query),
  };
}

function parseRecordFilters(filters: unknown): {
  employee_id: string;
  contribution_type_id: string;
  status: ContributionRecordStatus | 'all';
  date_from: string;
  date_to: string;
  query: string;
} {
  const input = asRecord(filters, false);
  const dateFrom = optionalDate(input.date_from, 'Date from');
  const dateTo = optionalDate(input.date_to, 'Date to');
  if (dateFrom && dateTo && dateTo < dateFrom) throw new Error('Date-to filter cannot be earlier than date-from.');
  return {
    employee_id: optionalText(input.employee_id),
    contribution_type_id: optionalText(input.contribution_type_id),
    status: requireEnum(input.status ?? 'all', ['all', 'draft', 'approved', 'remitted', 'cancelled'], 'Record filter status'),
    date_from: dateFrom,
    date_to: dateTo,
    query: optionalText(input.query),
  };
}

function calculateShare(compensation: number, fixed: number, rate: number, excessOver: number): number {
  return roundMoney(fixed + Math.max(compensation - excessOver, 0) * (rate / 100));
}

function getGovernmentNumber(
  employee: { sss_number: string | null; philhealth_number: string | null; pagibig_number: string | null; tin_number: string | null },
  field: GovernmentNumberField,
): string {
  if (field === 'none') return '';
  return String(employee[field] ?? '').trim();
}

function safeParseBracket(value: string): ContributionBracketRecord {
  try {
    return JSON.parse(value) as ContributionBracketRecord;
  } catch {
    return {
      id: '', table_version_id: '', min_compensation: 0, max_compensation: null,
      employee_fixed: 0, employee_rate: 0, employee_excess_over: 0,
      employer_fixed: 0, employer_rate: 0, employer_excess_over: 0,
      notes: '', sort_order: 0,
    };
  }
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function asRecord(value: unknown, required = true): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (!required && (value === undefined || value === null)) return {};
  throw new Error('Invalid request payload.');
}

function requireText(value: unknown, label: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required.`);
  return text;
}

function optionalText(value: unknown): string {
  return String(value ?? '').trim();
}

function requireDate(value: unknown, label: string): string {
  const date = optionalDate(value, label);
  if (!date) throw new Error(`${label} is required.`);
  return date;
}

function optionalDate(value: unknown, label: string): string {
  const text = optionalText(value);
  if (!text) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`${label} must use YYYY-MM-DD format.`);
  return text;
}

function nonNegativeNumber(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error(`${label} must be zero or greater.`);
  return number;
}

function nullableNonNegativeNumber(value: unknown, label: string): number | null {
  if (value === '' || value === null || value === undefined) return null;
  return nonNegativeNumber(value, label);
}

function booleanNumber(value: unknown): number {
  return value === true || value === 1 || value === '1' ? 1 : 0;
}

function requireEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  const text = String(value ?? '') as T;
  if (!allowed.includes(text)) throw new Error(`${label} is invalid.`);
  return text;
}

function translateUniqueError(error: unknown, message: string): Error {
  const text = error instanceof Error ? error.message : String(error);
  if (text.includes('UNIQUE constraint failed')) return new Error(message);
  return error instanceof Error ? error : new Error(text);
}
