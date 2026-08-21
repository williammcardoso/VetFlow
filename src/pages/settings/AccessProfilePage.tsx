import React from "react";
import { Shield, PlusCircle, Save } from "lucide-react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  createAccessProfile,
  listAccessModules,
  listAccessProfilePermissions,
  listAccessProfiles,
  listAppUsersWithAccessProfile,
  setUserAccessProfile,
  updateAccessProfile,
  upsertAccessProfilePermission,
  type AccessPermission,
  type AccessProfile,
  type AppUser,
} from "@/lib/authApi";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

const AccessProfilePage: React.FC = () => {
  const { isAdmin, session } = useAuth();
  const [profiles, setProfiles] = React.useState<AccessProfile[]>([]);
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string>("");
  const [permissions, setPermissions] = React.useState<AccessPermission[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingPermissionKey, setSavingPermissionKey] = React.useState<string | null>(null);
  const [bulkUpdatingPermissions, setBulkUpdatingPermissions] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [creatingProfile, setCreatingProfile] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({ name: "", description: "", active: true });

  const selectedProfile = React.useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [profileList, usersList, modulesList] = await Promise.all([
        listAccessProfiles(),
        listAppUsersWithAccessProfile(),
        listAccessModules(),
      ]);
      setProfiles(profileList);
      setUsers(usersList);
      const firstProfileId = profileList[0]?.id || "";
      setSelectedProfileId((prev) => prev || firstProfileId);
      if (firstProfileId) {
        const profilePermissions = await listAccessProfilePermissions(firstProfileId);
        setPermissions(profilePermissions);
      } else {
        setPermissions(
          modulesList.map((module) => ({
            module_key: module.module_key,
            module_label: module.module_label,
            can_view: false,
            can_edit: false,
            can_manage: false,
          }))
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao carregar perfis de acesso.";
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
    void loadData();
  }, [isAdmin, loadData]);

  React.useEffect(() => {
    if (!selectedProfileId) return;
    const profile = profiles.find((item) => item.id === selectedProfileId);
    if (!profile) return;
    setProfileForm({
      name: profile.name,
      description: profile.description,
      active: profile.active,
    });
    void listAccessProfilePermissions(selectedProfileId)
      .then(setPermissions)
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Falha ao carregar permissões do perfil.");
      });
  }, [selectedProfileId, profiles]);

  const handleCreateProfile = async () => {
    if (!profileForm.name.trim()) {
      toast.error("Informe o nome do perfil.");
      return;
    }
    setCreatingProfile(true);
    try {
      const created = await createAccessProfile(profileForm.name, profileForm.description);
      setProfiles((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedProfileId(created.id);
      toast.success("Perfil de acesso criado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar perfil.");
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedProfileId) return;
    setSavingProfile(true);
    try {
      const updated = await updateAccessProfile({
        profileId: selectedProfileId,
        name: profileForm.name,
        description: profileForm.description,
        active: profileForm.active,
      });
      setProfiles((prev) => prev.map((profile) => (profile.id === updated.id ? updated : profile)));
      toast.success("Perfil atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePermission = async (permission: AccessPermission, key: "can_view" | "can_edit" | "can_manage", value: boolean) => {
    if (!selectedProfileId) return;
    setSavingPermissionKey(`${permission.module_key}:${key}`);
    try {
      const next = {
        can_view: key === "can_view" ? value : permission.can_view,
        can_edit: key === "can_edit" ? value : permission.can_edit,
        can_manage: key === "can_manage" ? value : permission.can_manage,
      };
      await upsertAccessProfilePermission({
        profileId: selectedProfileId,
        moduleKey: permission.module_key,
        canView: next.can_view,
        canEdit: next.can_edit,
        canManage: next.can_manage,
      });
      setPermissions((prev) =>
        prev.map((item) =>
          item.module_key === permission.module_key
            ? { ...item, can_view: next.can_view, can_edit: next.can_edit, can_manage: next.can_manage }
            : item
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar permissão.");
    } finally {
      setSavingPermissionKey(null);
    }
  };

  const applyBulkPermissions = async (
    mode: "all" | "can_view" | "can_edit" | "can_manage",
    value: boolean
  ) => {
    if (!selectedProfileId || permissions.length === 0) return;
    setBulkUpdatingPermissions(true);
    try {
      const nextPermissions = permissions.map((permission) => {
        if (mode === "all") {
          return {
            ...permission,
            can_view: value,
            can_edit: value,
            can_manage: value,
          };
        }
        return {
          ...permission,
          [mode]: value,
        };
      });

      await Promise.all(
        nextPermissions.map((permission) =>
          upsertAccessProfilePermission({
            profileId: selectedProfileId,
            moduleKey: permission.module_key,
            canView: permission.can_view,
            canEdit: permission.can_edit,
            canManage: permission.can_manage,
          })
        )
      );

      setPermissions(nextPermissions);
      if (mode === "all") {
        toast.success(value ? "Todas as permissões foram selecionadas." : "Todas as permissões foram limpas.");
      } else {
        const label =
          mode === "can_view" ? "visualização" : mode === "can_edit" ? "edição" : "gerenciamento";
        toast.success(value ? `Permissões de ${label} marcadas para todos os módulos.` : `Permissões de ${label} removidas de todos os módulos.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao aplicar permissões em lote.");
    } finally {
      setBulkUpdatingPermissions(false);
    }
  };

  const handleAssignProfile = async (userId: string, profileId: string) => {
    try {
      await setUserAccessProfile(userId, profileId === "none" ? null : profileId);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                profile_id: profileId === "none" ? null : profileId,
                profile_name: profileId === "none" ? null : profiles.find((p) => p.id === profileId)?.name || null,
              }
            : user
        )
      );
      toast.success("Perfil vinculado ao usuário.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao vincular perfil ao usuário.");
    }
  };

  if (!isAdmin) {
    return (
      <PageShell>
        <PageHeader
          title="Perfis de Acesso"
          description="Acesso restrito a administradores."
          icon={Shield}
          module="settings"
          breadcrumb={<>Painel &gt; Configurações &gt; Perfis de Acesso</>}
        />
        <Card className="premium-card premium-card--soft border-border/80">
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground">Você não possui permissão para gerenciar perfis de acesso.</p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Perfis de Acesso"
        description="Gestão de perfis, permissões por módulo e vinculação com usuários do sistema."
        icon={Shield}
        module="settings"
        breadcrumb={<>Painel &gt; Configurações &gt; Perfis de Acesso</>}
      />

      <div className="space-y-6">
        <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PlusCircle className="h-5 w-5" />
              Cadastro e edição de perfis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nome</Label>
                <Input
                  id="profile-name"
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-description">Descrição</Label>
                <Input
                  id="profile-description"
                  value={profileForm.description}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="profile-active"
                  checked={profileForm.active}
                  onCheckedChange={(checked) => setProfileForm((prev) => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="profile-active" className="cursor-pointer text-sm text-muted-foreground">Perfil ativo</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => void handleCreateProfile()} disabled={creatingProfile}>
                  {creatingProfile ? "Criando..." : "Criar novo perfil"}
                </Button>
                <Button
                  onClick={() => void handleSaveProfile()}
                  disabled={savingProfile || !selectedProfileId}
                  className="bg-[hsl(var(--vf-settings))] text-white hover:bg-[hsl(var(--vf-settings)/0.9)]"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {savingProfile ? "Salvando..." : "Salvar perfil"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Permissões por módulo</span>
              {selectedProfile ? <Badge variant="secondary">{selectedProfile.name}</Badge> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando permissões...</p>
            ) : permissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Selecione um perfil para configurar permissões.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkUpdatingPermissions}
                    onClick={() => void applyBulkPermissions("all", true)}
                  >
                    Selecionar todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={bulkUpdatingPermissions}
                    onClick={() => void applyBulkPermissions("all", false)}
                  >
                    Limpar todos
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={bulkUpdatingPermissions}
                    onClick={() => void applyBulkPermissions("can_view", true)}
                  >
                    Marcar visualização
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={bulkUpdatingPermissions}
                    onClick={() => void applyBulkPermissions("can_edit", true)}
                  >
                    Marcar edição
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={bulkUpdatingPermissions}
                    onClick={() => void applyBulkPermissions("can_manage", true)}
                  >
                    Marcar gerenciamento
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Visualizar</TableHead>
                      <TableHead>Editar</TableHead>
                      <TableHead>Gerenciar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((permission) => (
                      <TableRow key={permission.module_key}>
                        <TableCell className="font-medium">{permission.module_label}</TableCell>
                        <TableCell>
                          <Switch
                            aria-label={`${permission.module_label} - Visualizar`}
                            checked={permission.can_view}
                            disabled={bulkUpdatingPermissions || savingPermissionKey?.startsWith(permission.module_key)}
                            onCheckedChange={(checked) => void updatePermission(permission, "can_view", checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            aria-label={`${permission.module_label} - Editar`}
                            checked={permission.can_edit}
                            disabled={bulkUpdatingPermissions || savingPermissionKey?.startsWith(permission.module_key)}
                            onCheckedChange={(checked) => void updatePermission(permission, "can_edit", checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            aria-label={`${permission.module_label} - Gerenciar`}
                            checked={permission.can_manage}
                            disabled={bulkUpdatingPermissions || savingPermissionKey?.startsWith(permission.module_key)}
                            onCheckedChange={(checked) => void updatePermission(permission, "can_manage", checked)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="vf-surface-card vf-tone-settings card-hover rounded-2xl border-border/80">
          <CardHeader>
            <CardTitle>Vinculação de perfil por usuário</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Papel base</TableHead>
                  <TableHead>Perfil de acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role === "admin" ? "Administrador" : "Usuário"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.profile_id || "none"}
                        onValueChange={(value) => void handleAssignProfile(user.id, value)}
                        disabled={session?.id === user.id && user.role !== "admin"}
                      >
                        <SelectTrigger className="w-[280px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem perfil</SelectItem>
                          {profiles
                            .filter((profile) => profile.active)
                            .map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                      Nenhum usuário disponível para vinculação.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
};

export default AccessProfilePage;