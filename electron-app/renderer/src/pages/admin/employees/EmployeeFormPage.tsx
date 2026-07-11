import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  Employee,
  EmployeeInput,
  EmploymentStatus,
  SalaryType,
} from '../../../models/Employee';

interface EmployeeFormState {
  employee_number: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  department: string;
  role_title: string;
  employment_status: EmploymentStatus;
  employment_date: string;
  salary_type: SalaryType;
  basic_salary: string;
  salary_grade: string;
  bank_name: string;
  bank_account: string;
  sss_number: string;
  philhealth_number: string;
  pagibig_number: string;
  tin_number: string;
  is_active: boolean;
}

const emptyForm: EmployeeFormState = {
  employee_number: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  department: '',
  role_title: '',
  employment_status: 'regular',
  employment_date: '',
  salary_type: 'monthly',
  basic_salary: '0',
  salary_grade: '',
  bank_name: '',
  bank_account: '',
  sss_number: '',
  philhealth_number: '',
  pagibig_number: '',
  tin_number: '',
  is_active: true,
};

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    window.api.employee.get(id)
      .then((employee) => {
        if (cancelled) {
          return;
        }
        if (!employee) {
          setError('Employee record was not found.');
          return;
        }
        setForm(employeeToForm(employee));
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

  function updateField<K extends keyof EmployeeFormState>(
    key: K,
    value: EmployeeFormState[K],
  ): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: EmployeeInput = {
        ...form,
        basic_salary: Number(form.basic_salary.replace(/,/g, '')),
      };

      const savedEmployee = id
        ? await window.api.employee.update(id, payload)
        : await window.api.employee.create(payload);

      navigate(`/admin/employees/${savedEmployee.id}`, { replace: true });
    } catch (reason: unknown) {
      setError(getErrorMessage(reason, 'Unable to save employee record.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="admin-page employee-page">
        <div className="employee-empty-state">Loading employee record…</div>
      </section>
    );
  }

  return (
    <section className="admin-page employee-page" aria-labelledby="employee-form-title">
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-heading__eyebrow">Employee management</span>
          <h2 id="employee-form-title">
            {isEditing ? 'Edit employee' : 'Add employee'}
          </h2>
          <p>
            Complete the employee profile, employment, payroll, bank, and government details.
          </p>
        </div>
        <Link className="employee-secondary-link" to="/admin/employees">
          Back to employees
        </Link>
      </div>

      {error && (
        <div className="employee-alert employee-alert--error" role="alert">
          {error}
        </div>
      )}

      <form className="employee-form" onSubmit={(event) => void handleSubmit(event)}>
        <FormSection
          title="Personal information"
          description="Basic identity and contact information."
        >
          <Field label="Employee number" required>
            <input
              value={form.employee_number}
              onChange={(event) => updateField('employee_number', event.target.value)}
              maxLength={30}
              required
            />
          </Field>
          <Field label="First name" required>
            <input
              value={form.first_name}
              onChange={(event) => updateField('first_name', event.target.value)}
              required
            />
          </Field>
          <Field label="Middle name">
            <input
              value={form.middle_name}
              onChange={(event) => updateField('middle_name', event.target.value)}
            />
          </Field>
          <Field label="Last name" required>
            <input
              value={form.last_name}
              onChange={(event) => updateField('last_name', event.target.value)}
              required
            />
          </Field>
          <Field label="Email address" required>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
            />
          </Field>
          <Field label="Phone number">
            <input
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
            />
          </Field>
          <Field label="Residential address" wide>
            <textarea
              rows={3}
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection
          title="Employment information"
          description="Department, position, engagement type, and start date."
        >
          <Field label="Department">
            <input
              value={form.department}
              onChange={(event) => updateField('department', event.target.value)}
            />
          </Field>
          <Field label="Position">
            <input
              value={form.role_title}
              onChange={(event) => updateField('role_title', event.target.value)}
            />
          </Field>
          <Field label="Employment status" required>
            <select
              value={form.employment_status}
              onChange={(event) =>
                updateField('employment_status', event.target.value as EmploymentStatus)
              }
            >
              <option value="probationary">Probationary</option>
              <option value="regular">Regular</option>
              <option value="contractual">Contractual</option>
              <option value="project-based">Project-based</option>
              <option value="part-time">Part-time</option>
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
              <option value="retired">Retired</option>
            </select>
          </Field>
          <Field label="Employment date">
            <input
              type="date"
              value={form.employment_date}
              onChange={(event) => updateField('employment_date', event.target.value)}
            />
          </Field>
          <Field label="Account status" wide>
            <label className="employee-toggle-field">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => updateField('is_active', event.target.checked)}
              />
              <span>
                <strong>{form.is_active ? 'Active employee' : 'Inactive employee'}</strong>
                <small>
                  Inactive employees remain in history but can be excluded from payroll.
                </small>
              </span>
            </label>
          </Field>
        </FormSection>

        <FormSection
          title="Payroll and bank information"
          description="Salary basis and payment account details."
        >
          <Field label="Salary type" required>
            <select
              value={form.salary_type}
              onChange={(event) =>
                updateField('salary_type', event.target.value as SalaryType)
              }
            >
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
              <option value="hourly">Hourly</option>
              <option value="fixed-contract">Fixed contract</option>
            </select>
          </Field>
          <Field label="Basic salary" required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.basic_salary}
              onChange={(event) => updateField('basic_salary', event.target.value)}
              required
            />
          </Field>
          <Field label="Salary grade">
            <input
              value={form.salary_grade}
              onChange={(event) => updateField('salary_grade', event.target.value)}
            />
          </Field>
          <Field label="Bank name">
            <input
              value={form.bank_name}
              onChange={(event) => updateField('bank_name', event.target.value)}
            />
          </Field>
          <Field label="Bank account number">
            <input
              value={form.bank_account}
              onChange={(event) => updateField('bank_account', event.target.value)}
            />
          </Field>
        </FormSection>

        <FormSection
          title="Government identification"
          description="Statutory membership and taxpayer numbers."
        >
          <Field label="SSS number">
            <input
              value={form.sss_number}
              onChange={(event) => updateField('sss_number', event.target.value)}
            />
          </Field>
          <Field label="PhilHealth number">
            <input
              value={form.philhealth_number}
              onChange={(event) => updateField('philhealth_number', event.target.value)}
            />
          </Field>
          <Field label="Pag-IBIG number">
            <input
              value={form.pagibig_number}
              onChange={(event) => updateField('pagibig_number', event.target.value)}
            />
          </Field>
          <Field label="TIN">
            <input
              value={form.tin_number}
              onChange={(event) => updateField('tin_number', event.target.value)}
            />
          </Field>
        </FormSection>

        <div className="employee-form-actions">
          <Link className="employee-secondary-link" to="/admin/employees">
            Cancel
          </Link>
          <button className="employee-primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create employee'}
          </button>
        </div>
      </form>
    </section>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="employee-form-section">
      <div className="employee-form-section__heading">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="employee-form-grid">{children}</div>
    </section>
  );
}

function Field({
  label,
  required = false,
  wide = false,
  children,
}: {
  label: string;
  required?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`employee-form-field${wide ? ' employee-form-field--wide' : ''}`}>
      <span>
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      {children}
    </label>
  );
}

function employeeToForm(employee: Employee): EmployeeFormState {
  return {
    employee_number: employee.employee_number,
    first_name: employee.first_name,
    middle_name: employee.middle_name,
    last_name: employee.last_name,
    email: employee.email,
    phone: employee.phone,
    address: employee.address,
    department: employee.department,
    role_title: employee.role_title,
    employment_status: employee.employment_status,
    employment_date: employee.employment_date,
    salary_type: employee.salary_type,
    basic_salary: String(employee.basic_salary ?? 0),
    salary_grade: employee.salary_grade,
    bank_name: employee.bank_name,
    bank_account: employee.bank_account,
    sss_number: employee.sss_number,
    philhealth_number: employee.philhealth_number,
    pagibig_number: employee.pagibig_number,
    tin_number: employee.tin_number,
    is_active: employee.is_active === 1,
  };
}

function getErrorMessage(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message ? reason.message : fallback;
}
