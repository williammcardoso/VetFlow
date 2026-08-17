import React, { useMemo, useState } from "react";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { ToolbarRow } from "@/components/saas/ToolbarRow";
import { DataTableFrame } from "@/components/saas/DataTableFrame";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BookOpen, Search, FileText, Eye, PenSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDocumentTemplates, useDocumentTemplateVersion } from "@/hooks/useDocumentTemplates";
import type { DocumentTemplateGroup, DocumentTemplateListItem } from "@/types/documentTemplate";

const GROUP_ORDER: DocumentTemplateGroup[] = ["atestados", "consentimento", "recusa", "administrativo"];

const GROUP_LABEL: Record<DocumentTemplateGroup, string> = {
  atestados: "Grupo A — Atestados e Declarações",
  consentimento: "Grupo B — Termos de Consentimento (TCLE)",
  recusa: "Grupo C — Recusa / Não Aceite",
  administrativo: "Grupo D — Complementares e Administrativos",
};

const GROUP_BADGE_CLASS: Record<DocumentTemplateGroup, string> = {
  atestados: "border-sky-400/50 bg-sky-100/70 text-sky-700",
  consentimento: "border-teal-400/50 bg-teal-100/70 text-teal-700",
  recusa: "border-amber-400/50 bg-amber-100/70 text-amber-700",
  administrativo: "border-violet-400/50 bg-violet-100/70 text-violet-700",
};

// Espelha a "Matriz de emissão" (seção 5 da biblioteca) — só os marcados
// como "Sim" na coluna "Obrigatório pela Res. 1.321/2020". Os do Grupo C
// (recusa) são "Derivado do art. 10, II" — importante na prática, mas não
// literalmente exigido pela mesma norma, por isso não entram aqui.
const OBRIGATORIO_RES_1321 = new Set([
  "A2", "A3", "A4",
  "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9", "B10",
]);

function DocumentPreviewDialog({ template, onClose }: { template: DocumentTemplateListItem | null; onClose: () => void }) {
  const { data: versao, isLoading, isError } = useDocumentTemplateVersion(template?.id ?? null);

  return (
    <Dialog open={!!template} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">{template?.codigo}</span>
            {template?.titulo}
          </DialogTitle>
          <DialogDescription>
            {template && GROUP_LABEL[template.grupo]}
            {template?.numeroVias ? ` · ${template.numeroVias} via(s)` : ""}
            {template?.exigeAssinaturaResponsavel ? " · assinatura do responsável exigida" : ""}
            {template?.exigeTestemunhas ? " · pode exigir testemunhas" : ""}
          </DialogDescription>
        </DialogHeader>

        {template?.baseLegal && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Base legal: </span>
            {template.baseLegal}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : isError || !versao ? (
          <Alert variant="destructive">
            <AlertTitle>Não foi possível carregar o texto deste modelo</AlertTitle>
          </Alert>
        ) : (
          <>
            <pre className="whitespace-pre-wrap rounded-lg border border-border bg-card p-4 font-sans text-sm leading-relaxed text-foreground">
              {versao.corpo}
            </pre>
            {versao.variaveisRequeridas.length > 0 && (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Variáveis usadas neste modelo ({versao.variaveisRequeridas.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {versao.variaveisRequeridas.map((v) => (
                    <Badge key={v} variant="outline" className="font-mono text-[10px]">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const DocumentLibraryPage: React.FC = () => {
  const { data: templates, isLoading, isError, error } = useDocumentTemplates();
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<DocumentTemplateGroup | "all">("all");
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplateListItem | null>(null);

  const filtered = useMemo(() => {
    const list = templates ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((t) => {
      const matchesGroup = groupFilter === "all" || t.grupo === groupFilter;
      const matchesSearch =
        term.length === 0 ||
        t.codigo.toLowerCase().includes(term) ||
        t.titulo.toLowerCase().includes(term) ||
        (t.categoria ?? "").toLowerCase().includes(term);
      return matchesGroup && matchesSearch;
    });
  }, [templates, search, groupFilter]);

  const grouped = useMemo(() => {
    const map = new Map<DocumentTemplateGroup, DocumentTemplateListItem[]>();
    for (const grupo of GROUP_ORDER) map.set(grupo, []);
    for (const item of filtered) {
      map.get(item.grupo)?.push(item);
    }
    return map;
  }, [filtered]);

  return (
    <PageShell>
      <PageHeader
        title="Biblioteca de Documentos"
        description="Os 30 modelos oficiais (termos, atestados e afins) da Resolução CFMV nº 1.321/2020, alterada pela nº 1.653/2025."
        icon={BookOpen}
        module="registry"
        breadcrumb={<>Painel &gt; Cadastros &gt; Biblioteca de Documentos</>}
      />

      <SectionCard title="Busca" icon={Search} tone="registry">
        <ToolbarRow>
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, título ou categoria"
              className="vf-toolbar-control rounded-xl border-border bg-input pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant={groupFilter === "all" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setGroupFilter("all")}
          >
            Todos
          </Button>
          {GROUP_ORDER.map((grupo) => (
            <Button
              key={grupo}
              variant={groupFilter === grupo ? "secondary" : "outline"}
              size="sm"
              onClick={() => setGroupFilter(grupo)}
            >
              {GROUP_LABEL[grupo].split(" — ")[0]}
            </Button>
          ))}
        </ToolbarRow>
      </SectionCard>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar a biblioteca de documentos</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : "Erro desconhecido."}</AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <SectionCard title="Carregando..." icon={FileText} tone="registry">
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </SectionCard>
      ) : (
        GROUP_ORDER.map((grupo) => {
          const items = grouped.get(grupo) ?? [];
          if (items.length === 0) return null;
          return (
            <SectionCard key={grupo} title={GROUP_LABEL[grupo]} icon={FileText} tone="registry">
              <DataTableFrame empty={items.length === 0}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Código</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead className="w-28 text-center">Vias</TableHead>
                      <TableHead className="w-40">Assinatura</TableHead>
                      <TableHead className="w-32">Res. 1.321/2020</TableHead>
                      <TableHead className="w-40 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={item.id} className={cn(index % 2 === 1 && "bg-muted/50")}>
                        <TableCell className="font-mono text-sm font-medium">{item.codigo}</TableCell>
                        <TableCell>{item.titulo}</TableCell>
                        <TableCell className="text-center">{item.numeroVias ?? "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.exigeAssinaturaResponsavel
                            ? item.exigeTestemunhas
                              ? "Responsável (ou testemunhas)"
                              : "Responsável"
                            : item.exigeTestemunhas
                              ? "Testemunhas"
                              : "Não"}
                        </TableCell>
                        <TableCell>
                          {OBRIGATORIO_RES_1321.has(item.codigo) ? (
                            <Badge variant="outline" className={GROUP_BADGE_CLASS[item.grupo]}>
                              Obrigatório
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Complementar
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => setPreviewTemplate(item)}>
                            <Eye className="mr-2 h-4 w-4" /> Ver
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/registrations/document-library/${item.codigo}/edit`}>
                              <PenSquare className="mr-2 h-4 w-4" /> Editar
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </DataTableFrame>
            </SectionCard>
          );
        })
      )}

      <DocumentPreviewDialog template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
    </PageShell>
  );
};

export default DocumentLibraryPage;
