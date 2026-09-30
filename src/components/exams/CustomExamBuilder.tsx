import React from "react";
import { ArrowDown, ArrowUp, FlaskConical, Heading, FileText, Plus, Table2, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconChip } from "@/components/finance/FinanceUI";
import { TONES, type Tone } from "@/components/finance/financeTheme";
import { analitoStatus, newBlock, type BlockKind } from "@/lib/customExam";
import type { CustomExamBlock } from "@/types/exam";
import { cn } from "@/lib/utils";

const KIND_META: Record<BlockKind, { label: string; add: string; hint: string; icon: LucideIcon; tone: Tone }> = {
  analito: { label: "Analito", add: "Analito", hint: "Nome, resultado, unidade e referência", icon: FlaskConical, tone: "teal" },
  texto: { label: "Texto do resultado", add: "Texto do resultado", hint: "Conclusão, observação — muda a cada exame", icon: FileText, tone: "violet" },
  referencia: { label: "Tabela de referência", add: "Tabela de referência", hint: "Valores normais — fica salva no modelo", icon: Table2, tone: "amber" },
  secao: { label: "Título de seção", add: "Título de seção", hint: "Separa grupos de analitos", icon: Heading, tone: "slate" },
};

const ADD_ORDER: BlockKind[] = ["analito", "texto", "referencia", "secao"];

// Monta o laudo de qualquer exame em blocos (tipo "Outro", Urinálise,
// Fezes...). O formato vira modelo ao salvar o exame (lib/customExam).
export function CustomExamBuilder({ blocks, onChange }: { blocks: CustomExamBlock[]; onChange: (blocks: CustomExamBlock[]) => void }) {
  const lastAddedRef = React.useRef<string | null>(null);

  const update = (id: string, patch: Partial<CustomExamBlock>) =>
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as CustomExamBlock) : b)));
  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };
  const add = (kind: BlockKind) => {
    const block = newBlock(kind);
    lastAddedRef.current = block.id;
    onChange([...blocks, block]);
  };

  // Foco no primeiro campo do bloco recém-adicionado.
  React.useEffect(() => {
    const id = lastAddedRef.current;
    if (!id) return;
    lastAddedRef.current = null;
    const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-block-id="${id}"] input, [data-block-id="${id}"] textarea`);
    el?.focus();
  }, [blocks]);

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-foreground">Monte o laudo com os botões abaixo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ex.: contagem de reticulócitos = alguns <strong>analitos</strong>, a <strong>conclusão</strong> e a <strong>tabela de referência</strong>.
          </p>
        </div>
      )}

      {blocks.map((block, index) => {
        const meta = KIND_META[block.kind];
        const t = TONES[meta.tone];
        return (
          <div key={block.id} data-block-id={block.id} className={cn("min-w-0 rounded-xl border bg-card p-3", t.card)}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <IconChip icon={meta.icon} tone={meta.tone} size="sm" />
                <span className={cn("truncate text-xs font-semibold uppercase tracking-wide", t.label)}>{meta.label}</span>
                {block.kind === "analito" && <StatusBadge block={block} />}
              </div>
              <div className="flex shrink-0 items-center">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir bloco">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Descer bloco"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:text-rose-700" onClick={() => remove(block.id)} aria-label="Remover bloco">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {block.kind === "analito" && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-12">
                <Field label="Analito" className="col-span-2 xl:col-span-3">
                  <Input value={block.name} placeholder="Ex.: Reticulócitos absolutos" onChange={(e) => update(block.id, { name: e.target.value })} className="bg-input" />
                </Field>
                <Field label="Resultado" className="xl:col-span-2">
                  <Input value={block.result} placeholder="Valor" onChange={(e) => update(block.id, { result: e.target.value })} className="bg-input font-semibold" />
                </Field>
                <Field label="Unidade" className="xl:col-span-2">
                  <Input value={block.unit || ""} placeholder="Ex.: /µL" onChange={(e) => update(block.id, { unit: e.target.value })} className="bg-input" />
                </Field>
                <Field label="Ref. mínima" className="xl:col-span-1">
                  <Input value={block.refMin || ""} placeholder="mín." onChange={(e) => update(block.id, { refMin: e.target.value })} className="bg-input" />
                </Field>
                <Field label="Ref. máxima" className="xl:col-span-1">
                  <Input value={block.refMax || ""} placeholder="máx." onChange={(e) => update(block.id, { refMax: e.target.value })} className="bg-input" />
                </Field>
                <Field label="Referência em texto" className="col-span-2 xl:col-span-3">
                  <Input
                    value={block.refText || ""}
                    placeholder="Se não for faixa: ex. < 1% não regenerativa"
                    onChange={(e) => update(block.id, { refText: e.target.value })}
                    className="bg-input"
                  />
                </Field>
              </div>
            )}

            {(block.kind === "texto" || block.kind === "referencia") && (
              <div className="space-y-2">
                <Field label="Título">
                  <Input
                    value={block.title || ""}
                    placeholder={block.kind === "texto" ? "Ex.: Conclusão" : "Ex.: Reticulócitos absolutos — grau de regeneração"}
                    onChange={(e) => update(block.id, { title: e.target.value })}
                    className="bg-input"
                  />
                </Field>
                <Field label={block.kind === "texto" ? "Texto" : "Valores (uma linha por faixa)"}>
                  <Textarea
                    value={block.text}
                    rows={block.kind === "referencia" ? 4 : 2}
                    placeholder={
                      block.kind === "texto"
                        ? "Ex.: Leve regeneração."
                        : "Menor que 60.000/µL – nenhum grau de regeneração\n60.000 a 150.000/µL – leve grau de regeneração"
                    }
                    onChange={(e) => update(block.id, { text: e.target.value })}
                    className="bg-input"
                  />
                </Field>
              </div>
            )}

            {block.kind === "secao" && (
              <Input value={block.title} placeholder="Ex.: Série vermelha" onChange={(e) => update(block.id, { title: e.target.value })} className="bg-input font-semibold" />
            )}
          </div>
        );
      })}

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {ADD_ORDER.map((kind) => {
          const meta = KIND_META[kind];
          const t = TONES[meta.tone];
          return (
            <button
              key={kind}
              type="button"
              onClick={() => add(kind)}
              className={cn("flex min-w-0 items-start gap-2 rounded-xl border border-dashed p-2.5 text-left transition-colors hover:bg-card", t.card)}
            >
              <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ring-1", t.chip)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{meta.add}</span>
                <span className="block text-[11px] leading-snug text-muted-foreground">{meta.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({ block }: { block: Extract<CustomExamBlock, { kind: "analito" }> }) {
  const s = analitoStatus(block);
  if (s === "unknown") return null;
  const map = {
    normal: { text: "na referência", cls: TONES.emerald.badge },
    // Mesmo padrão dos laudos: azul acima, vermelho abaixo.
    high: { text: "↑ acima", cls: TONES.sky.badge },
    low: { text: "↓ abaixo", cls: TONES.rose.badge },
  } as const;
  const m = map[s];
  return <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset", m.cls)}>{m.text}</span>;
}
