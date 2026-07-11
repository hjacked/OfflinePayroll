import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHomePath, useAuth } from '../../auth/AuthContext';

export default function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const updated = await changePassword(currentPassword, newPassword);
      navigate(getHomePath(updated), { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to change the password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="change-password-page">
      <section className="change-password-card">
        <span className="auth-eyebrow">Account security</span>
        <h1>{user.must_change_password ? 'Create a new password' : 'Change password'}</h1>
        <p>
          Passwords must have at least 10 characters and include uppercase, lowercase, a number, and a special character.
        </p>
        {user.must_change_password && (
          <div className="auth-alert auth-alert--warning">
            The temporary password must be replaced before you can open the payroll system.
          </div>
        )}
        {error && <div className="auth-alert auth-alert--error">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" className="auth-primary-button" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save new password'}
          </button>
          {!user.must_change_password && (
            <button type="button" className="auth-secondary-button" onClick={() => navigate(-1)}>
              Cancel
            </button>
          )}
          {user.must_change_password && (
            <button
              type="button"
              className="auth-link-button"
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
            >
              Sign out
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
