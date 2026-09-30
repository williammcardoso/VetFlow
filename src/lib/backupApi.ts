import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages, SUPABASE_MAX_ROWS } from "@/lib/supabasePaging";
import { formatDateBRForFileName, toLocalISODate } from "@/lib/utils";

// Backup completo dos dados do VetFlow, baixado no computador.
// Ordem pensada para a restauração (lib/backupRestore): cadastros e
// configurações primeiro, depois o que depende deles (prontuário, vendas...).
// Fora de propósito: usuários/senhas do sistema (app_users) — nem a chave
// pública consegue ler, e senha não deve circular num arquivo.

export interface BackupTable {
  table: string;
  label: string;
  group: "Configurações" | "Clientes e pacientes" | "Prontuário" | "Documentos" | "Agenda" | "Vendas e financeiro" | "Estoque";
  /** Coluna que identifica o registro (padrão: id). */
  key?: string;
  /** Tabela de migration recente: se ainda não existir no banco, fica de fora sem acusar falha. */
  optional?: boolean;
}

export const BACKUP_TABLES: BackupTable[] = [
  { table: "settings", label: "Configurações da clínica", group: "Configurações", key: "key" },
  { table: "registry", label: "Cadastros auxiliares (espécies, raças, formas de pagamento...)", group: "Configurações" },
  { table: "catalog_items", label: "Catálogo de produtos e serviços", group: "Estoque" },
  { table: "service_components", label: "Composição de insumos (antiga)", group: "Estoque" },
  { table: "clients", label: "Clientes", group: "Clientes e pacientes" },
  { table: "animals", label: "Animais", group: "Clientes e pacientes" },
  { table: "appointments", label: "Atendimentos", group: "Prontuário" },
  { table: "exams", label: "Exames", group: "Prontuário" },
  { table: "prescriptions", label: "Receitas", group: "Prontuário" },
  { table: "patient_observations", label: "Observações", group: "Prontuário" },
  { table: "patient_weight_entries", label: "Pesagens", group: "Prontuário" },
  { table: "patient_documents", label: "Documentos e anexos do prontuário", group: "Documentos" },
  { table: "patient_document_signatures", label: "Assinaturas (modelo antigo)", group: "Documentos" },
  { table: "document_templates", label: "Modelos de documento", group: "Documentos" },
  { table: "document_template_versions", label: "Versões dos modelos", group: "Documentos" },
  { table: "documents", label: "Documentos emitidos", group: "Documentos" },
  { table: "document_signatures", label: "Assinaturas", group: "Documentos" },
  { table: "document_share_links", label: "Links curtos de PDF", group: "Documentos", key: "code" },
  { table: "schedules", label: "Agenda", group: "Agenda" },
  { table: "agenda_settings", label: "Configuração da agenda", group: "Agenda" },
  { table: "agenda_weekly_hours", label: "Horários da agenda pública", group: "Agenda", key: "weekday" },
  { table: "agenda_exceptions", label: "Exceções da agenda", group: "Agenda" },
  { table: "reminder_log", label: "Lembretes enviados (vacinas e acompanhamentos)", group: "Agenda", optional: true },
  { table: "send_log", label: "Envios ao tutor (WhatsApp)", group: "Documentos", optional: true },
  { table: "budgets", label: "Orçamentos", group: "Vendas e financeiro" },
  { table: "budget_items", label: "Itens dos orçamentos", group: "Vendas e financeiro" },
  { table: "financial_transactions", label: "Vendas, recebimentos e despesas", group: "Vendas e financeiro" },
  { table: "sale_items", label: "Itens das vendas", group: "Vendas e financeiro" },
  { table: "sale_item_consumptions", label: "Insumos das vendas (antigo)", group: "Vendas e financeiro" },
  { table: "monthly_closings", label: "Fechamentos 50/50", group: "Vendas e financeiro" },
  { table: "purchase_items", label: "Itens das compras", group: "Estoque" },
  { table: "purchase_orders", label: "Pedidos de compra", group: "Estoque" },
  { table: "purchase_order_items", label: "Itens dos pedidos de compra", group: "Estoque" },
];

export const tableKey = (t: BackupTable) => t.key ?? "id";

export type BackupRow = Record<string, unknown>;

export interface BackupFile {
  app: "VetFlow";
  formato: 1;
  criadoEm: string;
  tabelas: Record<string, BackupRow[]>;
  contagem: Record<string, number>;
  falhas: Record<string, string>;
  /**
   * Arquivos que não saem de novo dos dados: assinaturas, anexos enviados,
   * foto/assinatura do usuário (link público → data URL). Os PDFs gerados
   * pelo sistema não entram — são refeitos a partir dos dados.
   */
  arquivos: Record<string, string>;
}

// ------------------------------------------------------------ arquivos
const STORAGE_URL_RE = /https?:\/\/[^"\s\\]+?\/storage\/v1\/object\/public\/[^"\s\\)]+/g;

/** Pastas onde o sistema guarda PDFs que ele mesmo gerou (refeitos a partir dos dados). */
export const GENERATED_PDF_FOLDERS = new Set([
  "generated_pdfs",
  "appointments",
  "budgets",
  "documents",
  "exams",
  "prescriptions",
  "purchase_receipts",
]);

/** Separa o link público do Storage em origem, bucket e caminho. */
export function parseStorageUrl(url: string): { origin: string; bucket: string; path: string } | null {
  const m = url.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { origin: m[1], bucket: m[2], path: m[3].split("?")[0] };
}

/** Links de arquivos citados nos dados que precisam ir no backup (tudo menos PDF gerado). */
export function collectFileUrls(tabelas: Record<string, BackupRow[]>): string[] {
  const urls = new Set<string>();
  for (const rows of Object.values(tabelas)) {
    const text = JSON.stringify(rows);
    for (const url of text.match(STORAGE_URL_RE) ?? []) {
      const parsed = parseStorageUrl(url);
      if (!parsed) continue;
      const folder = parsed.path.split("/")[0];
      if (GENERATED_PDF_FOLDERS.has(folder) && /\.pdf$/i.test(parsed.path)) continue;
      urls.add(url);
    }
  }
  return Array.from(urls);
}

async function fetchTable(t: BackupTable): Promise<{ rows: BackupRow[]; error?: string }> {
  // Até 1000 linhas vem numa consulta só; acima disso pagina ordenando pela chave.
  const first = await supabase.from(t.table).select("*", { count: "exact" }).range(0, SUPABASE_MAX_ROWS - 1);
  if (first.error) return { rows: [], error: first.error.message };
  const rows = (first.data ?? []) as BackupRow[];
  if ((first.count ?? rows.length) <= rows.length) return { rows };
  const all = await fetchAllPages<BackupRow>((from, to) =>
    supabase.from(t.table).select("*").order(tableKey(t), { ascending: true }).range(from, to)
  );
  if (all.error) return { rows, error: `incompleto: ${String((all.error as { message?: string })?.message ?? all.error)}` };
  return { rows: all.data };
}

/** Erro de tabela que ainda não existe no banco (migration não aplicada). */
export const isMissingTableError = (message: string) => /could not find|does not exist|schema cache/i.test(message);

/** Busca todas as tabelas. `onProgress` recebe a tabela atual e quantas já foram. */
export async function buildBackup(onProgress?: (done: number, total: number, current: BackupTable) => void): Promise<BackupFile> {
  const backup: BackupFile = {
    app: "VetFlow",
    formato: 1,
    criadoEm: new Date().toISOString(),
    tabelas: {},
    contagem: {},
    falhas: {},
    arquivos: {},
  };
  // 4 tabelas por vez (uma de cada vez levava ~20 s); o arquivo mantém a ordem da lista.
  const results: Array<{ rows: BackupRow[]; error?: string }> = new Array(BACKUP_TABLES.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < BACKUP_TABLES.length) {
      const i = next++;
      results[i] = await fetchTable(BACKUP_TABLES[i]);
      onProgress?.(++done, BACKUP_TABLES.length + 1, BACKUP_TABLES[Math.min(next, BACKUP_TABLES.length - 1)]);
    }
  };
  onProgress?.(0, BACKUP_TABLES.length + 1, BACKUP_TABLES[0]);
  await Promise.all([worker(), worker(), worker(), worker()]);
  BACKUP_TABLES.forEach((t, i) => {
    const { rows, error } = results[i];
    if (error && t.optional && isMissingTableError(error)) return;
    backup.tabelas[t.table] = rows;
    backup.contagem[t.table] = rows.length;
    if (error) backup.falhas[t.table] = error;
  });

  // Arquivos: a tabela guarda só o link — sem o arquivo, a assinatura ou o
  // anexo não se recuperam.
  const filesStep: BackupTable = { table: "arquivos", label: "Assinaturas e anexos", group: "Documentos" };
  onProgress?.(BACKUP_TABLES.length, BACKUP_TABLES.length + 1, filesStep);
  let failed = 0;
  const list = collectFileUrls(backup.tabelas);
  for (let i = 0; i < list.length; i += 4) {
    await Promise.all(
      list.slice(i, i + 4).map(async (url) => {
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(String(res.status));
          backup.arquivos[url] = await blobToDataUrl(await res.blob());
        } catch {
          failed++;
        }
      })
    );
  }
  if (failed > 0) backup.falhas.arquivos = `${failed} arquivo(s) (assinatura/anexo) não baixaram`;
  onProgress?.(BACKUP_TABLES.length + 1, BACKUP_TABLES.length + 1, filesStep);
  return backup;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, base64 = ""] = dataUrl.split(",");
  const mime = head.match(/^data:([^;]+)/)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ------------------------------------------------------------ download
/** "29-09-2026-16h30" — para o nome do arquivo. */
export function backupFileStamp(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${formatDateBRForFileName(toLocalISODate(date))}-${hh}h${mm}`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadBackupJson(backup: BackupFile, fileName: string) {
  downloadBlob(new Blob([JSON.stringify(backup)], { type: "application/json" }), fileName);
}

// ------------------------------------------------------------ último backup
// Guardado no aparelho: o arquivo é baixado neste computador.
const LAST_KEY = "vf:backup:last";

export function getLastBackupAt(): Date | null {
  try {
    const v = localStorage.getItem(LAST_KEY);
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

export function setLastBackupAt(date = new Date()): void {
  try {
    localStorage.setItem(LAST_KEY, date.toISOString());
  } catch {
    /* modo privado etc. */
  }
}

/** Dias desde o último backup (null = nunca). */
export function daysSinceLastBackup(now = new Date()): number | null {
  const last = getLastBackupAt();
  if (!last) return null;
  return Math.floor((now.getTime() - last.getTime()) / 86_400_000);
}

export const BACKUP_REMINDER_DAYS = 7;

/** Excel não aceita célula com mais de 32.767 caracteres; objeto vira JSON. */
export function cellValue(value: unknown): string | number {
  if (value == null) return "";
  if (typeof value === "number") return value;
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > 32_000 ? `${text.slice(0, 32_000)}… (cortado — completo no arquivo .json)` : text;
}

/** Colunas da planilha: união das chaves de todas as linhas, na ordem em que aparecem. */
export function tableColumns(rows: BackupRow[]): string[] {
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      cols.push(key);
    }
  }
  return cols;
}
