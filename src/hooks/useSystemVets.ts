import React from "react";
import { listAppUsers } from "@/lib/authApi";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";

/**
 * Nomes de veterinários para preencher os campos "veterinário responsável /
 * solicitante". Fonte única — antes cada tela tinha uma lista fixa fictícia
 * ("Dr. Silva", "Dra. Costa"...).
 *
 * O nome do usuário logado vem do perfil (`full_name`), que é o nome usado em
 * documentos e laudos. A listagem dos demais usuários exige admin
 * (`list_app_users` levanta 'unauthorized' para não-admin), por isso a falha é
 * tolerada: o campo continua funcionando com o próprio usuário.
 */
export function useSystemVets(): { vets: string[]; loading: boolean } {
  const { profile } = useCurrentUserProfile();
  const [others, setOthers] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    void listAppUsers()
      .then((users) => {
        if (!mounted) return;
        setOthers(
          users
            .filter((u) => u.active)
            .map((u) => u.username)
            .filter(Boolean)
        );
      })
      .catch(() => {
        // Usuário sem permissão para listar (não-admin): segue só com o perfil.
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const vets = React.useMemo(() => {
    const primary = profile?.full_name?.trim();
    // Nome completo do perfil primeiro (é o que vai nos documentos);
    // usernames dos demais usuários entram depois, sem duplicar.
    const all = [primary, ...others].filter((n): n is string => Boolean(n && n.trim()));
    return Array.from(new Set(all));
  }, [profile?.full_name, others]);

  return { vets, loading };
}
