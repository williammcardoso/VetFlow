"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PawPrint } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { AppointmentEntry } from "@/types/appointment";
import { mockClients } from "@/mockData/clients";
import { cn } from "@/lib/utils";

type AppointmentListProps = {
  title?: string;
  items: AppointmentEntry[];
  className?: string;
};

function getClientAndAnimal(animalId: string): { clientName?: string; animalName?: string } {
  for (const client of mockClients) {
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

const AppointmentList: React.FC<AppointmentListProps> = ({ title = "Próximos Atendimentos", items, className }) => {
  return (
    <Card className={cn("premium-card rounded-xl", className)}>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 flex items-center justify-center">
            <PawPrint className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold leading-tight">{title}</h3>
        </div>

        <div className="mt-4 space-y-3">
          {items.length === 0 && <div className="text-sm text-muted-foreground">Nenhum atendimento encontrado.</div>}

          {items.map((app) => {
            const { clientName, animalName } = getClientAndAnimal(app.animalId);
            const status = deriveStatus(app.date, app.time);

            return (
              <div key={app.id} className="rounded-xl p-4 border border-border bg-white/70 hover:bg-white transition-colors">
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