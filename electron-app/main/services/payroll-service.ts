import { randomUUID } from 'node:crypto';
import { getDb } from '../db';

export interface CreatePayrollPeriodInput {
  name: string;
  start_date: string;
  end_date: string;
  frequency: string;
  created_by?: string;
}

export interface PayrollPeriod extends CreatePayrollPeriodInput {
  id: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export async function createPayrollPeriod(
  value: unknown,
): Promise<{ period: PayrollPeriod }> {
  const input = validateCreateInput(value);
  const id = `pp_${randomUUID()}`;
  const db = getDb();

  await db.run(
    `INSERT INTO payroll_periods (
       id, name, start_date, end_date, frequency, status, created_by
     ) VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    id,
    input.name,
    input.start_date,
    input.end_date,
    input.frequency,
    input.created_by ?? null,
  );

  const period = await db.get(
    `SELECT id, name, start_date, end_date, frequency, status,
            created_by, created_at, updated_at
       FROM payroll_periods
      WHERE id = ?`,
    id,
  ) as PayrollPeriod | undefined;

  if (!period) {
    throw new Error('Payroll period was created but could not be retrieved.');
  }

  return { period };
}

export async function runPayroll(periodId: string): Promise<{
  periodId: string;
  status: string;
}> {
  const db = getDb();
  const result = await db.run(
    `UPDATE payroll_periods
        SET status = 'processing', updated_at = datetime('now')
      WHERE id = ? AND status = 'open'`,
    periodId,
  );

  if (result.changes !== 1) {
    const existing = await db.get(
      'SELECT status FROM payroll_periods WHERE id = ?',
      periodId,
    ) as { status: string } | undefined;

    if (!existing) {
      throw new Error('Payroll period was not found.');
    }

    throw new Error(
      `Payroll period cannot be started while its status is "${existing.status}".`,
    );
  }

  return { periodId, status: 'processing' };
}

function validateCreateInput(value: unknown): CreatePayrollPeriodInput {
  if (!value || typeof value !== 'object') {
    throw new Error('Payroll-period details are required.');
  }

  const input = value as Record<string, unknown>;
  const name = requiredString(input.name, 'name');
  const startDate = requiredDate(input.start_date, 'start_date');
  const endDate = requiredDate(input.end_date, 'end_date');
  const frequency = requiredString(input.frequency, 'frequency');
  const createdBy = optionalString(input.created_by, 'created_by');

  if (startDate > endDate) {
    throw new Error('The payroll start date cannot be after the end date.');
  }

  return {
    name,
    start_date: startDate,
    end_date: endDate,
    frequency,
    created_by: createdBy,
  };
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required.`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string.`);
  }
  return value.trim();
}

function requiredDate(value: unknown, field: string): string {
  const date = requiredString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new Error(`${field} must use YYYY-MM-DD format.`);
  }
  return date;
}
