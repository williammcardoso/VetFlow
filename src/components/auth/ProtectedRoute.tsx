import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { AccessPermissionAction } from "@/lib/accessControl";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requireRole?: "admin" | "user";
  requireModule?: string;
  requireAction?: AccessPermissionAction;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireRole, requireModule, requireAction }) => {
  const { isAuthenticated, loading, permissionsLoading, session, canAccessModule } = useAuth();
  const location = useLocation();

  if (loading || permissionsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando sessão...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireRole && session?.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireModule && !canAccessModule(requireModule, requireAction || "view")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
