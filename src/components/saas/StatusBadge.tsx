"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "Agendado" | "Concluído" | "Cancelado";

type StatusBadgeProps = {
  status: Status;
  className?: string;
};

const base = "rounded-full px-2.5 py-0.5 text-xs font-semibold border-0";

const statusClasses: Record<Status, string> = {
  Agendado: "bg-blue-100 text-blue-700",
  Concluído: "bg-emerald-100 text-emerald-700",
  Cancelado: "bg-red-100 text-red-700",
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  return <Badge className={cn(base, statusClasses[status], className)} variant="secondary">{status}</Badge>;
};

export default StatusBadge;