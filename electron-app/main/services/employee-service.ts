import { getDb } from '../db';

export interface Employee {
  id: string;
  name: string;
  email: string;
  department?: string;
  role_title?: string;
}

export async function getAllEmployees(): Promise<{
  data: Employee[];
  total: number;
}> {
  const db = getDb();
  const rows = await db.all(
    `SELECT id, name, email, department, role_title
       FROM employees
      ORDER BY name COLLATE NOCASE ASC`,
  ) as Employee[];

  return { data: rows, total: rows.length };
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const row = await getDb().get(
    `SELECT id, name, email, department, role_title
       FROM employees
      WHERE id = ?`,
    id,
  ) as Employee | undefined;

  return row ?? null;
}
