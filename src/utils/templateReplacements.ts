import { Client, Animal } from "@/types/client";
import { mockCompanySettings } from "@/mockData/settings";
import { getCachedUserProfile, type UserProfile } from "@/lib/authApi";

export function replaceTemplateVariables(
  content: string,
  pet?: Animal,
  client?: Client,
  userProfile?: UserProfile | null
): string {
  if (!content) return content;
  const resolvedProfile = userProfile ?? getCachedUserProfile();
  const now = new Date();
  const today = now.toLocaleDateString("pt-BR");
  const dataAbrev = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const dataExtenso = now.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const ano = String(now.getFullYear());
  const mes = String(now.getMonth() + 1);
  const dia = String(now.getDate());
  const vetCrmv = resolvedProfile?.crmv || "";
  const [vetState = "SP", vetNumber = ""] = vetCrmv.split("/").map((s) => s.trim());
  const address = client?.address;
  const tutorEndereco = address
    ? `${address.street}, ${address.number || "S/N"} - ${address.neighborhood || ""}, ${address.city || ""}-${address.state || "SP"}`
    : "";
  const petAge = pet?.birthday
    ? (() => {
        const birth = new Date(pet.birthday);
        const now2 = new Date();
        let years = now2.getFullYear() - birth.getFullYear();
        let months = now2.getMonth() - birth.getMonth();
        let days = now2.getDate() - birth.getDate();
        if (days < 0) {
          months--;
          days += new Date(now2.getFullYear(), now2.getMonth(), 0).getDate();
        }
        if (months < 0) {
          years--;
          months += 12;
        }
        return {
          anos: years,
          meses: months,
          dias: days,
          texto: years > 0 ? `${years} ano(s)` : "Menos de 1 ano",
          extensa:
            years > 0
              ? months > 0
                ? days > 0
                  ? `${years} ano(s), ${months} mês(es) e ${days} dia(s)`
                  : `${years} ano(s) e ${months} mês(es)`
                : days > 0
                  ? `${years} ano(s) e ${days} dia(s)`
                  : `${years} ano(s)`
              : months > 0
                ? days > 0
                  ? `${months} mês(es) e ${days} dia(s)`
                  : `${months} mês(es)`
                : `${days} dia(s)`,
        };
      })()
    : { anos: 0, meses: 0, dias: 0, texto: "", extensa: "" };

  const replacements: Record<string, string> = {
    "{{ano}}": ano,
    "{{cidade}}": (mockCompanySettings.city || client?.address?.city) ?? "",
    "{{data}}": today,
    "{{data_abrev}}": dataAbrev,
    "{{data_extenso}}": dataExtenso,
    "{{data_obito}}": today,
    "{{data_vencimento}}": today,
    "{{dia}}": dia,
    "{{mes}}": mes,
    "{{motivo_eutanasia}}": "_________________________",
    "{{motivo_internacao}}": "_________________________",
    "{{observacoes}}": "",
    "{{pet_anos}}": typeof petAge === "object" ? String(petAge.anos) : "",
    "{{pet_dias}}": typeof petAge === "object" ? String(petAge.dias) : "",
    "{{pet_especie}}": pet?.species ?? "",
    "{{pet_idade}}": typeof petAge === "object" ? petAge.texto : String(petAge),
    "{{pet_idade_extensa}}": typeof petAge === "object" ? petAge.extensa : "",
    "{{pet_meses}}": typeof petAge === "object" ? String(petAge.meses) : "",
    "{{pet_microchip}}": pet?.microchip ?? "Não informado",
    "{{pet_nome}}": pet?.name ?? "",
    "{{pet_pelagem}}": pet?.coatColor ?? "",
    "{{pet_peso}}": pet?.weight != null ? String(pet.weight) : "",
    "{{pet_raca}}": pet?.breed ?? "SRD",
    "{{pet_sexo}}": pet?.gender ?? "",
    "{{procedimento}}": "_________________________",
    "{{tratamento_recusado}}": "_________________________",
    "{{tutor_cpf}}": client?.identificationNumber ?? "",
    "{{tutor_endereco}}": tutorEndereco,
    "{{tutor_nome}}": client?.name ?? "",
    "{{tutor_telefone}}": client?.mainPhoneContact ?? "",
    "{{tutor_rg}}": client?.secondaryIdentification ?? "",
    "{{validade}}": "10",
    "{{vet_crmv}}": vetNumber || vetCrmv,
    "{{vet_estado}}": vetState,
    "{{vet_mapa}}": resolvedProfile?.mapa_registration || "",
    "{{vet_assinatura}}": resolvedProfile?.signature_text || resolvedProfile?.full_name || "",
    "{{vet_nome}}": resolvedProfile?.full_name || resolvedProfile?.signature_text || "_________________________",
  };

  let result = content;
  Object.entries(replacements).forEach(([key, value]) => {
    // create a case-insensitive regexp for the placeholder
    const pattern = new RegExp(key.replace(/[{}]/g, "\\$&"), "gi");
    result = result.replace(pattern, value);
  });
  return result;
}

