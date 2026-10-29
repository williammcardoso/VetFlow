import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { HelpHint } from "@/components/documents/HelpHint";
import { hintForLine, hintForSection } from "@/lib/documentFieldHints";
import { prettySectionTitle, type FillAnswers, type FillLine, type FillSection, type FillSegment } from "@/lib/documentFillFields";
import { cn } from "@/lib/utils";

// Formulário das opções "( )" e linhas "......" de um modelo oficial: cada
// linha do documento que tem algo a marcar/preencher aparece aqui, com as
// caixas e campos no lugar exato do texto, agrupada pela seção do modelo.

const BLANK_WIDTH: Record<"sm" | "md" | "lg", string> = {
  sm: "w-24",
  md: "w-40",
  lg: "min-w-[12rem] flex-1",
};

/** Texto da linha para exibir: {{variáveis}} resolvidas e "|" de tabela como separador. */
function useDisplayText(context: Record<string, Record<string, unknown> | undefined> | null) {
  return React.useCallback(
    (text: string, tableRow: boolean) => {
      let out = text.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (_m, path: string) => {
        const [scope, ...rest] = path.split(".");
        let value: unknown = context?.[scope];
        for (const key of rest) value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
        if (Array.isArray(value)) return value.join(", ");
        return value === undefined || value === null || String(value).trim() === "" ? "…" : String(value);
      });
      if (tableRow) out = out.replace(/\s*\|\s*/g, " · ").replace(/^ · | · $/g, "");
      return out;
    },
    [context]
  );
}

function BlankInput({
  segment,
  value,
  label,
  disabled,
  onChange,
}: {
  segment: Extract<FillSegment, { kind: "blank" }>;
  value: string;
  label: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const common = {
    value,
    disabled,
    "aria-label": label || "Campo",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    className: "h-9 rounded-lg bg-input px-2.5 text-sm",
  };
  if (segment.format === "date") return <Input type="date" {...common} className={cn(common.className, "w-40")} />;
  if (segment.format === "time") return <Input type="time" {...common} className={cn(common.className, "w-28")} />;
  if (segment.format === "daymonth") return <Input placeholder="dd/mm" inputMode="numeric" {...common} className={cn(common.className, "w-24")} />;
  return <Input {...common} className={cn(common.className, BLANK_WIDTH[segment.size])} />;
}

function FillLineRow({
  line,
  section,
  answers,
  disabled,
  display,
  onAnswer,
}: {
  line: FillLine;
  section: string;
  answers: FillAnswers;
  disabled?: boolean;
  display: (text: string, tableRow: boolean) => string;
  onAnswer: (id: number, value: boolean | string, alsoCheck?: number) => void;
}) {
  const hint = hintForLine(line.label, section);
  const parts: React.ReactNode[] = [];
  const segs = line.segments;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (seg.kind === "text") {
      const text = display(i === 0 ? seg.text.trimStart() : seg.text, line.tableRow);
      if (text.trim()) parts.push(<span key={i} className="whitespace-pre-wrap">{text}</span>);
      continue;
    }
    if (seg.kind === "check") {
      // A caixa e o texto da opção num <label> só: tocar no texto também marca.
      const next = segs[i + 1];
      const optionText = next?.kind === "text" ? display(next.text, line.tableRow) : "";
      if (next?.kind === "text") i++;
      const checked = answers[seg.id] === true;
      parts.push(
        <label
          key={i}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/70",
            checked && "bg-primary/10 font-medium text-foreground",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <Checkbox checked={checked} disabled={disabled} onCheckedChange={(v) => onAnswer(seg.id, v === true)} />
          {optionText.trim() && <span className="whitespace-pre-wrap">{optionText.trim()}</span>}
        </label>
      );
      continue;
    }
    parts.push(
      <BlankInput
        key={i}
        segment={seg}
        value={typeof answers[seg.id] === "string" ? (answers[seg.id] as string) : ""}
        label={line.label}
        disabled={disabled}
        onChange={(value) => onAnswer(seg.id, value, value.trim() ? seg.attachTo : undefined)}
      />
    );
  }

  return (
    <div className="px-3 py-2.5 text-sm leading-relaxed text-foreground/90">
      {line.context && <p className="mb-1 pr-8 text-xs text-muted-foreground">{display(line.context, false)}</p>}
      {/* "?" fixo à direita: junto do último campo ele quebrava sozinho
          para a linha de baixo no celular. */}
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-2">{parts}</div>
        {hint && <HelpHint text={hint} label={`Ajuda: ${line.label}`} className="mt-1.5" />}
      </div>
    </div>
  );
}

export function DocumentFillForm({
  sections,
  answers,
  onAnswersChange,
  context,
  disabled,
}: {
  sections: FillSection[];
  answers: FillAnswers;
  onAnswersChange: (next: FillAnswers) => void;
  /** Contexto do documento, só para mostrar {{variáveis}} resolvidas no texto das linhas. */
  context: Record<string, Record<string, unknown> | undefined> | null;
  disabled?: boolean;
}) {
  const display = useDisplayText(context);
  const onAnswer = (id: number, value: boolean | string, alsoCheck?: number) => {
    const next: FillAnswers = { ...answers, [id]: value };
    // Escrever no complemento de uma opção ("( ) Outros: ....") marca a opção.
    if (alsoCheck !== undefined && answers[alsoCheck] !== true) next[alsoCheck] = true;
    onAnswersChange(next);
  };

  return (
    <div className="space-y-5">
      {sections.map((section, idx) => {
        const title = prettySectionTitle(section.title);
        const sectionHint = hintForSection(section.title);
        return (
          <div key={`${idx}-${section.title}`}>
            {title && (
              <div className="mb-1.5 flex items-center gap-1">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
                {sectionHint && <HelpHint text={sectionHint} label={`Ajuda: ${title}`} className="h-5 w-5" />}
              </div>
            )}
            <div className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card">
              {section.lines.map((line) => (
                <FillLineRow
                  key={line.key}
                  line={line}
                  section={section.title}
                  answers={answers}
                  disabled={disabled}
                  display={display}
                  onAnswer={onAnswer}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
