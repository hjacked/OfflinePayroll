import { Link } from 'react-router-dom';
import { useLicense } from './LicenseContext';
import { useAuth } from '../auth/AuthContext';

export default function LicenseBanner() {
  const { license, loading, error } = useLicense();
  const { can } = useAuth();
  if (loading) return null;
  if (error) {
    return <div className="license-banner license-banner--warning">License status could not be loaded.</div>;
  }
  if (!license || (license.edition !== 'trial' && license.status === 'active')) return null;

  const danger = license.read_only;
  return (
    <div className={danger ? 'license-banner license-banner--danger' : 'license-banner'}>
      <div>
        <strong>{danger ? 'License required — read-only mode' : 'Trial version'}</strong>
        <span>{license.message}</span>
      </div>
      <div className="license-banner__meta">
        {license.max_employees !== null && (
          <span>{license.active_employees}/{license.max_employees} employees</span>
        )}
        {can('settings:manage') ? <Link to="/admin/settings">License settings</Link> : <span>Contact an administrator</span>}
      </div>
    </div>
  );
}
