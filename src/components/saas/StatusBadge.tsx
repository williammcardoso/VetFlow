"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status =
  | "Agendado"
  | "Concluído"
  | "Cancelado"
  | "Em atendimento"
  | "Atendido"
  | "Não atendido"
  | "scheduled"
  | "in_progress"
  | "attended"
  | "no_show"
  | "cancelled";

type StatusBadgeProps = {
  status: Status;
  className?: string;
};

const base = "rounded-full px-2.5 py-0.5 text-xs font-semibold border-0";

const statusClasses: Record<Status, string> = {
  Agendado: "bg-[hsl(var(--vf-clinical))]/15 text-vf-clinical",
  Concluído: "bg-emerald-100 text-emerald-700",
  Cancelado: "bg-red-100 text-red-700",
  "Em atendimento": "bg-amber-100 text-amber-800",
  Atendido: "bg-emerald-100 text-emerald-700",
  "Não atendido": "bg-orange-100 text-orange-700",
  scheduled: "bg-[hsl(var(--vf-clinical))]/15 text-vf-clinical",
  in_progress: "bg-amber-100 text-amber-800",
  attended: "bg-emerald-100 text-emerald-700",
  no_show: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabel: Record<Status, string> = {
  Agendado: "Agendado",
  Concluído: "Concluído",
  Cancelado: "Cancelado",
  "Em atendimento": "Em atendimento",
  Atendido: "Atendido",
  "Não atendido": "Não atendido",
  scheduled: "Agendado",
  in_progress: "Em atendimento",
  attended: "Atendido",
  no_show: "Não atendido",
  cancelled: "Cancelado",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return <Badge className={cn(base, statusClasses[status], className)} variant="secondary">{statusLabel[status]}</Badge>;
};

export default StatusBadge;