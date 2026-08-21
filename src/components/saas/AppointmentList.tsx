"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PawPrint } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { AppointmentEntry } from "@/types/appointment";
import { cn } from "@/lib/utils";
import { useClientsList } from "@/hooks/useSupabaseClients";

type AppointmentListProps = {
  title?: string;
  items: AppointmentEntry[];
  tone?: "clinical" | "finance" | "sales" | "stock" | "registry" | "settings" | "neutral";
  className?: string;
};

function getClientAndAnimal(
  animalId: string,
  clients: { name: string; animals: { id: string; name: string }[] }[]
): { clientName?: string; animalName?: string } {
  for (const client of clients) {
    const animal = client.animals.find((a) => a.id === animalId);
    if (animal) {
      return { clientName: client.name, animalName: animal.name };
    }
  }
  return {};
}

function deriveStatus(date: string, time?: string): "Agendado" | "Concluído" {
  const now = new Date();
  const d = new Date(`${date}T${time || "00:00"}`);
  return d.getTime() >= now.getTime() ? "Agendado" : "Concluído";
}

const toneMap: Record<NonNullable<AppointmentListProps["tone"]>, { chip: string; icon: string }> = {
  clinical: { chip: "bg-[hsl(var(--vf-clinical)/0.14)]", icon: "text-vf-clinical" },
  sales: { chip: "bg-[hsl(var(--vf-sales)/0.14)]", icon: "text-vf-sales" },
  finance: { chip: "bg-[hsl(var(--vf-finance)/0.14)]", icon: "text-vf-finance" },
  stock: { chip: "bg-[hsl(var(--vf-stock)/0.14)]", icon: "text-vf-stock" },
  registry: { chip: "bg-[hsl(var(--vf-registry)/0.14)]", icon: "text-vf-registry" },
  settings: { chip: "bg-[hsl(var(--vf-settings)/0.14)]", icon: "text-vf-settings" },
  neutral: { chip: "bg-primary/10", icon: "text-primary" },
};

const AppointmentList: React.FC<AppointmentListProps> = ({
  title = "Próximos Atendimentos",
  items,
  tone = "clinical",
  className,
}) => {
  const { data: dbClients } = useClientsList();
  const clients = dbClients || [];
  const colors = toneMap[tone];
  return (
    <Card className={cn("premium-card rounded-xl", className)}>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ring-border/60", colors.chip)}>
            <PawPrint className={cn("h-5 w-5", colors.icon)} />
          </div>
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
        </div>

        <div className="mt-4 space-y-3">
          {items.length === 0 && <div className="text-sm text-muted-foreground">Nenhum atendimento encontrado.</div>}

          {items.map((app) => {
            const { clientName, animalName } = getClientAndAnimal(app.animalId, clients);
            const status = deriveStatus(app.date, app.time);

            return (
              <div
                key={app.id}
                className="rounded-xl border border-border/60 bg-muted/25 p-4 transition-colors hover:bg-muted/45"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-white ring-1 ring-border">
                    <AvatarFallback className="bg-muted text-foreground">
                      <PawPrint className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate leading-snug">{animalName || "Pet"}</div>
                    <div className="text-sm text-muted-foreground truncate leading-relaxed">
                      {clientName || "Tutor"} • {app.type}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-muted-foreground leading-relaxed">{formatDateTime(app.date, app.time)}</div>
                    <StatusBadge status={status} className="mt-1 inline-flex" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default AppointmentList;