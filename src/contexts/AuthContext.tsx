import React from "react";
import type { AuthRole, AuthSession } from "@/lib/authApi";
import { getMyEffectiveAccessPermissions, getSession, signIn as signInApi, signOut as signOutApi } from "@/lib/authApi";
import type { AccessPermissionAction, EffectiveAccessPermission } from "@/lib/accessControl";
import { checkAccessByModule, getModuleFromPath } from "@/lib/accessControl";

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  permissionsLoading: boolean;
  permissions: EffectiveAccessPermission[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  signIn: (username: string, password: string, options?: { remember?: boolean }) => Promise<void>;
  signOut: () => void;
  canAccessModule: (moduleKey: string, action?: AccessPermissionAction) => boolean;
  canAccessPath: (pathname: string, action?: AccessPermissionAction) => boolean;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = React.useState<AuthSession | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [permissions, setPermissions] = React.useState<EffectiveAccessPermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = React.useState(false);

  React.useEffect(() => {
    setSession(getSession());
    setLoading(false);
  }, []);

  const signIn = React.useCallback(async (username: string, password: string, options?: { remember?: boolean }) => {
    const nextSession = await signInApi(username, password, options);
    setSession(nextSession);
  }, []);

  const signOut = React.useCallback(() => {
    signOutApi();
    setSession(null);
    setPermissions([]);
  }, []);

  React.useEffect(() => {
    if (!session) {
      setPermissions([]);
      setPermissionsLoading(false);
      return;
    }

    let mounted = true;
    setPermissionsLoading(true);
    void getMyEffectiveAccessPermissions()
      .then((rows) => {
        if (!mounted) return;
        setPermissions(rows);
      })
      .catch(() => {
        if (!mounted) return;
        setPermissions([]);
      })
      .finally(() => {
        if (!mounted) return;
        setPermissionsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [session]);

  const canAccessModule = React.useCallback(
    (moduleKey: string, action: AccessPermissionAction = "view") => {
      if (!session) return false;
      if ((session.role as AuthRole) === "admin") return true;
      return checkAccessByModule(permissions, moduleKey, action);
    },
    [permissions, session]
  );

  const canAccessPath = React.useCallback(
    (pathname: string, action: AccessPermissionAction = "view") => {
      const moduleKey = getModuleFromPath(pathname);
      if (!moduleKey) return true;
      return canAccessModule(moduleKey, action);
    },
    [canAccessModule]
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      permissionsLoading,
      permissions,
      isAuthenticated: Boolean(session),
      isAdmin: (session?.role as AuthRole | undefined) === "admin",
      signIn,
      signOut,
      canAccessModule,
      canAccessPath,
    }),
    [session, loading, permissionsLoading, permissions, signIn, signOut, canAccessModule, canAccessPath]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
