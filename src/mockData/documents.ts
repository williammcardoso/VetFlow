/**
 * Documentos do prontuário por animal.
 * Suporta: upload (arquivo anexado) e editor (documento criado a partir de template).
 */
export type DocumentSource = "upload" | "editor";

export interface PatientDocumentEntry {
  id: string;
  date: string;
  time: string;
  name: string;
  /** Para upload: data URL (base64) ou URL do arquivo. Para editor: vazio. */
  fileUrl: string;
  /** 'upload' = arquivo anexado; 'editor' = documento criado pelo editor com template */
  source?: DocumentSource;
  /** Apenas para source === 'editor': corpo do texto do documento */
  content?: string;
  /** Apenas para source === 'editor': chave do template usado (DOCUMENT_TEMPLATES ou documentModels) */
  templateKey?: string;
}

const STORAGE_PREFIX = "patient:documents:";

export const documentsStorageKey = (animalId?: string) =>
  `${STORAGE_PREFIX}${animalId || "unknown"}`;

export const readPatientDocuments = (
  animalId?: string
): PatientDocumentEntry[] => {
  try {
    const raw = localStorage.getItem(documentsStorageKey(animalId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PatientDocumentEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const writePatientDocuments = (
  animalId: string | undefined,
  list: PatientDocumentEntry[]
) => {
  localStorage.setItem(documentsStorageKey(animalId), JSON.stringify(list));
};

export const addPatientDocument = (
  animalId: string | undefined,
  entry: Omit<PatientDocumentEntry, "id" | "date" | "time">
): PatientDocumentEntry => {
  const list = readPatientDocuments(animalId);
  const now = new Date();
  const newEntry: PatientDocumentEntry = {
    ...entry,
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: now.toISOString().split("T")[0],
    time: now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
  list.unshift(newEntry);
  writePatientDocuments(animalId, list);
  return newEntry;
};

export const removePatientDocument = (
  animalId: string | undefined,
  docId: string
): boolean => {
  const list = readPatientDocuments(animalId).filter((d) => d.id !== docId);
  if (list.length === readPatientDocuments(animalId).length) return false;
  writePatientDocuments(animalId, list);
  return true;
};

export const updatePatientDocument = (
  animalId: string | undefined,
  docId: string,
  updates: Partial<Pick<PatientDocumentEntry, "name" | "content" | "templateKey">>
): PatientDocumentEntry | null => {
  const list = readPatientDocuments(animalId);
  const idx = list.findIndex((d) => d.id === docId);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...updates };
  writePatientDocuments(animalId, list);
  return list[idx];
};
