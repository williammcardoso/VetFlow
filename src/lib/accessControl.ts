export type AccessModuleKey =
  | "dashboard"
  | "agenda"
  | "clients"
  | "prescriptions"
  | "financial"
  | "sales"
  | "stock"
  | "registrations"
  | "settings_company"
  | "settings_users"
  | "settings_access_profiles"
  | "settings_external_access";

export type AccessPermissionAction = "view" | "edit" | "manage";

export type EffectiveAccessPermission = {
  module_key: AccessModuleKey | string;
  can_view: boolean;
  can_edit: boolean;
  can_manage: boolean;
};

export function getModuleFromPath(pathname: string): AccessModuleKey | null {
  if (pathname === "/" || pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/agenda")) return "agenda";
  if (pathname.startsWith("/clients") || pathname.startsWith("/animals")) return "clients";
  if (pathname.startsWith("/registrations")) return "registrations";
  if (pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/financial")) return "financial";
  if (pathname.startsWith("/stock")) return "stock";
  if (pathname.startsWith("/settings/company")) return "settings_company";
  if (pathname.startsWith("/settings/users-management")) return "settings_users";
  if (pathname.startsWith("/settings/access-profile")) return "settings_access_profiles";
  if (pathname.startsWith("/settings/external-access")) return "settings_external_access";
  return null;
}

export function checkAccessByModule(
  permissions: EffectiveAccessPermission[],
  moduleKey: AccessModuleKey | string,
  action: AccessPermissionAction = "view"
): boolean {
  const permission = permissions.find((item) => item.module_key === moduleKey);
  if (!permission) return false;
  if (action === "manage") return permission.can_manage;
  if (action === "edit") return permission.can_edit || permission.can_manage;
  return permission.can_view || permission.can_edit || permission.can_manage;
}
