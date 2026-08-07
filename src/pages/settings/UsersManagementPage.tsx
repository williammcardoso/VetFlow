import React from "react";
import { toast } from "sonner";
import { ShieldCheck, Users, UserPlus, RefreshCw, Search } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  adminResetAppUserPassword,
  createAppUser,
  listAppUsersWithAccessProfile,
  setAppUserActive,
  updateAppUserDisplayName,
  updateAppUserIsVet,
  updateAppUserRole,
  type AppUser,
  type AuthRole,
} from "@/lib/authApi";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const UsersManagementPage: React.FC = () => {
  const { isAdmin, session } = useAuth();
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [busyUserId, setBusyUserId] = React.useState<string | null>(null);
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<AuthRole>("user");
  const [searchText, setSearchText] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = React.useState<"all" | AuthRole>("all");
  const [displayNameDrafts, setDisplayNameDrafts] = React.useState<Record<string, string>>({});
  const [passwordResetUser, setPasswordResetUser] = React.useState<AppUser | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [resettingPassword, setResettingPassword] = React.useState(false);

  const loadUsers = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await listAppUsersWithAccessProfile();
      setUsers(list);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao carregar usuários.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    void loadUsers();
  }, [isAdmin, loadUsers]);

  const filteredUsers = React.useMemo(() => {
    const term = searchText.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        term.length === 0 ||
        user.username.toLowerCase().includes(term) ||
        (user.profile_name || "").toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "all" || (statusFilter === "active" ? user.active : !user.active);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchText, statusFilter, roleFilter]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Preencha usuário e senha.");
      return;
    }
    setCreating(true);
    try {
      const created = await createAppUser({ username, password, role });
      setUsers((prev) => [...prev, created].sort((a, b) => a.username.localeCompare(b.username)));
      setUsername("");
      setPassword("");
      setRole("user");
      toast.success("Usuário criado com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao criar usuário.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: AppUser) => {
    setBusyUserId(user.id);
    try {
      const updated = await setAppUserActive(user.id, !user.active);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      toast.success(`Usuário ${updated.active ? "ativado" : "inativado"} com sucesso.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao atualizar usuário.";
      toast.error(message);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRoleChange = async (user: AppUser, nextRole: AuthRole) => {
    if (nextRole === user.role) return;
    setBusyUserId(user.id);
    try {
      const updated = await updateAppUserRole(user.id, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      toast.success("Papel do usuário atualizado.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao atualizar papel do usuário.";
      toast.error(message);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleSaveDisplayName = async (user: AppUser) => {
    const draft = (displayNameDrafts[user.id] ?? user.display_name ?? "").trim();
    if (draft === (user.display_name || "")) return;
    setBusyUserId(user.id);
    try {
      const updated = await updateAppUserDisplayName(user.id, draft);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao atualizar usuário.";
      toast.error(message);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleToggleVet = async (user: AppUser, isVet: boolean) => {
    setBusyUserId(user.id);
    try {
      const updated = await updateAppUserIsVet(user.id, isVet);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao atualizar usuário.";
      toast.error(message);
    } finally {
      setBusyUserId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordResetUser) return;
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("A confirmação da senha não confere.");
      return;
    }

    setResettingPassword(true);
    try {
      await adminResetAppUserPassword(passwordResetUser.id, newPassword);
      setPasswordResetUser(null);
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Senha redefinida com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao redefinir senha.";
      toast.error(message);
    } finally {
      setResettingPassword(false);
    }
  };

  if (!isAdmin) {
    return (
      <PageShell>
        <PageHeader
          title="Usuários do Sistema"
          description="Acesso restrito a administradores."
          icon={ShieldCheck}
          module="settings"
          breadcrumb={<>Painel &gt; Configurações &gt; Usuários do Sistema</>}
        />
        <Card className="premium-card premium-card--soft border-border/80">
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">Você não possui permissão para gerenciar usuários.</p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Usuários do Sistema"
        description="Gestão administrativa de usuários, papéis e status de acesso."
        icon={Users}
        module="settings"
        breadcrumb={<>Painel &gt; Configurações &gt; Usuários do Sistema</>}
      />

      <div className="space-y-6">
        <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              Novo usuário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="new-username">Usuário</Label>
                <Input
                  id="new-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Ex.: recepcao1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Senha inicial</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Papel</Label>
                <Select value={role} onValueChange={(value) => setRole(value as AuthRole)}>
                  <SelectTrigger id="new-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-[hsl(var(--vf-settings))] text-white hover:bg-[hsl(var(--vf-settings)/0.9)]"
                >
                  {creating ? "Criando..." : "Criar usuário"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
          <CardHeader className="space-y-4">
            <CardTitle className="text-lg">Usuários cadastrados</CardTitle>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Buscar por usuário ou perfil de acesso"
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "all" | AuthRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os papéis</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "active" | "inactive")}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Carregando usuários...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Nenhum usuário encontrado com os filtros atuais.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Nome de exibição (relatórios)</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Veterinário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Perfil de acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <Input
                          value={displayNameDrafts[user.id] ?? user.display_name ?? ""}
                          onChange={(e) => setDisplayNameDrafts((prev) => ({ ...prev, [user.id]: e.target.value }))}
                          onBlur={() => void handleSaveDisplayName(user)}
                          placeholder={`Ex.: Dr(a). ${user.username}`}
                          disabled={busyUserId === user.id}
                          className="h-8 w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value) => void handleRoleChange(user, value as AuthRole)}
                          disabled={busyUserId === user.id || session?.id === user.id}
                        >
                          <SelectTrigger className="h-8 w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={user.is_vet}
                          onCheckedChange={(checked) => void handleToggleVet(user, checked === true)}
                          disabled={busyUserId === user.id}
                          aria-label="É veterinário?"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? "default" : "outline"}>{user.active ? "Ativo" : "Inativo"}</Badge>
                      </TableCell>
                      <TableCell>{user.profile_name || "Sem perfil atribuído"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleToggleActive(user)}
                            disabled={busyUserId === user.id || session?.id === user.id}
                          >
                            {user.active ? "Inativar" : "Ativar"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPasswordResetUser(user)}
                            disabled={busyUserId === user.id}
                          >
                            Resetar senha
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(passwordResetUser)} onOpenChange={(open) => (!open ? setPasswordResetUser(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resetar senha de usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Defina a nova senha para <span className="font-medium text-foreground">{passwordResetUser?.username}</span>.
            </p>
            <div className="space-y-2">
              <Label htmlFor="reset-password">Nova senha</Label>
              <Input
                id="reset-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-password-confirm">Confirmar nova senha</Label>
              <Input
                id="reset-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordResetUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleResetPassword()}
              disabled={resettingPassword}
              className="rounded-md bg-[hsl(var(--vf-settings))] text-white hover:bg-[hsl(var(--vf-settings)/0.9)]"
            >
              {resettingPassword ? "Salvando..." : "Confirmar reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default UsersManagementPage;
