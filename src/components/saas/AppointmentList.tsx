"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import StatusBadge from "./StatusBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PawPrint } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { AppointmentEntry } from "@/types/appointment";
import { mockClients } from "@/mockData/clients";

type AppointmentListProps = {
  title?: string;
  items: AppointmentEntry[];
  className?: string;
};

function getClientAndAnimal(animalId: string): { clientName?: string; animalName?: string } {
  for (const client of mockClients) {
    const animal = client.animals.find(a => a.id === animalId);
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
    <Card className={className}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <PawPrint className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground">Nenhum atendimento encontrado.</div>
          )}
          {items.map(app => {
            const { clientName, animalName } = getClientAndAnimal(app.animalId);
            const status = deriveStatus(app.date, app.time);
            return (
              <div key={app.id} className="premium-card rounded-xl p-4 border hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 bg-gray-50 ring-1 ring-gray-200">
                    <AvatarFallback className="bg-white text-gray-700">
                      <PawPrint className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{animalName || "Pet"}</div>
                    <div className="text-sm text-muted-foreground truncate">{clientName || "Tutor"} • {app.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{formatDateTime(app.date, app.time)}</div>
                    <StatusBadge status={status} className="mt-1 inline-block" />
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