import type { AppointmentEntry } from "@/types/appointment";

export type AppointmentDraft = {
  id: string; // ex: draft-<baseId> ou draft-<timestamp>
  animalId: string;
  clientId: string;
  updatedAtISO: string;
  appointment: AppointmentEntry;
};

const draftsKey = (clientId: string, animalId: string) => `systemvet:appointment:drafts:${clientId}:${animalId}`;

export function readAppointmentDrafts(clientId: string, animalId: string): AppointmentDraft[] {
  try {
    const raw = localStorage.getItem(draftsKey(clientId, animalId));
    return raw ? (JSON.parse(raw) as AppointmentDraft[]) : [];
  } catch {
    return [];
  }
}

export function writeAppointmentDrafts(clientId: string, animalId: string, drafts: AppointmentDraft[]) {
  localStorage.setItem(draftsKey(clientId, animalId), JSON.stringify(drafts));
}

export function upsertAppointmentDraft(clientId: string, animalId: string, draft: AppointmentDraft) {
  const list = readAppointmentDrafts(clientId, animalId);
  const idx = list.findIndex((d) => d.id === draft.id);
  const next = [...list];
  if (idx >= 0) next[idx] = draft;
  else next.unshift(draft);
  writeAppointmentDrafts(clientId, animalId, next);
}

export function removeAppointmentDraft(clientId: string, animalId: string, draftId: string) {
  const list = readAppointmentDrafts(clientId, animalId);
  writeAppointmentDrafts(
    clientId,
    animalId,
    list.filter((d) => d.id !== draftId)
  );
}

export function findAppointmentDraft(clientId: string, animalId: string, draftId: string) {
  return readAppointmentDrafts(clientId, animalId).find((d) => d.id === draftId);
}
