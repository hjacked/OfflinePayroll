import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Employee } from '../../../models/Employee';

export default function EmployeeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Employee ID is missing.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    window.api.employee.get(id)
      .then((result) => {
        if (!cancelled) {
          setEmployee(result);
          if (!result) {
            setError('Employee record was not found.');
          }
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(reason, 'Unable to load employee record.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function toggleStatus(): Promise<void> {
    if (!employee) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const updated = await window.api.employee.setStatus(
        employee.id,
        employee.is_active !== 1,
      );
      setEmployee(updated);
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to change employee status.'));
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecord(): Promise<void> {
    if (!employee) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${employee.name}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await window.api.employee.delete(employee.id);
      navigate('/admin/employees', { replace: true });
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to delete employee record.'));
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="admin-page employee-page">
        <div className="employee-empty-state">Loading employee record…</div>
      </section>
    );
  }

  if (!employee) {
    return (
      <section className="admin-page employee-page">
        <div className="employee-alert employee-alert--error" role="alert">
          {error ?? 'Employee record was not found.'}
        </div>
        <Link className="employee-secondary-link" to="/admin/employees">
          Back to employees
        </Link>
      </section>
    );
  }

  return (
    <section className="admin-page employee-page" aria-labelledby="employee-detail-title">
      <div className="employee-profile-heading">
        <div className="employee-profile-heading__identity">
          <span className="employee-profile-avatar" aria-hidden="true">
            {getInitials(employee.name)}
          </span>
          <div>
            <span className="admin-page-heading__eyebrow">Employee profile</span>
            <h2 id="employee-detail-title">{employee.name}</h2>
            <p>
              {employee.employee_number} · {employee.role_title || 'Position not set'}
            </p>
          </div>
        </div>

        <div className="employee-profile-heading__actions">
          <span
            className={`employee-status-badge ${
              employee.is_active === 1
                ? 'employee-status-badge--active'
                : 'employee-status-badge--inactive'
            }`}
          >
            {employee.is_active === 1 ? 'Active' : 'Inactive'}
          </span>
          <Link
            className="employee-secondary-link"
            to={`/admin/employees/${employee.id}/edit`}
          >
            Edit profile
          </Link>
          <button
            type="button"
            className="employee-secondary-button"
            onClick={() => void toggleStatus()}
            disabled={busy}
          >
            {employee.is_active === 1 ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {error && (
        <div className="employee-alert employee-alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="employee-detail-grid">
        <DetailSection title="Personal information">
          <DetailItem label="Full name" value={employee.name} />
          <DetailItem label="Email" value={employee.email} />
          <DetailItem label="Phone" value={employee.phone} />
          <DetailItem label="Address" value={employee.address} wide />
        </DetailSection>

        <DetailSection title="Employment information">
          <DetailItem label="Employee number" value={employee.employee_number} />
          <DetailItem label="Department" value={employee.department} />
          <DetailItem label="Position" value={employee.role_title} />
          <DetailItem
            label="Employment status"
            value={formatLabel(employee.employment_status)}
          />
          <DetailItem label="Employment date" value={formatDate(employee.employment_date)} />
        </DetailSection>

        <DetailSection title="Payroll and bank information">
          <DetailItem label="Salary type" value={formatLabel(employee.salary_type)} />
          <DetailItem label="Basic salary" value={formatCurrency(employee.basic_salary)} />
          <DetailItem label="Salary grade" value={employee.salary_grade} />
          <DetailItem label="Bank name" value={employee.bank_name} />
          <DetailItem label="Bank account" value={employee.bank_account} />
        </DetailSection>

        <DetailSection title="Government identification">
          <DetailItem label="SSS number" value={employee.sss_number} />
          <DetailItem label="PhilHealth number" value={employee.philhealth_number} />
          <DetailItem label="Pag-IBIG number" value={employee.pagibig_number} />
          <DetailItem label="TIN" value={employee.tin_number} />
        </DetailSection>
      </div>

      <div className="employee-danger-zone">
        <div>
          <h3>Delete employee record</h3>
          <p>
            Permanently remove this employee. Deactivation is safer when payroll history exists.
          </p>
        </div>
        <button
          type="button"
          className="employee-danger-button"
          onClick={() => void deleteRecord()}
          disabled={busy}
        >
          Delete employee
        </button>
      </div>

      <div className="employee-footer-navigation">
        <Link className="employee-secondary-link" to="/admin/employees">
          Back to employee directory
        </Link>
      </div>
    </section>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="employee-detail-section">
      <h3>{title}</h3>
      <div className="employee-detail-section__grid">{children}</div>
    </section>
  );
}

function DetailItem({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`employee-detail-item${wide ? ' employee-detail-item--wide' : ''}`}>
      <span>{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'EM';
}

function formatLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDate(value: string): string {
  if (!value) {
    return '—';
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(date);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function getErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}
