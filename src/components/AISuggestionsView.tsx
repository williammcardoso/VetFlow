import React from "react";
import { HelpCircle, Stethoscope, FlaskConical, Pill, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  title: string;
  items: string[];
}

// Cores/ícone por seção — mapeado nos títulos exatos que aiAssistantPrompt.ts
// pede pro modelo usar. `badge`/`iconColor`/`dot` são classes Tailwind
// literais (não construídas em runtime) pra não escapar do scan do Tailwind.
const SECTION_STYLES: Record<string, { icon: React.ElementType; badge: string; iconColor: string; dot: string }> = {
  "Perguntas sugeridas para o tutor": {
    icon: HelpCircle,
    badge: "bg-sky-50 text-sky-800 border-sky-200",
    iconColor: "text-sky-600",
    dot: "bg-sky-500",
  },
  "Hipóteses diagnósticas": {
    icon: Stethoscope,
    badge: "bg-amber-50 text-amber-800 border-amber-200",
    iconColor: "text-amber-600",
    dot: "bg-amber-500",
  },
  "Exames sugeridos": {
    icon: FlaskConical,
    badge: "bg-teal-50 text-teal-800 border-teal-200",
    iconColor: "text-teal-600",
    dot: "bg-teal-500",
  },
  "Medicações/condutas sugeridas": {
    icon: Pill,
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    iconColor: "text-rose-600",
    dot: "bg-rose-500",
  },
};

// aiAssistantPrompt.ts pede pro modelo responder com **Título** por seção e
// tópicos "- item" — parser simples pra essa forma fixa, sem precisar de
// biblioteca de markdown só pra isso.
function parseSections(text: string): Section[] {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const headerMatch = /^\*\*(.+?)\*\*:?$/.exec(line);
    if (headerMatch) {
      current = { title: headerMatch[1].trim(), items: [] };
      sections.push(current);
      continue;
    }
    const bulletMatch = /^[-•]\s*(.+)$/.exec(line);
    if (bulletMatch && current) {
      current.items.push(bulletMatch[1].trim());
    } else if (current) {
      current.items.push(line);
    }
  }
  return sections;
}

// Deixa **negrito** dentro de um tópico virar <strong> de verdade, em vez de
// mostrar os asteriscos crus na tela.
function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

interface AISuggestionsViewProps {
  text: string;
}

/**
 * Renderiza a resposta do assistente de IA com hierarquia visual clara —
 * pensado pra "bater o olho e ler rápido" com o tutor na frente do
 * veterinário, não ler um bloco de texto corrido. Cada seção fixa do prompt
 * (perguntas/hipóteses/exames/condutas) ganha ícone, cor e cartão próprios.
 */
const AISuggestionsView: React.FC<AISuggestionsViewProps> = ({ text }) => {
  const sections = React.useMemo(() => parseSections(text), [text]);

  // Resposta não bateu com o formato esperado (o modelo fugiu do padrão) —
  // mostra cru mesmo, melhor que quebrar a tela.
  if (sections.length === 0) {
    return <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{text}</pre>;
  }

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        const style = SECTION_STYLES[section.title];
        const Icon = style?.icon ?? Sparkles;
        const isEmpty = section.items.length <= 1 && /nenhuma sugest/i.test(section.items[0] ?? "");
        return (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div
              className={cn(
                "mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold",
                style?.badge ?? "border-border bg-muted text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4", style?.iconColor ?? "text-foreground")} />
              {section.title}
            </div>
            {isEmpty ? (
              <p className="text-base italic text-muted-foreground">{section.items[0]}</p>
            ) : (
              <ul className="space-y-2.5">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-base leading-snug text-foreground">
                    <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", style?.dot ?? "bg-foreground")} />
                    <span>{renderInline(item)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AISuggestionsView;
