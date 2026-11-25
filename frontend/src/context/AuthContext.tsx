import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  type AccessLevel,
  type DataScope,
  type ModuleKey,
  type UserPermissionsMap,
  type UserRole,
  getModuleScope,
  hasModulePermission,
} from '../lib/permissions';

export type User = {
  id: string | number;
  email: string;
  name: string;
  role: UserRole;
  tenantId: number;
  permissions?: UserPermissionsMap;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (moduleKey: ModuleKey, minLevel?: AccessLevel) => boolean;
  getPermissionScope: (moduleKey: ModuleKey) => DataScope | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = (userData: User) => setUser(userData);
  const logout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
      setUser(null);
      window.location.href = '/login';
    });
  };

  const hasPermission = useCallback(
    (moduleKey: ModuleKey, minLevel: AccessLevel = 'view') =>
      hasModulePermission(user, moduleKey, minLevel),
    [user]
  );

  const getPermissionScope = useCallback(
    (moduleKey: ModuleKey) => getModuleScope(user, moduleKey),
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        hasPermission,
        getPermissionScope,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
