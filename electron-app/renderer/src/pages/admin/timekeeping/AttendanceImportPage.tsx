import { type ChangeEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  AttendanceImportResult,
  AttendanceImportRow,
} from '../../../models/Attendance';
import { getErrorMessage } from './utils';

const requiredHeaders = ['employee_number', 'work_date'];
const supportedHeaders = [
  'employee_number',
  'work_date',
  'time_in',
  'time_out',
  'status',
  'schedule_name',
  'break_minutes',
  'notes',
];

export default function AttendanceImportPage() {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<AttendanceImportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AttendanceImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    setRows([]);
    setResult(null);
    setError(null);
    setFileName(file?.name ?? '');
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        throw new Error('The CSV must contain a header and at least one data row.');
      }

      const headers = parsed[0].map((value) => value.trim().toLowerCase());
      const missing = requiredHeaders.filter((header) => !headers.includes(header));
      if (missing.length > 0) {
        throw new Error(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);
      }

      const mapped = parsed
        .slice(1)
        .filter((row) => row.some((cell) => cell.trim() !== ''))
        .map((row) => {
          const values = Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']));
          return {
            employee_number: String(values.employee_number ?? '').trim(),
            work_date: String(values.work_date ?? '').trim(),
            time_in: String(values.time_in ?? '').trim(),
            time_out: String(values.time_out ?? '').trim(),
            status: String(values.status ?? 'present').trim() || 'present',
            schedule_name: String(values.schedule_name ?? '').trim(),
            break_minutes: String(values.break_minutes ?? '').trim(),
            notes: String(values.notes ?? '').trim(),
          } satisfies AttendanceImportRow;
        });

      if (mapped.length === 0) {
        throw new Error('The CSV has no usable attendance rows.');
      }
      setRows(mapped);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to read the CSV file.'));
    }
  }

  async function handleImport(): Promise<void> {
    if (rows.length === 0) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const importResult = await window.api.attendance.importRows(rows);
      setResult(importResult);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to import attendance rows.'));
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate(): void {
    const csv = `${supportedHeaders.join(',')}\nEMP001,2026-07-01,08:00,17:00,present,Regular Day Shift,60,Sample row\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'attendance-import-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="admin-page timekeeping-page" aria-labelledby="attendance-import-title">
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Timekeeping</span>
          <h2 id="attendance-import-title">Import attendance CSV</h2>
          <p>
            Import or update daily attendance by employee number and work date.
            Existing records for the same employee and date are updated.
          </p>
        </div>
        <div className="timekeeping-heading__actions">
          <button className="timekeeping-secondary-button" type="button" onClick={downloadTemplate}>
            Download template
          </button>
          <Link className="timekeeping-secondary-link" to="/admin/timekeeping">
            Back to attendance
          </Link>
        </div>
      </div>

      {error && <div className="timekeeping-alert timekeeping-alert--error">{error}</div>}
      {result && (
        <div className="timekeeping-alert timekeeping-alert--success">
          Imported {result.imported}, updated {result.updated}, failed {result.failed}.
        </div>
      )}

      <div className="timekeeping-import-card">
        <h3>Select CSV file</h3>
        <p>
          Required columns: <code>employee_number</code> and <code>work_date</code>.
          Supported optional columns are time_in, time_out, status, schedule_name,
          break_minutes, and notes.
        </p>
        <label className="timekeeping-file-picker">
          <span>Choose CSV</span>
          <input type="file" accept=".csv,text/csv" onChange={(event) => void handleFile(event)} />
        </label>
        {fileName && <small>Selected: {fileName}</small>}
      </div>

      {rows.length > 0 && (
        <div className="timekeeping-table-card">
          <div className="timekeeping-table-card__header">
            <div>
              <h3>Import preview</h3>
              <p>{rows.length} row{rows.length === 1 ? '' : 's'} ready. First 100 are shown.</p>
            </div>
            <button
              className="timekeeping-primary-button"
              type="button"
              disabled={importing}
              onClick={() => void handleImport()}
            >
              {importing ? 'Importing…' : `Import ${rows.length} rows`}
            </button>
          </div>
          <div className="timekeeping-table-wrap">
            <table className="timekeeping-table timekeeping-table--compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee no.</th>
                  <th>Date</th>
                  <th>Time in</th>
                  <th>Time out</th>
                  <th>Status</th>
                  <th>Schedule</th>
                  <th>Break</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row, index) => (
                  <tr key={`${row.employee_number}-${row.work_date}-${index}`}>
                    <td>{index + 2}</td>
                    <td>{row.employee_number || '—'}</td>
                    <td>{row.work_date || '—'}</td>
                    <td>{row.time_in || '—'}</td>
                    <td>{row.time_out || '—'}</td>
                    <td>{row.status || 'present'}</td>
                    <td>{row.schedule_name || 'Default'}</td>
                    <td>{String(row.break_minutes || 'Default')}</td>
                    <td>{row.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && result.errors.length > 0 && (
        <div className="timekeeping-import-errors">
          <h3>Rows not imported</h3>
          <ul>
            {result.errors.slice(0, 100).map((item) => (
              <li key={`${item.row}-${item.message}`}>
                Row {item.row}: {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
