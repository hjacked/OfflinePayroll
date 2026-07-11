import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import type { AuthUser, LoginInput } from '../models/Auth';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (payload: LoginInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthUser>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const current = await window.api.auth.initialize();
    setUser(current);
    return current;
  }, []);

  useEffect(() => {
    refresh()
      .catch((error) => console.error('Unable to restore authentication session:', error))
      .finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (payload: LoginInput) => {
    const authenticated = await window.api.auth.login(payload);
    setUser(authenticated);
    return authenticated;
  }, []);

  const logout = useCallback(async () => {
    await window.api.auth.logout();
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const updated = await window.api.auth.changePassword({
      current_password: currentPassword,
      new_password: newPassword,
    });
    setUser(updated);
    return updated;
  }, []);

  const can = useCallback((permission: string) => {
    if (!user) return false;
    if (user.permissions.includes('*') || user.permissions.includes(permission)) return true;
    if (permission.endsWith(':view')) {
      return user.permissions.includes(permission.replace(':view', ':manage'));
    }
    return false;
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login,
    logout,
    refresh,
    changePassword,
    can,
  }), [user, loading, login, logout, refresh, changePassword, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}

export function getHomePath(user: AuthUser): string {
  return user.role === 'employee' ? '/employee' : '/admin/dashboard';
}
