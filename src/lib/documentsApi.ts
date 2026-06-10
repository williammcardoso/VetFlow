import { supabase } from "@/integrations/supabase/client";
import type { Client, Animal } from "@/types/client";

export type PatientDocumentEntry = {
  id: string;
  date: string;
  time: string;
  name: string;
  fileUrl?: string;
  source?: "upload" | "editor";
  content?: string;
  templateKey?: string;
};

const BUCKET = "documents";
const LOCAL_KEY_PREFIX = "local:patient_documents:";

function isLikelyUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function localKey(animalId: string): string {
  return `${LOCAL_KEY_PREFIX}${animalId}`;
}

function readLocal(animalId: string): PatientDocumentEntry[] {
  try {
    const raw = localStorage.getItem(localKey(animalId));
    return raw ? (JSON.parse(raw) as PatientDocumentEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(animalId: string, list: PatientDocumentEntry[]) {
  localStorage.setItem(localKey(animalId), JSON.stringify(list));
}

function formatCreatedAtToDateTime(iso?: string) {
  if (!iso) {
    const now = new Date();
    return { date: now.toISOString().split("T")[0], time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
  }
  const d = new Date(iso);
  return { date: d.toISOString().split("T")[0], time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
}

export async function readPatientDocuments(animalId?: string): Promise<PatientDocumentEntry[]> {
  if (!animalId) return [];
  if (!isLikelyUuid(animalId)) return readLocal(animalId);
  const { data, error } = await supabase
    .from("patient_documents")
    .select("*")
    .eq("animal_id", animalId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[readPatientDocuments] error", error);
    return readLocal(animalId);
  }
  return (data || []).map((r: any) => {
    const dt = formatCreatedAtToDateTime(r.created_at);
    return {
      id: r.id,
      date: dt.date,
      time: dt.time,
      name: r.name,
      fileUrl: r.file_url ?? "",
      source: r.source ?? undefined,
      content: r.content ?? undefined,
      templateKey: r.template_key ?? undefined,
    } as PatientDocumentEntry;
  });
}

export async function addPatientDocument(
  animalId: string | undefined,
  entry: Partial<Pick<PatientDocumentEntry, "name" | "fileUrl" | "source" | "content" | "templateKey">>
): Promise<PatientDocumentEntry | null> {
  if (!animalId) throw new Error("animalId is required");
  if (!isLikelyUuid(animalId)) {
    const now = new Date();
    const localEntry: PatientDocumentEntry = {
      id: `local-doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: now.toISOString().split("T")[0],
      time: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      name: entry.name || "Documento sem título",
      fileUrl: entry.fileUrl || "",
      source: entry.source ?? "editor",
      content: entry.content ?? "",
      templateKey: entry.templateKey ?? undefined,
    };
    const current = readLocal(animalId);
    writeLocal(animalId, [localEntry, ...current]);
    return localEntry;
  }

  // handle upload with data URL => upload to storage
  let file_url = entry.fileUrl ?? null;
  if (entry.source === "upload" && entry.fileUrl && entry.fileUrl.startsWith("data:")) {
    try {
      const parts = entry.fileUrl.split(",");
      const header = parts[0];
      const base64 = parts[1];
      const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
      const binary = atob(base64);
      const arr = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
      const blob = new Blob([arr], { type: mime });
      const path = `patient_documents/${animalId}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: false });
      if (upErr) {
        console.error("[addPatientDocument] storage upload error", upErr);
      } else {
        const { publicURL } = supabase.storage.from(BUCKET).getPublicUrl(path);
        file_url = publicURL;
      }
    } catch (e) {
      console.error("[addPatientDocument] failed to upload data URL", e);
    }
  }

  const insertObj: any = {
    animal_id: animalId,
    name: entry.name,
    source: entry.source ?? "editor",
    file_url: file_url,
    content: entry.content ?? null,
    template_key: entry.templateKey ?? null,
  };

  const { data, error } = await supabase.from("patient_documents").insert(insertObj).select().single();
  if (error) {
    console.error("[addPatientDocument] insert error", error);
    return null;
  }
  const dt = formatCreatedAtToDateTime(data.created_at);
  return {
    id: data.id,
    date: dt.date,
    time: dt.time,
    name: data.name,
    fileUrl: data.file_url ?? "",
    source: data.source ?? undefined,
    content: data.content ?? undefined,
    templateKey: data.template_key ?? undefined,
  } as PatientDocumentEntry;
}

export async function updatePatientDocument(
  animalId: string | undefined,
  docId: string,
  updates: Partial<Pick<PatientDocumentEntry, "name" | "content" | "templateKey">>
): Promise<PatientDocumentEntry | null> {
  if (!animalId) throw new Error("animalId is required");
  if (!isLikelyUuid(animalId)) {
    const current = readLocal(animalId);
    let updatedEntry: PatientDocumentEntry | null = null;
    const next = current.map((doc) => {
      if (doc.id !== docId) return doc;
      updatedEntry = {
        ...doc,
        name: updates.name ?? doc.name,
        content: updates.content ?? doc.content,
        templateKey: updates.templateKey ?? doc.templateKey,
      };
      return updatedEntry;
    });
    writeLocal(animalId, next);
    return updatedEntry;
  }
  const dbUpdates: any = {};
  if (updates.name != null) dbUpdates.name = updates.name;
  if (updates.content != null) dbUpdates.content = updates.content;
  if (updates.templateKey != null) dbUpdates.template_key = updates.templateKey;

  const { data, error } = await supabase
    .from("patient_documents")
    .update(dbUpdates)
    .match({ id: docId, animal_id: animalId })
    .select()
    .single();
  if (error) {
    console.error("[updatePatientDocument] error", error);
    return null;
  }
  const dt = formatCreatedAtToDateTime(data.created_at);
  return {
    id: data.id,
    date: dt.date,
    time: dt.time,
    name: data.name,
    fileUrl: data.file_url ?? "",
    source: data.source ?? undefined,
    content: data.content ?? undefined,
    templateKey: data.template_key ?? undefined,
  } as PatientDocumentEntry;
}

export async function removePatientDocument(animalId: string | undefined, docId: string): Promise<boolean> {
  if (!animalId) return false;
  if (!isLikelyUuid(animalId)) {
    const current = readLocal(animalId);
    writeLocal(animalId, current.filter((d) => d.id !== docId));
    return true;
  }
  try {
    const { data: doc, error: selErr } = await supabase.from("patient_documents").select().match({ id: docId, animal_id: animalId }).single();
    if (selErr) {
      console.error("[removePatientDocument] select error", selErr);
    } else {
      if (doc?.file_url && typeof doc.file_url === "string") {
        // try to extract path from public URL: /storage/v1/object/public/<bucket>/<path>
        try {
          const url = new URL(doc.file_url);
          const idx = url.pathname.indexOf(`/storage/v1/object/public/${BUCKET}/`);
          if (idx >= 0) {
            const storagePath = url.pathname.slice(idx + `/storage/v1/object/public/${BUCKET}/`.length);
            await supabase.storage.from(BUCKET).remove([decodeURIComponent(storagePath)]);
          }
        } catch (e) {
          // ignore storage deletion errors
        }
      }
    }

    const { error } = await supabase.from("patient_documents").delete().match({ id: docId, animal_id: animalId });
    if (error) {
      console.error("[removePatientDocument] delete error", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[removePatientDocument] unexpected error", e);
    return false;
  }
}

