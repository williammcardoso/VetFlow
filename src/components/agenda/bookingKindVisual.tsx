import React from "react";
import { Ban, CircleEllipsis, Home, Pill, Stethoscope, Store, Syringe, type LucideIcon } from "lucide-react";
import { KIND_LABEL, type BookingKind, type BookingKindInfo, type BookingPlace } from "@/lib/agendaKinds";
import { cn } from "@/lib/utils";

// Cor e ícone de cada tipo de atendimento — os mesmos na agenda pública, na
// agenda interna e no painel.
export const KIND_VISUAL: Record<BookingKind, { icon: LucideIcon; chip: string; chipOn: string; badge: string; text: string }> = {
  consulta: {
    icon: Stethoscope,
    chip: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100",
    chipOn: "border-sky-600 bg-sky-600 text-white hover:bg-sky-700",
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
    text: "text-sky-700",
  },
  vacina: {
    icon: Syringe,
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
    chipOn: "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    text: "text-emerald-700",
  },
  medicacao: {
    icon: Pill,
    chip: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
    chipOn: "border-violet-600 bg-violet-600 text-white hover:bg-violet-700",
    badge: "bg-violet-50 text-violet-800 ring-violet-200",
    text: "text-violet-700",
  },
  outro: {
    icon: CircleEllipsis,
    chip: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
    chipOn: "border-slate-600 bg-slate-600 text-white hover:bg-slate-700",
    badge: "bg-slate-50 text-slate-700 ring-slate-200",
    text: "text-slate-600",
  },
  bloqueio: {
    icon: Ban,
    chip: "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100",
    chipOn: "border-zinc-700 bg-zinc-700 text-white hover:bg-zinc-800",
    badge: "bg-zinc-100 text-zinc-700 ring-zinc-300",
    text: "text-zinc-600",
  },
};

export const PLACE_ICON: Record<BookingPlace, LucideIcon> = { loja: Store, domicilio: Home };

/** Selo do tipo (agenda interna, painel, resumo do dia). */
export function KindBadge({ kind, info, className }: { kind: BookingKind; info?: BookingKindInfo | null; className?: string }) {
  const v = KIND_VISUAL[kind];
  const Icon = v.icon;
  const home = info?.place === "domicilio";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        v.badge,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {kind === "bloqueio" ? "Bloqueado" : KIND_LABEL[kind]}
      {home && (
        <>
          <span aria-hidden>·</span>
          <Home className="h-3 w-3" aria-hidden />
          domicílio
        </>
      )}
    </span>
  );
}
