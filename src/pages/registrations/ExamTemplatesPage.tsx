import React from "react";
import { FlaskConical, LayoutTemplate, Pencil, Plus, Search, Table2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { TONES } from "@/components/finance/financeTheme";
import { CustomExamBuilder } from "@/components/exams/CustomExamBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { blocksFromTemplate, deleteExamTemplate, listExamTemplates, saveExamTemplate, templateIdFor, templateBlocks } from "@/lib/customExam";
import type { CustomExamBlock, CustomExamTemplate } from "@/types/exam";
import { cn } from "@/lib/utils";

interface Draft {
  /** id do modelo que está sendo editado (null = novo) */
  originalId: string | null;
  name: string;
  metodo: string;
  material: string;
  blocks: CustomExamBlock[];
}

const countBy = (t: CustomExamTemplate, kind: CustomExamBlock["kind"]) => t.blocks.filter((b) => b.kind === kind).length;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Cadastros > Modelos de exame: o formato dos exames montados em blocos
// (tipo "Outro", Urinálise...). O modelo nasce sozinho ao salvar o primeiro
// exame; aqui dá para criar do zero, renomear, ajustar e apagar.
export default function ExamTemplatesPage() {
  const [templates, setTemplates] = React.useState<CustomExamTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<CustomExamTemplate | null>(null);
  const editorRef = React.useRef<HTMLDivElement>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    setTemplates(await listExamTemplates());
    setLoading(false);
  }, []);
  React.useEffect(() => {
    void reload();
  }, [reload]);

  const openEditor = (t: CustomExamTemplate | null) => {
    setDraft(
      t
        ? { originalId: t.id, name: t.name, metodo: t.metodo || "", material: t.material || "", blocks: blocksFromTemplate(t) }
        : { originalId: null, name: "", metodo: "", material: "", blocks: [] }
    );
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const save = async () => {
    if (!draft || saving) return;
    const name = draft.name.trim();
    if (!name) {
      toast.error("Informe o nome do exame.");
      return;
    }
    if (templateBlocks(draft.blocks).length === 0) {
      toast.error("Adicione pelo menos um analito ou bloco.");
      return;
    }
    const newId = templateIdFor(name);
    const clash = templates.find((t) => t.id === newId && t.id !== draft.originalId);
    if (clash) {
      toast.error(`Já existe um modelo chamado "${clash.name}".`);
      return;
    }
    setSaving(true);
    try {
      const ok = await saveExamTemplate({ name, metodo: draft.metodo, material: draft.material, blocks: draft.blocks });
      if (!ok) {
        toast.error("Não foi possível salvar o modelo.");
        return;
      }
      // Renomeou: o id vem do nome, então apaga o antigo.
      if (draft.originalId && draft.originalId !== newId) await deleteExamTemplate(draft.originalId);
      toast.success(draft.originalId ? `Modelo "${name}" atualizado.` : `Modelo "${name}" criado.`);
      setDraft(null);
      await reload();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const ok = await deleteExamTemplate(toDelete.id);
    if (ok) {
      toast.success(`Modelo "${toDelete.name}" apagado. Os exames já lançados não mudam.`);
      if (draft?.originalId === toDelete.id) setDraft(null);
      await reload();
    } else toast.error("Não foi possível apagar o modelo.");
    setToDelete(null);
  };

  const filtered = templates.filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Modelos de exame"
        description="Formato dos exames montados em blocos (tipo Outro, Urinálise, Fezes...) — o exame já vem montado ao lançar."
        icon={LayoutTemplate}
        module="registry"
        breadcrumb={<>Painel &gt; Cadastros &gt; Modelos de exame</>}
        className="mb-0 sm:mb-0"
        actions={
          <Button type="button" onClick={() => openEditor(null)} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden />
            Novo modelo
          </Button>
        }
      />

      {draft && (
        <div ref={editorRef}>
          <Panel
            title={draft.originalId ? `Editar modelo` : "Novo modelo"}
            icon={Pencil}
            tone="teal"
            description="Só o formato: nomes, unidades, referências e tabelas. Os resultados são preenchidos em cada exame."
          >
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-name">Nome do exame</Label>
                  <Input
                    id="tpl-name"
                    value={draft.name}
                    placeholder="Ex.: Contagem de reticulócitos"
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="bg-input font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-metodo">Método</Label>
                  <Input id="tpl-metodo" value={draft.metodo} placeholder="opcional" onChange={(e) => setDraft({ ...draft, metodo: e.target.value })} className="bg-input" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tpl-amostra">Amostra</Label>
                  <Input id="tpl-amostra" value={draft.material} placeholder="opcional" onChange={(e) => setDraft({ ...draft, material: e.target.value })} className="bg-input" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Para usar com Urinálise, Exame de Fezes, Raio-X ou Ultrassonografia, dê ao modelo exatamente o nome do tipo — ele vem montado ao escolher o tipo.
              </p>
              <CustomExamBuilder templateMode blocks={draft.blocks} onChange={(blocks) => setDraft({ ...draft, blocks })} />
              <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void save()} disabled={saving} className="bg-teal-600 text-white hover:bg-teal-700">
                  {saving ? "Salvando..." : "Salvar modelo"}
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      <Panel
        title="Modelos salvos"
        icon={LayoutTemplate}
        tone="sky"
        description={loading ? "Carregando..." : plural(templates.length, "modelo", "modelos")}
        actions={
          templates.length > 5 ? (
            <div className="relative w-44 sm:w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar modelo" className="h-9 bg-input pl-8" />
            </div>
          ) : null
        }
      >
        {loading ? (
          <ul className="divide-y divide-border/70" aria-busy>
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
                <span className="h-4 w-48 animate-pulse rounded bg-muted" />
              </li>
            ))}
          </ul>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-100">
              <LayoutTemplate className="h-5 w-5" aria-hidden />
            </span>
            <p className="mt-2 text-sm font-semibold text-foreground">{templates.length ? "Nenhum modelo com esse nome" : "Nenhum modelo ainda"}</p>
            <p className="mx-auto max-w-md text-xs text-muted-foreground">
              O modelo é criado sozinho quando você salva um exame do tipo <strong>Outro</strong> (ou Urinálise, Fezes...). Também dá para criar aqui em{" "}
              <strong>Novo modelo</strong>.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/70">
            {filtered.map((t) => {
              const analitos = countBy(t, "analito");
              const tabelas = countBy(t, "referencia");
              const editing = draft?.originalId === t.id;
              return (
                <li key={t.id} className={cn("flex items-start gap-3 px-3 py-3 sm:px-4", editing && "bg-teal-50/40")}>
                  <IconChip icon={FlaskConical} tone="teal" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-foreground">{t.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONES.teal.badge)}>
                        {plural(analitos, "analito", "analitos")}
                      </span>
                      {tabelas > 0 && (
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONES.amber.badge)}>
                          <Table2 className="h-3 w-3" aria-hidden />
                          {plural(tabelas, "tabela de referência", "tabelas de referência")}
                        </span>
                      )}
                      {t.metodo && <span className="text-xs text-muted-foreground">Método: {t.metodo}</span>}
                    </div>
                    {analitos > 0 && (
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {t.blocks
                          .filter((b) => b.kind === "analito")
                          .map((b) => (b.kind === "analito" ? b.name : ""))
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => openEditor(t)}>
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-rose-600 hover:text-rose-700"
                      onClick={() => setToDelete(t)}
                      aria-label={`Apagar modelo ${t.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar o modelo "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Os exames já lançados com ele não mudam. Na próxima vez esse exame não vem mais montado (e, ao salvar, vira modelo de novo).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={() => void confirmDelete()}>
              Apagar modelo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}
