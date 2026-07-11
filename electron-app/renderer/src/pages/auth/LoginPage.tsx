import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getHomePath, useAuth } from '../../auth/AuthContext';

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Sign in - PayPayroll Offline';
  }, []);

  if (!loading && user) {
    return <Navigate to={user.must_change_password ? '/account/change-password' : getHomePath(user)} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const authenticated = await login({ username, password, remember });
      const requested = (location.state as LocationState | null)?.from;
      const destination = authenticated.must_change_password
        ? '/account/change-password'
        : requested && requested !== '/login'
          ? requested
          : getHomePath(authenticated);
      navigate(destination, { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="login-brand">
          <span className="login-brand__mark">PP</span>
          <div>
            <strong>PayPayroll Offline</strong>
            <span>Secure payroll workspace</span>
          </div>
        </div>

        <div className="login-copy">
          <span className="auth-eyebrow">Authentication required</span>
          <h1 id="login-title">Sign in to continue</h1>
          <p>Use your assigned account. Access is limited by your payroll role and linked employee record.</p>
        </div>

        {error && <div className="auth-alert auth-alert--error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <label className="auth-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            Keep me signed in on this computer
          </label>
          <button type="submit" className="auth-primary-button" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login-first-run">
          <strong>First run administrator</strong>
          <span>Username: <code>admin</code></span>
          <span>Temporary password: <code>Admin@12345</code></span>
          <small>You will be required to replace this password immediately.</small>
        </div>
      </section>

      <aside className="login-side-panel" aria-label="Security information">
        <span className="auth-eyebrow">Role-based access</span>
        <h2>One app, controlled access</h2>
        <p>Administrators, HR, payroll officers, supervisors, and employees receive only the screens permitted for their role.</p>
        <div className="login-security-list">
          <span>Encrypted persistent sessions</span>
          <span>PBKDF2 password hashing</span>
          <span>Failed-login lockout</span>
          <span>Employee-account linking</span>
        </div>
      </aside>
    </main>
  );
}
