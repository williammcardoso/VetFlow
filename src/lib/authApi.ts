import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

export type AuthRole = "admin" | "user";

export type AuthSession = {
  id: string;
  username: string;
  role: AuthRole;
};

export type UserProfile = {
  user_id: string;
  full_name: string;
  email: string;
  crmv: string;
  mapa_registration: string;
  signature_text: string;
  updated_at?: string;
};

export type AppUser = {
  id: string;
  username: string;
  role: AuthRole;
  active: boolean;
  profile_id?: string | null;
  profile_name?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AccessProfile = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AccessModule = {
  module_key: string;
  module_label: string;
};

export type AccessPermission = {
  module_key: string;
  module_label: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage: boolean;
};

export type EffectiveAccessPermission = {
  module_key: string;
  can_view: boolean;
  can_edit: boolean;
  can_manage: boolean;
};

const AUTH_STORAGE_KEY = "vf:auth:session";
const AUTH_STORAGE_MODE_KEY = "vf:auth:storage_mode";
const AUTH_PROFILE_CACHE_KEY = "vf:auth:user_profile";
const STORAGE_MODE_LOCAL = "local";
const STORAGE_MODE_SESSION = "session";

function normalizeRpcUser(data: unknown): AppUser | null {
  if (!data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const id = String((row as { id?: string }).id || "");
  const username = String((row as { username?: string }).username || "");
  const roleRaw = String((row as { role?: string }).role || "user");
  const active = Boolean((row as { active?: boolean }).active);
  if (!id || !username) return null;

  const role: AuthRole = roleRaw === "admin" ? "admin" : "user";
  return {
    id,
    username,
    role,
    active,
    profile_id: (row as { profile_id?: string | null }).profile_id ?? null,
    profile_name: (row as { profile_name?: string | null }).profile_name ?? null,
    created_at: (row as { created_at?: string }).created_at,
    updated_at: (row as { updated_at?: string }).updated_at,
  };
}

function ensureSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase não está configurado. Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }
}

function mapAuthErrorMessage(rawMessage?: string): string {
  const message = String(rawMessage || "").toLowerCase();
  if (message.includes("unauthorized")) return "Ação não autorizada para o usuário atual.";
  if (message.includes("cannot_remove_last_admin")) return "Não é permitido remover o último administrador ativo.";
  if (message.includes("cannot_change_own_role")) return "Não é permitido alterar o próprio papel de acesso.";
  if (message.includes("cannot_deactivate_self")) return "Não é permitido inativar o próprio usuário.";
  if (message.includes("password_too_short")) return "A senha deve ter no mínimo 6 caracteres.";
  if (message.includes("profile_name_required")) return "Informe o nome do perfil de acesso.";
  if (message.includes("failed to fetch") || message.includes("network") || message.includes("fetch")) {
    return "Serviço de autenticação indisponível no momento. Tente novamente em instantes.";
  }
  if (message.includes("crypt") || message.includes("gen_salt")) {
    return "Configuração de criptografia indisponível no banco. Aplique a migration de correção de autenticação (pgcrypto).";
  }
  return rawMessage || "Falha na autenticacao.";
}

function readStoredSession(): AuthSession | null {
  try {
    const rawLocal = localStorage.getItem(AUTH_STORAGE_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as AuthSession;
      if (parsed?.id && parsed?.username && parsed?.role) return parsed;
    }
  } catch {
    // ignore
  }

  try {
    const rawSession = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession) as AuthSession;
      if (parsed?.id && parsed?.username && parsed?.role) return parsed;
    }
  } catch {
    // ignore
  }

  return null;
}

function persistSession(session: AuthSession, remember: boolean) {
  const mode = remember ? STORAGE_MODE_LOCAL : STORAGE_MODE_SESSION;
  localStorage.setItem(AUTH_STORAGE_MODE_KEY, mode);
  if (remember) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function normalizeRpcProfile(data: unknown): UserProfile | null {
  if (!data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return null;
  const user_id = String((row as { user_id?: string }).user_id || "");
  if (!user_id) return null;
  return {
    user_id,
    full_name: String((row as { full_name?: string }).full_name || ""),
    email: String((row as { email?: string }).email || ""),
    crmv: String((row as { crmv?: string }).crmv || ""),
    mapa_registration: String((row as { mapa_registration?: string }).mapa_registration || ""),
    signature_text: String((row as { signature_text?: string }).signature_text || ""),
    updated_at: (row as { updated_at?: string }).updated_at,
  };
}

function normalizeAccessProfile(data: unknown): AccessProfile | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const id = String(row.id ?? "");
  if (!id) return null;
  return {
    id,
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    active: Boolean(row.active),
    created_at: typeof row.created_at === "string" ? row.created_at : undefined,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : undefined,
  };
}

function normalizeAccessPermission(data: unknown): AccessPermission | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const module_key = String(row.module_key ?? "");
  if (!module_key) return null;
  return {
    module_key,
    module_label: String(row.module_label ?? module_key),
    can_view: Boolean(row.can_view),
    can_edit: Boolean(row.can_edit),
    can_manage: Boolean(row.can_manage),
  };
}

function cacheUserProfile(profile: UserProfile) {
  try {
    localStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // ignore
  }
}

export function getSession(): AuthSession | null {
  return readStoredSession();
}

export function isAuthenticated(): boolean {
  return Boolean(getSession());
}

export async function signIn(username: string, password: string, options?: { remember?: boolean }): Promise<AuthSession> {
  ensureSupabase();
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("Sem conexao com a internet. Verifique sua rede e tente novamente.");
  }
  const trimmed = username.trim();
  if (!trimmed || !password) {
    throw new Error("Informe usuário e senha.");
  }

  const { data, error } = await supabase.rpc("authenticate_app_user", {
    p_username: trimmed,
    p_password: password,
  });

  if (error) {
    throw new Error(mapAuthErrorMessage(error.message));
  }

  const user = normalizeRpcUser(data);
  if (!user || !user.active) {
    throw new Error("Usuário ou senha inválidos.");
  }

  const session: AuthSession = { id: user.id, username: user.username, role: user.role };
  persistSession(session, options?.remember !== false);
  return session;
}

export function signOut() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(AUTH_STORAGE_MODE_KEY);
  localStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function listAppUsers(): Promise<AppUser[]> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("list_app_users", {
    p_actor_user_id: session.id,
  });

  if (error) {
    throw new Error(error.message || "Falha ao listar usuários.");
  }

  if (!Array.isArray(data)) return [];
  return data
    .map((row) => normalizeRpcUser(row))
    .filter((row): row is AppUser => Boolean(row));
}

export async function listAppUsersWithAccessProfile(): Promise<AppUser[]> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("list_app_users_with_access_profile", {
    p_actor_user_id: session.id,
  });

  if (error) throw new Error(error.message || "Falha ao listar usuários.");
  if (!Array.isArray(data)) return [];
  return data.map((row) => normalizeRpcUser(row)).filter((row): row is AppUser => Boolean(row));
}

export async function createAppUser(params: {
  username: string;
  password: string;
  role?: AuthRole;
}): Promise<AppUser> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("create_app_user", {
    p_actor_user_id: session.id,
    p_username: params.username.trim(),
    p_password: params.password,
    p_role: params.role || "user",
  });

  if (error) throw new Error(mapAuthErrorMessage(error.message));
  const created = normalizeRpcUser(data);
  if (!created) throw new Error("Resposta inválida ao criar usuário.");
  return created;
}

export async function setAppUserActive(targetUserId: string, active: boolean): Promise<AppUser> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("set_app_user_active", {
    p_actor_user_id: session.id,
    p_target_user_id: targetUserId,
    p_active: active,
  });

  if (error) throw new Error(mapAuthErrorMessage(error.message));
  const updated = normalizeRpcUser(data);
  if (!updated) throw new Error("Resposta inválida ao atualizar usuário.");
  return updated;
}

export async function updateAppUserRole(targetUserId: string, role: AuthRole): Promise<AppUser> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("update_app_user_role", {
    p_actor_user_id: session.id,
    p_target_user_id: targetUserId,
    p_role: role,
  });

  if (error) throw new Error(error.message || "Falha ao atualizar perfil do usuário.");
  const updated = normalizeRpcUser(data);
  if (!updated) throw new Error("Resposta inválida ao atualizar perfil do usuário.");
  return updated;
}

export async function adminResetAppUserPassword(targetUserId: string, newPassword: string): Promise<AppUser> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("admin_reset_app_user_password", {
    p_actor_user_id: session.id,
    p_target_user_id: targetUserId,
    p_new_password: newPassword,
  });

  if (error) throw new Error(error.message || "Falha ao redefinir senha.");
  const updated = normalizeRpcUser(data);
  if (!updated) throw new Error("Resposta inválida ao redefinir senha.");
  return updated;
}

export async function getMyUserProfile(): Promise<UserProfile> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("get_my_app_user_profile", {
    p_actor_user_id: session.id,
  });
  if (error) throw new Error(error.message || "Falha ao carregar perfil do usuário.");

  const profile = normalizeRpcProfile(data);
  if (!profile) {
    const fallback = {
      user_id: session.id,
      full_name: "",
      email: "",
      crmv: "",
      mapa_registration: "",
      signature_text: "",
    };
    cacheUserProfile(fallback);
    return fallback;
  }
  cacheUserProfile(profile);
  return profile;
}

export async function saveMyUserProfile(payload: {
  full_name: string;
  email: string;
  crmv: string;
  mapa_registration: string;
  signature_text: string;
}): Promise<UserProfile> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("upsert_my_app_user_profile", {
    p_actor_user_id: session.id,
    p_full_name: payload.full_name,
    p_email: payload.email,
    p_crmv: payload.crmv,
    p_mapa_registration: payload.mapa_registration,
    p_signature_text: payload.signature_text,
  });

  if (error) throw new Error(error.message || "Falha ao salvar perfil do usuário.");
  const profile = normalizeRpcProfile(data);
  if (!profile) throw new Error("Resposta inválida ao salvar perfil.");
  cacheUserProfile(profile);
  return profile;
}

export function getCachedUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed?.user_id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function listAccessModules(): Promise<AccessModule[]> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("list_access_modules", {
    p_actor_user_id: session.id,
  });
  if (error) throw new Error(error.message || "Falha ao listar módulos de acesso.");
  if (!Array.isArray(data)) return [];
  return data
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const module_key = String((row as Record<string, unknown>).module_key ?? "");
      if (!module_key) return null;
      return {
        module_key,
        module_label: String((row as Record<string, unknown>).module_label ?? module_key),
      };
    })
    .filter((row): row is AccessModule => Boolean(row));
}

export async function listAccessProfiles(): Promise<AccessProfile[]> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("list_access_profiles", {
    p_actor_user_id: session.id,
  });
  if (error) throw new Error(error.message || "Falha ao listar perfis de acesso.");
  if (!Array.isArray(data)) return [];
  return data.map((row) => normalizeAccessProfile(row)).filter((row): row is AccessProfile => Boolean(row));
}

export async function createAccessProfile(name: string, description: string): Promise<AccessProfile> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("create_access_profile", {
    p_actor_user_id: session.id,
    p_name: name,
    p_description: description,
  });
  if (error) throw new Error(error.message || "Falha ao criar perfil de acesso.");
  const profile = normalizeAccessProfile(Array.isArray(data) ? data[0] : data);
  if (!profile) throw new Error("Resposta inválida ao criar perfil.");
  return profile;
}

export async function updateAccessProfile(payload: {
  profileId: string;
  name: string;
  description: string;
  active: boolean;
}): Promise<AccessProfile> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("update_access_profile", {
    p_actor_user_id: session.id,
    p_profile_id: payload.profileId,
    p_name: payload.name,
    p_description: payload.description,
    p_active: payload.active,
  });
  if (error) throw new Error(error.message || "Falha ao atualizar perfil de acesso.");
  const profile = normalizeAccessProfile(Array.isArray(data) ? data[0] : data);
  if (!profile) throw new Error("Resposta inválida ao atualizar perfil.");
  return profile;
}

export async function listAccessProfilePermissions(profileId: string): Promise<AccessPermission[]> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("list_access_profile_permissions", {
    p_actor_user_id: session.id,
    p_profile_id: profileId,
  });
  if (error) throw new Error(error.message || "Falha ao listar permissões do perfil.");
  if (!Array.isArray(data)) return [];
  return data.map((row) => normalizeAccessPermission(row)).filter((row): row is AccessPermission => Boolean(row));
}

export async function upsertAccessProfilePermission(payload: {
  profileId: string;
  moduleKey: string;
  canView: boolean;
  canEdit: boolean;
  canManage: boolean;
}): Promise<AccessPermission> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("upsert_access_profile_permission", {
    p_actor_user_id: session.id,
    p_profile_id: payload.profileId,
    p_module_key: payload.moduleKey,
    p_can_view: payload.canView,
    p_can_edit: payload.canEdit,
    p_can_manage: payload.canManage,
  });
  if (error) throw new Error(error.message || "Falha ao atualizar permissão.");
  const row = Array.isArray(data) ? data[0] : data;
  const normalized = normalizeAccessPermission({
    ...(row as Record<string, unknown>),
    module_label: payload.moduleKey,
  });
  if (!normalized) throw new Error("Resposta inválida ao atualizar permissão.");
  return normalized;
}

export async function setUserAccessProfile(targetUserId: string, profileId: string | null): Promise<void> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { error } = await supabase.rpc("set_user_access_profile", {
    p_actor_user_id: session.id,
    p_target_user_id: targetUserId,
    p_profile_id: profileId,
  });
  if (error) throw new Error(error.message || "Falha ao vincular perfil de acesso ao usuário.");
}

export async function getMyEffectiveAccessPermissions(): Promise<EffectiveAccessPermission[]> {
  ensureSupabase();
  const session = getSession();
  if (!session) throw new Error("Sessão inválida.");

  const { data, error } = await supabase.rpc("get_my_effective_access_permissions", {
    p_actor_user_id: session.id,
  });
  if (error) throw new Error(error.message || "Falha ao carregar permissões efetivas.");
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record = row as Record<string, unknown>;
      const module_key = String(record.module_key ?? "");
      if (!module_key) return null;
      return {
        module_key,
        can_view: Boolean(record.can_view),
        can_edit: Boolean(record.can_edit),
        can_manage: Boolean(record.can_manage),
      };
    })
    .filter((row): row is EffectiveAccessPermission => Boolean(row));
}
