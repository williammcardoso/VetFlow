import { useQuery } from "@tanstack/react-query";
import { getDocumentTemplates, getLatestDocumentTemplateVersion } from "@/lib/documentTemplatesApi";

export function useDocumentTemplates() {
  return useQuery({
    queryKey: ["document-templates"],
    queryFn: getDocumentTemplates,
    staleTime: 1000 * 60 * 5,
  });
}

export function useDocumentTemplateVersion(templateId: string | null) {
  return useQuery({
    queryKey: ["document-template-version", templateId],
    queryFn: () => getLatestDocumentTemplateVersion(templateId as string),
    enabled: !!templateId,
    staleTime: 1000 * 60 * 5,
  });
}
