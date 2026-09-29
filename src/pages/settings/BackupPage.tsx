import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  DatabaseBackup,
  FileJson,
  FileSpreadsheet,
  HardDriveDownload,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { TONES } from "@/components/finance/financeTheme";
import {
  BACKUP_REMINDER_DAYS,
  BACKUP_TABLES,
  backupFileStamp,
  buildBackup,
  cellValue,
  downloadBackupJson,
  getLastBackupAt,
  setLastBackupAt,
  tableColumns,
  type BackupFile,
} from "@/lib/backupApi";
import { RestorePanel } from "@/components/backup/RestorePanel";
import { exportRowsToXlsx } from "@/lib/xlsxExport";
import { cn } from "@/lib/utils";

const GROUPS = Array.from(new Set(BACKUP_TABLES.map((t) => t.group)));

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

// Backup com um clique: busca todas as tabelas e baixa um arquivo no
// computador. O .json é a cópia completa (restaura pelo painel abaixo); a
// planilha é para consultar no Excel.
const BackupPage: React.FC = () => {
  const [lastAt, setLastAt] = React.useState<Date | null>(() => getLastBackupAt());
  const [backup, setBackup] = React.useState<BackupFile | null>(null);
  const [running, setRunning] = React.useState<null | "json" | "xlsx">(null);
  const [progress, setProgress] = React.useState<{ done: number; total: number; label: string } | null>(null);

  const days = lastAt ? Math.floor((Date.now() - lastAt.getTime()) / 86_400_000) : null;
  const upToDate = days != null && days <= BACKUP_REMINDER_DAYS;

  const ensureBackup = async (): Promise<BackupFile> => {
    // Reaproveita o que já foi buscado agora há pouco (ex.: baixou o .json e quer a planilha também).
    if (backup && Date.now() - new Date(backup.criadoEm).getTime() < 10 * 60_000) return backup;
    const fresh = await buildBackup((done, total, current) => setProgress({ done, total, label: current.label }));
    setBackup(fresh);
    return fresh;
  };

  const run = async (kind: "json" | "xlsx") => {
    if (running) return;
    setRunning(kind);
    try {
      const data = await ensureBackup();
      const stamp = backupFileStamp(new Date(data.criadoEm));
      if (kind === "json") {
        downloadBackupJson(data, `vetflow-backup-${stamp}.json`);
      } else {
        await exportRowsToXlsx(`vetflow-backup-${stamp}`, [
          {
            name: "Resumo",
            headers: ["Tabela", "Conteúdo", "Registros"],
            rows: BACKUP_TABLES.filter((t) => t.table in data.contagem).map((t) => [t.table, t.label, data.contagem[t.table]]),
          },
          ...BACKUP_TABLES.filter((t) => (data.tabelas[t.table] ?? []).length > 0).map((t) => {
            const rows = data.tabelas[t.table];
            const cols = tableColumns(rows);
            return {
              name: t.label.replace(/[:\\/?*[\]]/g, " ").slice(0, 31),
              headers: cols,
              rows: rows.map((row) => cols.map((c) => cellValue(row[c]))),
            };
          }),
        ]);
      }
      const now = new Date();
      setLastBackupAt(now);
      setLastAt(now);
      const failures = Object.keys(data.falhas).length;
      if (failures > 0) toast.warning(`Backup baixado, mas ${plural(failures, "parte falhou", "partes falharam")} — veja o resumo.`);
      else toast.success(kind === "json" ? "Backup completo baixado." : "Planilha do backup baixada.");
    } catch (err) {
      console.error("[backup]", err);
      toast.error("Não foi possível gerar o backup. Verifique a internet e tente de novo.");
    } finally {
      setRunning(null);
      setProgress(null);
    }
  };

  const totalRecords = backup ? Object.values(backup.contagem).reduce((s, n) => s + n, 0) : 0;
  const pct = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0;

  return (
    <PageShell className="space-y-4 sm:space-y-5">
      <PageHeader
        title="Backup dos dados"
        description="Cópia completa dos dados da clínica, baixada no seu computador — e como trazer de volta."
        icon={DatabaseBackup}
        module="settings"
        breadcrumb={<>Painel &gt; Configuração &gt; Backup</>}
        className="mb-0 sm:mb-0"
      />

      {/* Situação */}
      <div className={cn("flex items-start gap-3 rounded-2xl border p-4 shadow-sm", upToDate ? TONES.emerald.card : TONES.amber.card)}>
        <IconChip icon={upToDate ? CheckCircle2 : AlertTriangle} tone={upToDate ? "emerald" : "amber"} size="lg" />
        <div className="min-w-0">
          <p className={cn("text-[11px] font-semibold uppercase tracking-wide", upToDate ? "text-emerald-700" : "text-amber-800")}>
            {upToDate ? "Backup em dia" : "Backup atrasado"}
          </p>
          <p className="mt-0.5 text-base font-bold text-foreground">
            {lastAt
              ? `Último backup: ${lastAt.toLocaleDateString("pt-BR")} às ${lastAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              : "Nenhum backup feito neste computador ainda"}
          </p>
          <p className="text-sm text-muted-foreground">
            {days == null
              ? `Faça o primeiro agora — o sistema lembra de novo a cada ${BACKUP_REMINDER_DAYS} dias.`
              : days === 0
                ? "Feito hoje."
                : `Há ${plural(days, "dia", "dias")}. O sistema lembra (no sininho) quando passar de ${BACKUP_REMINDER_DAYS} dias.`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel title="Fazer backup agora" icon={HardDriveDownload} tone="teal" description="Leva alguns segundos">
          <div className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void run("json")}
                disabled={!!running}
                className="group flex items-start gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3 text-left transition-colors hover:bg-teal-50 disabled:opacity-60"
              >
                <IconChip icon={running === "json" ? Loader2 : FileJson} tone="teal" className={running === "json" ? "[&_svg]:animate-spin" : ""} />
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">Backup completo (.json)</span>
                  <span className="block text-xs text-muted-foreground">Tudo, inclusive assinaturas e anexos. É o arquivo para restaurar.</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => void run("xlsx")}
                disabled={!!running}
                className="group flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-left transition-colors hover:bg-emerald-50 disabled:opacity-60"
              >
                <IconChip icon={running === "xlsx" ? Loader2 : FileSpreadsheet} tone="emerald" className={running === "xlsx" ? "[&_svg]:animate-spin" : ""} />
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">Planilha (.xlsx)</span>
                  <span className="block text-xs text-muted-foreground">Uma aba por tabela, para consultar no Excel.</span>
                </span>
              </button>
            </div>

            {progress && (
              <div className="space-y-1.5" role="status" aria-live="polite">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Buscando: {progress.label}</span>
                  <span className="tabular-nums">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {backup && !running && (
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm">
                <p className="font-semibold text-foreground">
                  {plural(totalRecords, "registro", "registros")} em {plural(Object.keys(backup.contagem).length, "tabela", "tabelas")}
                  {Object.keys(backup.arquivos).length > 0 && ` · ${plural(Object.keys(backup.arquivos).length, "arquivo", "arquivos")} (assinaturas e anexos)`}
                </p>
                {Object.entries(backup.falhas).map(([table, msg]) => (
                  <p key={table} className="mt-1 text-xs font-medium text-rose-700">
                    Falhou: {BACKUP_TABLES.find((t) => t.table === table)?.label ?? table} — {msg}
                  </p>
                ))}
              </div>
            )}

          </div>
        </Panel>

        <Panel title="Onde guardar" icon={ShieldCheck} tone="violet" description="O arquivo tem dados pessoais dos clientes">
          <ul className="space-y-2.5 p-4 text-sm">
            {[
              ["Fora deste computador", "Google Drive, OneDrive ou um pendrive. Se o computador quebrar, o backup vai junto."],
              ["Não mande por WhatsApp", "Tem CPF, telefone e endereço dos clientes (LGPD). Guarde só em lugar seu."],
              ["Uma vez por semana", `O sininho lembra quando passar de ${BACKUP_REMINDER_DAYS} dias. Pode apagar os mais antigos e manter os últimos.`],
              ["O que não entra", "Os PDFs que o sistema gera (saem de novo a partir dos dados) e os usuários/senhas do sistema."],
            ].map(([title, text]) => (
              <li key={title} className="flex gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                <span>
                  <span className="font-semibold text-foreground">{title}.</span> <span className="text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <RestorePanel />

      <Panel title="O que vai no backup" icon={Database} tone="sky" description={backup ? "Registros encontrados agora" : "Tudo o que o sistema guarda"}>
        <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
              <ul className="space-y-1 text-sm">
                {BACKUP_TABLES.filter((t) => t.group === group).map((t) => (
                  <li key={t.table} className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 text-foreground/85">{t.label}</span>
                    {backup && (
                      <span className={cn("shrink-0 text-xs font-bold tabular-nums", backup.falhas[t.table] ? "text-rose-700" : "text-sky-700")}>
                        {backup.falhas[t.table] ? "falhou" : (backup.contagem[t.table] ?? 0).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </PageShell>
  );
};

export default BackupPage;
