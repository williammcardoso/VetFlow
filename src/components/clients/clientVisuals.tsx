import * as React from "react";
import { Link } from "react-router-dom";
import { Bird, Cat, Dog, PawPrint, Rabbit, type LucideIcon } from "lucide-react";
import { FaMars, FaVenus } from "react-icons/fa";
import { cn, parseLocalDate } from "@/lib/utils";
import type { Animal } from "@/types/client";

// Peças visuais compartilhadas da lista de clientes e da ficha do cliente:
// avatar com iniciais, cor/ícone por espécie e o chip do pet que leva direto
// ao prontuário.

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

const AVATAR_TONES = [
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-800",
  "bg-orange-100 text-orange-800",
];

/** Cor fixa por nome: o mesmo cliente tem sempre a mesma cor na lista e na ficha. */
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
        "flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold",
        avatarTone(name),
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}

export type SpeciesKind = "dog" | "cat" | "other";

/** Canino/Felino/resto — base dos filtros da lista. */
export function speciesKind(species: string | undefined): SpeciesKind {
  const s = norm(species);
  if (/^(canin|cao|caes|cachorr|dog)/.test(s)) return "dog";
  if (/^(felin|gat|cat)/.test(s)) return "cat";
  return "other";
}

interface SpeciesVisual {
  Icon: LucideIcon;
  /** Chip do pet (fundo claro + texto + contorno). */
  chip: string;
  /** Quadradinho do ícone no card do pet. */
  badge: string;
}

export function speciesVisual(species: string | undefined): SpeciesVisual {
  const s = norm(species);
  if (speciesKind(species) === "dog")
    return { Icon: Dog, chip: "bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100", badge: "bg-amber-100 text-amber-700" };
  if (speciesKind(species) === "cat")
    return { Icon: Cat, chip: "bg-violet-50 text-violet-900 ring-violet-200 hover:bg-violet-100", badge: "bg-violet-100 text-violet-700" };
  if (/^(pass|ave|calops|papag|periq|canar)/.test(s))
    return { Icon: Bird, chip: "bg-sky-50 text-sky-900 ring-sky-200 hover:bg-sky-100", badge: "bg-sky-100 text-sky-700" };
  if (/^(roedor|coelh|hamster|porquinho|chinchila)/.test(s))
    return { Icon: Rabbit, chip: "bg-pink-50 text-pink-900 ring-pink-200 hover:bg-pink-100", badge: "bg-pink-100 text-pink-700" };
  return { Icon: PawPrint, chip: "bg-emerald-50 text-emerald-900 ring-emerald-200 hover:bg-emerald-100", badge: "bg-emerald-100 text-emerald-700" };
}

export function SexIcon({ gender, className }: { gender?: string; className?: string }) {
  const g = norm(gender);
  if (g.startsWith("mach") || g.startsWith("mascul") || g === "male")
    return <FaMars className={cn("text-sky-600", className)} aria-label="Macho" role="img" />;
  if (g.startsWith("feme") || g.startsWith("femin") || g === "female")
    return <FaVenus className={cn("text-pink-600", className)} aria-label="Fêmea" role="img" />;
  return null;
}

/**
 * Chip do pet (ícone da espécie + nome + sexo) que abre o prontuário.
 * `relative z-10`: fica acima do link "esticado" do card do cliente.
 */
export function PetChip({
  animal,
  to,
  highlighted,
  className,
}: {
  animal: Pick<Animal, "name" | "species" | "gender">;
  to: string;
  highlighted?: boolean;
  className?: string;
}) {
  const { Icon, chip } = speciesVisual(animal.species);
  return (
    <Link
      to={to}
      title={`Abrir prontuário de ${animal.name}`}
      className={cn(
        "relative z-10 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        chip,
        highlighted && "ring-2 ring-primary",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 truncate">{animal.name}</span>
      <SexIcon gender={animal.gender} className="h-3 w-3 shrink-0" />
    </Link>
  );
}

/** Idade curta pro card do pet: "12 anos", "1 ano", "5 meses", "20 dias". */
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
