import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import type { Employee } from '../../../models/Employee';
import type {
  AuthAuditLog,
  AuthUser,
  RoleOption,
  UserAccountInput,
  UserRole,
} from '../../../models/Auth';

const emptyForm: UserAccountInput = {
  username: '',
  display_name: '',
  email: '',
  role: 'employee',
  employee_id: null,
  is_active: true,
  password: '',
};

export default function UserAccountsPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuthAuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [form, setForm] = useState<UserAccountInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<AuthUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const roleLabels = useMemo(
    () => Object.fromEntries(roles.map((item) => [item.value, item.label])) as Record<UserRole, string>,
    [roles],
  );

  async function load() {
    setLoading(true);
    setError('');
    try {
      const active = activeFilter === 'all' ? undefined : activeFilter === 'active';
      const [userResult, employeeResult, roleResult, auditResult] = await Promise.all([
        window.api.user.list({
          search: search || undefined,
          role: roleFilter === 'all' ? undefined : roleFilter,
          active,
        }),
        window.api.employee.list({ status: 'active' }),
        window.api.user.roles(),
        window.api.user.audit(30),
      ]);
      setUsers(userResult.data);
      setEmployees(employeeResult.data);
      setRoles(roleResult);
      setAuditLogs(auditResult.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load user accounts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [roleFilter, activeFilter]);

  function beginCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setNotice('');
  }

  function beginEdit(user: AuthUser) {
    setEditingId(user.id);
    setForm({
      username: user.username,
      display_name: user.display_name,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
      is_active: user.is_active,
    });
    setError('');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId) {
        await window.api.user.update(editingId, form);
        setNotice('User account updated.');
      } else {
        await window.api.user.create(form);
        setNotice('User account created. The user must change the temporary password at first sign-in.');
      }
      beginCreate();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the account.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: AuthUser) {
    if (!window.confirm(`${user.is_active ? 'Deactivate' : 'Activate'} ${user.display_name}?`)) return;
    setError('');
    try {
      await window.api.user.setStatus(user.id, !user.is_active);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to change account status.');
    }
  }

  async function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resetTarget) return;
    setSaving(true);
    setError('');
    try {
      await window.api.user.resetPassword(resetTarget.id, { new_password: resetPassword });
      setNotice(`Temporary password set for ${resetTarget.display_name}.`);
      setResetTarget(null);
      setResetPassword('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to reset the password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="user-accounts-page">
      <header className="module-page-heading">
        <div>
          <span className="module-page-eyebrow">Security administration</span>
          <h2>User Accounts & Roles</h2>
          <p>Create accounts, link employees, control access, and review authentication activity.</p>
        </div>
      </header>

      {error && <div className="auth-alert auth-alert--error">{error}</div>}
      {notice && <div className="auth-alert auth-alert--success">{notice}</div>}

      <div className="user-admin-grid">
        <article className="user-form-card">
          <div className="user-card-heading">
            <div>
              <h3>{editingId ? 'Edit account' : 'Create account'}</h3>
              <p>Employee accounts must be linked to an active employee record.</p>
            </div>
            {editingId && (
              <button type="button" className="auth-secondary-button" onClick={beginCreate}>
                New account
              </button>
            )}
          </div>
          <form className="user-account-form" onSubmit={submitForm}>
            <label>
              Username
              <input
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                required
              />
            </label>
            <label>
              Display name
              <input
                value={form.display_name}
                onChange={(event) => setForm({ ...form, display_name: event.target.value })}
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              Role
              <select
                value={form.role}
                onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </label>
            <label className="user-form-wide">
              Linked employee
              <select
                value={form.employee_id ?? ''}
                onChange={(event) => setForm({ ...form, employee_id: event.target.value || null })}
                required={form.role === 'employee'}
              >
                <option value="">No employee link</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employee_number} — {employee.name}
                  </option>
                ))}
              </select>
            </label>
            {!editingId && (
              <label className="user-form-wide">
                Temporary password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password ?? ''}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                />
                <small>At least 10 characters with uppercase, lowercase, number, and special character.</small>
              </label>
            )}
            <label className="auth-check user-form-wide">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              Account is active
            </label>
            <div className="user-form-actions user-form-wide">
              <button type="submit" className="auth-primary-button" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create account'}
              </button>
              {editingId && (
                <button type="button" className="auth-secondary-button" onClick={beginCreate}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </article>

        <article className="user-list-card">
          <div className="user-card-heading">
            <div>
              <h3>Accounts</h3>
              <p>{users.length} matching account{users.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          <div className="user-filters">
            <input
              placeholder="Search username, name, email, or employee"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void load();
              }}
            />
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as UserRole | 'all')}>
              <option value="all">All roles</option>
              {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <select value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button type="button" className="auth-secondary-button" onClick={() => void load()}>Search</button>
          </div>
          <div className="user-table-wrap">
            <table className="user-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Employee</th>
                  <th>Status</th>
                  <th>Last login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}>Loading accounts…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6}>No accounts found.</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.display_name}</strong>
                      <span>@{user.username}</span>
                    </td>
                    <td>{roleLabels[user.role] ?? user.role}</td>
                    <td>{user.employee_name || '—'}</td>
                    <td>
                      <span className={`user-status user-status--${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {user.must_change_password && <small>Change required</small>}
                    </td>
                    <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</td>
                    <td>
                      <div className="user-row-actions">
                        <button type="button" onClick={() => beginEdit(user)}>Edit</button>
                        <button type="button" onClick={() => setResetTarget(user)}>Reset password</button>
                        <button
                          type="button"
                          className={user.is_active ? 'danger-link' : ''}
                          disabled={currentUser?.id === user.id && user.is_active}
                          onClick={() => void toggleStatus(user)}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article className="user-audit-card">
        <div className="user-card-heading">
          <div>
            <h3>Recent authentication activity</h3>
            <p>Latest login, logout, password, and account-management events.</p>
          </div>
        </div>
        <div className="user-audit-list">
          {auditLogs.map((log) => (
            <div key={log.id}>
              <strong>{log.action.split('_').join(' ')}</strong>
              <span>{log.display_name || log.username}</span>
              <span>{log.details || '—'}</span>
              <time>{new Date(log.created_at).toLocaleString()}</time>
            </div>
          ))}
        </div>
      </article>

      {resetTarget && (
        <div className="auth-modal-backdrop" role="presentation" onMouseDown={() => setResetTarget(null)}>
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="reset-password-title" onMouseDown={(event) => event.stopPropagation()}>
            <h3 id="reset-password-title">Reset password</h3>
            <p>Set a temporary password for {resetTarget.display_name}. The user must replace it at the next sign-in.</p>
            <form className="auth-form" onSubmit={submitReset}>
              <label>
                Temporary password
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  required
                  autoFocus
                />
              </label>
              <div className="user-form-actions">
                <button type="submit" className="auth-primary-button" disabled={saving}>Reset password</button>
                <button type="button" className="auth-secondary-button" onClick={() => setResetTarget(null)}>Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
