import * as React from "react";
import { Link } from "react-router-dom";
import { Bird, Cat, Dog, PawPrint, Rabbit, type LucideIcon } from "lucide-react";
import { cn, parseLocalDate } from "@/lib/utils";
import type { Animal } from "@/types/client";

// Peças visuais compartilhadas da lista de clientes e da ficha do cliente.
// Cor com moderação: a v1 pintava tudo (avatar, etiqueta inteira por espécie,
// ícone de sexo) e ficou confusa; a v2 ficou neutra demais ("faltou cor").
// Meio-termo: iniciais em tons suaves e só o ÍCONE da espécie colorido — a
// etiqueta continua neutra.

const norm = (s: string | undefined) =>
  (s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

/** Iniciais do primeiro e do último nome, sem "da/de/do/dos/e": "Maria da Silva" → "MS". */
export function getInitials(name: string): string {
  const words = (name || "")
    .trim()
    .split(/\s+/)
    .filter((w) => w && !/^(d[aeo]s?|e)$/i.test(w));
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// Tons suaves (fundo 100, texto 700) — mesma cor pro mesmo nome na lista e na ficha.
const AVATAR_TONES = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];

function avatarTone(name: string): string {
  let h = 0;
  for (const ch of norm(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function ClientAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold",
        avatarTone(name),
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}

export type SpeciesKind = "dog" | "cat" | "other";

/** Canino/Felino/resto — base do filtro da lista. */
export function speciesKind(species: string | undefined): SpeciesKind {
  const s = norm(species);
  if (/^(canin|cao|caes|cachorr|dog)/.test(s)) return "dog";
  if (/^(felin|gat|cat)/.test(s)) return "cat";
  return "other";
}

/** Ícone da espécie (a forma já diferencia cão/gato; sem cor própria). */
export function speciesIcon(species: string | undefined): LucideIcon {
  const kind = speciesKind(species);
  if (kind === "dog") return Dog;
  if (kind === "cat") return Cat;
  const s = norm(species);
  if (/^(pass|ave|calops|papag|periq|canar)/.test(s)) return Bird;
  if (/^(roedor|coelh|hamster|porquinho|chinchila)/.test(s)) return Rabbit;
  return PawPrint;
}

/** Cor do ícone da espécie: `icon` (só o traço) e `soft` (quadradinho com fundo claro). */
export function speciesTone(species: string | undefined): { icon: string; soft: string; chip: string } {
  const kind = speciesKind(species);
  if (kind === "dog")
    return { icon: "text-amber-600", soft: "bg-amber-50 text-amber-600", chip: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100" };
  if (kind === "cat")
    return { icon: "text-violet-600", soft: "bg-violet-50 text-violet-600", chip: "border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-100" };
  const s = norm(species);
  if (/^(pass|ave|calops|papag|periq|canar)/.test(s))
    return { icon: "text-sky-600", soft: "bg-sky-50 text-sky-600", chip: "border-sky-200 bg-sky-50 text-sky-900 hover:bg-sky-100" };
  if (/^(roedor|coelh|hamster|porquinho|chinchila)/.test(s))
    return { icon: "text-pink-600", soft: "bg-pink-50 text-pink-600", chip: "border-pink-200 bg-pink-50 text-pink-900 hover:bg-pink-100" };
  return { icon: "text-emerald-600", soft: "bg-emerald-50 text-emerald-600", chip: "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100" };
}

/** "Macho"/"Fêmea" (ou vazio) a partir do que estiver gravado. */
export function sexLabel(gender: string | undefined): string {
  const g = norm(gender);
  if (g.startsWith("mach") || g.startsWith("mascul") || g === "male") return "Macho";
  if (g.startsWith("feme") || g.startsWith("femin") || g === "female") return "Fêmea";
  return "";
}

/**
 * Etiqueta do pet (ícone da espécie + nome) que abre o prontuário.
 * `relative z-10`: fica acima do link "esticado" da linha do cliente.
 */
export function PetChip({
  animal,
  to,
  highlighted,
  className,
}: {
  animal: Pick<Animal, "name" | "species">;
  to: string;
  highlighted?: boolean;
  className?: string;
}) {
  const Icon = speciesIcon(animal.species);
  return (
    <Link
      to={to}
      title={`Abrir prontuário de ${animal.name}`}
      className={cn(
        "relative z-10 inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border px-2.5 text-[13px] font-semibold transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        // Cor da espécie (cão âmbar, gato violeta...): o pet salta na lista.
        // O que bateu com a busca ganha contorno forte.
        speciesTone(animal.species).chip,
        highlighted && "ring-2 ring-primary/60 ring-offset-1",
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", highlighted ? undefined : speciesTone(animal.species).icon)} aria-hidden />
      <span className="min-w-0 truncate">{animal.name}</span>
    </Link>
  );
}

/** "hoje", "ontem", "há 4 dias", "há 3 meses", "há 2 anos" (a partir de "aaaa-mm-dd"). */
export function formatRelativeDays(value?: string | null, today = new Date()): string {
  const iso = (value || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const days = Math.round((start - new Date(y, m - 1, d).getTime()) / 86_400_000);
  if (days < 0) return "agendado";
  if (days === 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  // Meses de calendário completos (15/08 → 30/09 = 1 mês; 01/05 → 30/09 = 4 meses).
  const months = (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m) - (today.getDate() < d ? 1 : 0);
  if (months < 12) return months <= 1 ? "há 1 mês" : `há ${months} meses`;
  const years = Math.floor(months / 12);
  return years <= 1 ? "há 1 ano" : `há ${years} anos`;
}

/** "aaaa-mm-dd" (ou ISO com hora) → "dd/mm/aaaa". */
export function formatDateBR(value?: string | null): string {
  const [year, month, day] = (value || "").slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

/** Idade curta: "12 anos", "1 ano", "5 meses", "20 dias". */
export function formatAgeShort(birthday?: string | null): string {
  if (!birthday) return "";
  const birth = /^\d{4}-\d{2}-\d{2}$/.test(birthday) ? parseLocalDate(birthday) : new Date(birthday);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months--;
  if (months >= 12) {
    const years = Math.floor(months / 12);
    return years === 1 ? "1 ano" : `${years} anos`;
  }
  if (months >= 1) return months === 1 ? "1 mês" : `${months} meses`;
  const days = Math.max(0, Math.floor((now.getTime() - birth.getTime()) / 86_400_000));
  return days === 1 ? "1 dia" : `${days} dias`;
}

export function formatWeightKg(weight?: number | null): string {
  return weight && weight > 0 ? `${weight.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg` : "";
}
