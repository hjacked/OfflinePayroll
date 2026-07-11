import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { LicenseOverview } from '../models/License';

interface LicenseContextValue {
  license: LicenseOverview | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<LicenseOverview | null>;
}

const LicenseContext = createContext<LicenseContextValue | null>(null);

export function LicenseProvider({ children }: PropsWithChildren) {
  const [license, setLicense] = useState<LicenseOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      const current = await window.api.license.current();
      setLicense(current);
      return current;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to load license status.';
      setError(message);
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<LicenseContextValue>(() => ({
    license,
    loading,
    error,
    refresh,
  }), [license, loading, error, refresh]);

  return <LicenseContext.Provider value={value}>{children}</LicenseContext.Provider>;
}

export function useLicense(): LicenseContextValue {
  const value = useContext(LicenseContext);
  if (!value) throw new Error('useLicense must be used inside LicenseProvider.');
  return value;
}
