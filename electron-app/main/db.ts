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

  return database;
}

async function ensureSchema(db: Database): Promise<void> {
  await db.exec(`
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
  `);
}

export function getDb(): Database {
  if (!database) {
    throw new Error('Database has not been initialized. Call initDb() first.');
  }

  return database;
}
