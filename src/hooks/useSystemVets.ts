import React from "react";
import { listAppUsers } from "@/lib/authApi";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Nomes de veterinários para preencher os campos "veterinário responsável /
 * solicitante". Fonte única — antes cada tela tinha uma lista fixa fictícia
 * ("Dr. Silva", "Dra. Costa"...).
 *
 * Prioridade do nome exibido: `display_name` (definido pelo admin em
 * Usuários do Sistema, ex.: "Dr. William Cardoso") > `full_name` do perfil
 * (usuário logado) > `username`. A listagem dos demais usuários exige admin
 * (`list_app_users` levanta 'unauthorized' para não-admin), por isso a falha é
 * tolerada: o campo continua funcionando com o próprio usuário (full_name).
 *
 * `onlyVets`: quando true, restringe os DEMAIS usuários aos marcados como
 * veterinário (`is_vet`) no cadastro — o usuário logado sempre aparece
 * (mantém o comportamento antigo para as telas que já usam este hook sem o
 * parâmetro).
 */
export function useSystemVets(options?: { onlyVets?: boolean }): { vets: string[]; loading: boolean } {
  const onlyVets = options?.onlyVets ?? false;
  const { profile } = useCurrentUserProfile();
  const { session } = useAuth();
  const [selfDisplayName, setSelfDisplayName] = React.useState<string | undefined>();
  const [others, setOthers] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    void listAppUsers()
      .then((users) => {
        if (!mounted) return;
        // O próprio usuário pode ter definido um display_name (admin) — isso
        // tem prioridade sobre full_name. Guarda separado do restante da
        // lista para não duplicar (ele não entra em "others").
        const selfEntry = users.find((u) => u.id === session?.id);
        setSelfDisplayName(selfEntry?.display_name?.trim() || undefined);
        setOthers(
          users
            .filter((u) => u.active && u.id !== session?.id && (!onlyVets || u.is_vet))
            .map((u) => u.display_name?.trim() || u.username)
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
  }, [onlyVets, session?.id]);

  const vets = React.useMemo(() => {
    const primary = selfDisplayName || profile?.full_name?.trim();
    // Nome de exibição (ou nome completo) do usuário logado primeiro — é o
    // que vai nos documentos; os demais usuários entram depois, sem duplicar.
    const all = [primary, ...others].filter((n): n is string => Boolean(n && n.trim()));
    return Array.from(new Set(all));
  }, [selfDisplayName, profile?.full_name, others]);

  return { vets, loading };
}
