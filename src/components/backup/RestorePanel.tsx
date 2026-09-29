import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArchiveRestore,
  CheckCircle2,
  Copy,
  FileJson,
  FileUp,
  Info,
  PenLine,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconChip, Panel } from "@/components/finance/FinanceUI";
import { TONES } from "@/components/finance/financeTheme";
import { backupFileStamp, buildBackup, downloadBackupJson, type BackupFile } from "@/lib/backupApi";
import {
  animalNameMap,
  BackupFileError,
  buildRestorePlan,
  currentStorageOrigin,
  executeRestore,
  friendlyRestoreError,
  parseBackupFile,
  rowLabel,
  rowsToWrite,
  SEQUENCE_FIX_SQL,
  type RestoreMode,
  type RestorePlan,
  type RestoreResult,
  type TablePlan,
} from "@/lib/backupRestore";
import { cn } from "@/lib/utils";

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "data desconhecida";
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

type Stage =
  | { kind: "idle" }
  | { kind: "reading"; pct: number; label: string }
  | { kind: "plan"; plan: RestorePlan }
  | { kind: "running"; plan: RestorePlan; pct: number; label: string }
  | { kind: "done"; plan: RestorePlan; result: RestoreResult; safetyFile: string };

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div className="space-y-1.5" role="status" aria-live="polite">
      <div className="flex justify-between gap-3 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Restaurar a partir do .json do backup: compara com os dados de agora,
// mostra o que volta e baixa uma cópia de segurança antes de gravar.
export function RestorePanel() {
  const queryClient = useQueryClient();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [stage, setStage] = React.useState<Stage>({ kind: "idle" });
  const [source, setSource] = React.useState<{ name: string; backup: BackupFile } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<RestoreMode>("missing");
  const [excluded, setExcluded] = React.useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const origin = React.useMemo(() => currentStorageOrigin(), []);

  const compare = async (backup: BackupFile) => {
    setStage({ kind: "reading", pct: 0, label: "Lendo os dados de agora para comparar..." });
    const current = await buildBackup((done, total, t) =>
      setStage({ kind: "reading", pct: Math.round((done / Math.max(1, total)) * 100), label: `Comparando: ${t.label}` })
    );
    return buildRestorePlan(backup, current, origin);
  };

  const onFile = async (file: File) => {
    setError(null);
    try {
      const backup = parseBackupFile(await file.text());
      setSource({ name: file.name, backup });
      const plan = await compare(backup);
      setMode("missing");
      setExcluded(new Set());
      setStage({ kind: "plan", plan });
    } catch (err) {
      console.error("[restore] leitura", err);
      setError(err instanceof BackupFileError ? err.message : "Não foi possível comparar com os dados de agora. Verifique a internet e tente de novo.");
      setStage({ kind: "idle" });
      // Permite escolher o mesmo arquivo de novo (o navegador só avisa quando muda).
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const reset = () => {
    setStage({ kind: "idle" });
    setSource(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const plan = stage.kind === "plan" || stage.kind === "running" || stage.kind === "done" ? stage.plan : null;
  const animals = React.useMemo(() => (plan ? animalNameMap(plan) : new Map<string, string>()), [plan]);
  const hasChanged = !!plan?.tables.some((p) => p.changed.length > 0);
  const relevant = plan ? plan.tables.filter((p) => p.missing.length > 0 || p.changed.length > 0 || p.unavailable) : [];
  const selected = plan ? plan.tables.filter((p) => !excluded.has(p.table.table) && rowsToWrite(p, mode).length > 0) : [];
  const totalToWrite = selected.reduce((s, p) => s + rowsToWrite(p, mode).length, 0);
  const onlyNowTotal = plan ? plan.tables.reduce((s, p) => s + p.onlyNow, 0) : 0;
  const backupTotal = plan ? plan.tables.reduce((s, p) => s + p.backupCount, 0) : 0;

  const toggle = (table: string, on: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (on) next.delete(table);
      else next.add(table);
      return next;
    });

  const run = async () => {
    if (!plan || !source) return;
    setConfirmOpen(false);
    const chosen = new Set(selected.map((p) => p.table.table));
    const expected = new Map(selected.map((p) => [p.table.table, rowsToWrite(p, mode).length]));
    try {
      // Compara de novo na hora: se alguém mexeu nos dados enquanto você
      // conferia, mostra a comparação nova em vez de gravar às cegas.
      setStage({ kind: "running", plan, pct: 0, label: "Baixando a cópia de segurança de agora..." });
      const fresh = await buildBackup((done, total) =>
        setStage({ kind: "running", plan, pct: Math.round((done / Math.max(1, total)) * 40), label: "Baixando a cópia de segurança de agora..." })
      );
      const freshPlan = buildRestorePlan(source.backup, fresh, origin);
      const drifted = freshPlan.tables.some((p) => chosen.has(p.table.table) && rowsToWrite(p, mode).length !== expected.get(p.table.table));
      if (drifted) {
        setStage({ kind: "plan", plan: freshPlan });
        toast.warning("Os dados mudaram enquanto você conferia. Veja a comparação atualizada e confirme de novo.");
        return;
      }
      const safetyFile = `vetflow-antes-da-restauracao-${backupFileStamp(new Date())}.json`;
      downloadBackupJson(fresh, safetyFile);
      const result = await executeRestore(freshPlan, {
        mode,
        tables: chosen,
        currentOrigin: origin,
        onProgress: (done, total, label) =>
          setStage({ kind: "running", plan: freshPlan, pct: 40 + Math.round((done / Math.max(1, total)) * 60), label: `Gravando: ${label}` }),
      });
      await queryClient.invalidateQueries();
      setStage({ kind: "done", plan: freshPlan, result, safetyFile });
      const failed = result.tables.reduce((s, t) => s + t.failed, 0) + result.files.failed;
      if (failed > 0) toast.warning("Restaurado com avisos — veja o resultado.");
      else toast.success("Restauração concluída.");
    } catch (err) {
      console.error("[restore] gravação", err);
      toast.error("A restauração parou no meio. Veja o resultado e compare de novo.");
      setStage({ kind: "plan", plan });
    }
  };

  const previewNames = (p: TablePlan) => {
    const rows = rowsToWrite(p, mode);
    const names = rows.slice(0, 3).map((r) => rowLabel(p.table.table, r, animals));
    return rows.length > 3 ? `${names.join(", ")} e mais ${rows.length - 3}` : names.join(", ");
  };

  return (
    <Panel title="Restaurar um backup" icon={ArchiveRestore} tone="amber" description="Traz de volta o que foi apagado ou alterado por engano">
      <div className="space-y-4 p-4">
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          aria-label="Arquivo de backup (.json)"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
          }}
        />

        {stage.kind === "idle" && (
          <>
            <ul className="grid gap-2.5 text-sm sm:grid-cols-3">
              {[
                [ShieldCheck, "Nada é apagado", "O que foi cadastrado depois do backup continua."],
                [Info, "Você confere antes", "Mostra o que volta, com nome, antes de gravar."],
                [Undo2, "Dá para voltar atrás", "Antes de gravar, baixa uma cópia de agora."],
              ].map(([Icon, title, text]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <li key={title as string} className="flex gap-2.5 rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                    <I className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                    <span>
                      <span className="block font-semibold text-foreground">{title as string}</span>
                      <span className="block text-xs text-muted-foreground">{text as string}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="border-amber-300 text-amber-900 hover:bg-amber-50"
              onClick={() => inputRef.current?.click()}
            >
              <FileUp className="mr-2 h-4 w-4" aria-hidden />
              Escolher arquivo de backup (.json)
            </Button>
          </>
        )}

        {stage.kind === "reading" && <ProgressBar pct={stage.pct} label={stage.label} />}

        {plan && source && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
            <IconChip icon={FileJson} tone="amber" />
            <div className="min-w-[12rem] flex-1">
              <p className="text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{source.name}</p>
              <p className="text-xs text-muted-foreground">
                Backup de {formatWhen(source.backup.criadoEm)} · {plural(backupTotal, "registro", "registros")}
              </p>
            </div>
            {stage.kind !== "running" && (
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Trocar arquivo
              </Button>
            )}
          </div>
        )}

        {plan?.originRewrittenFrom && (
          <p className={cn("flex items-start gap-2 rounded-xl border px-3 py-2 text-sm", TONES.sky.card)}>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" aria-hidden />
            Backup de outro banco de dados: os links das assinaturas e anexos foram ajustados para este.
          </p>
        )}

        {stage.kind === "plan" && relevant.length === 0 && (
          <div className={cn("flex items-start gap-3 rounded-xl border p-3", TONES.emerald.card)}>
            <IconChip icon={CheckCircle2} tone="emerald" />
            <div>
              <p className="font-semibold text-foreground">Nada para restaurar</p>
              <p className="text-sm text-muted-foreground">
                Os dados de agora já têm tudo o que está neste backup.
                {onlyNowTotal > 0 && ` ${plural(onlyNowTotal, "registro foi cadastrado", "registros foram cadastrados")} depois dele.`}
              </p>
            </div>
          </div>
        )}

        {stage.kind === "plan" && relevant.length > 0 && (
          <>
            {hasChanged && (
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as RestoreMode)} className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["missing", "Recuperar só o que foi apagado", "Registros alterados depois do backup ficam como estão agora.", true],
                    ["overwrite", "Recuperar e desfazer alterações", "Registros alterados voltam a ficar como no backup.", false],
                  ] as const
                ).map(([value, title, text, recommended]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors",
                      mode === value ? "border-amber-400 bg-amber-50/60 ring-1 ring-amber-300" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <RadioGroupItem value={value} className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5 font-semibold text-foreground">
                        {title}
                        {recommended && (
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset", TONES.emerald.badge)}>
                            Recomendado
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground">{text}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            )}

            <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border">
              {relevant.map((p) => {
                const count = rowsToWrite(p, mode).length;
                const checked = !excluded.has(p.table.table) && count > 0;
                const id = `restore-${p.table.table}`;
                return (
                  <li key={p.table.table} className={cn("flex items-start gap-3 px-3 py-2.5", !checked && "bg-muted/20")}>
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={count === 0}
                      onCheckedChange={(v) => toggle(p.table.table, v === true)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <label htmlFor={id} className={cn("font-semibold", count > 0 ? "cursor-pointer text-foreground" : "text-muted-foreground")}>
                          {p.table.label}
                        </label>
                        {p.missing.length > 0 && (
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONES.amber.badge)}>
                            <Trash2 className="h-3 w-3" aria-hidden />
                            {plural(p.missing.length, "apagado", "apagados")}
                          </span>
                        )}
                        {p.changed.length > 0 && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                              mode === "overwrite" ? TONES.sky.badge : "bg-muted text-muted-foreground ring-border"
                            )}
                          >
                            <PenLine className="h-3 w-3" aria-hidden />
                            {plural(p.changed.length, "alterado", "alterados")}
                            {mode === "missing" && " · fica como está"}
                          </span>
                        )}
                      </div>
                      {p.unavailable ? (
                        <p className="mt-0.5 text-xs font-medium text-rose-700">{p.unavailable}</p>
                      ) : count > 0 ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{previewNames(p)}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {totalToWrite > 0 ? (
                  <>
                    Vai gravar <span className="font-semibold text-foreground">{plural(totalToWrite, "registro", "registros")}</span> em{" "}
                    {plural(selected.length, "tabela", "tabelas")}.
                  </>
                ) : (
                  "Marque ao menos uma tabela."
                )}
                {onlyNowTotal > 0 && ` O que foi cadastrado depois do backup (${plural(onlyNowTotal, "registro", "registros")}) continua.`}
              </p>
              <Button
                type="button"
                disabled={totalToWrite === 0}
                onClick={() => setConfirmOpen(true)}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden />
                Restaurar
              </Button>
            </div>
          </>
        )}

        {stage.kind === "running" && <ProgressBar pct={stage.pct} label={stage.label} />}

        {stage.kind === "done" && (
          <RestoreResultView
            result={stage.result}
            safetyFile={stage.safetyFile}
            onCompareAgain={() => {
              if (!source) return;
              void compare(source.backup)
                .then((next) => setStage({ kind: "plan", plan: next }))
                .catch(() => {
                  toast.error("Não foi possível comparar de novo.");
                  reset();
                });
            }}
            onClose={reset}
          />
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar {plural(totalToWrite, "registro", "registros")}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <ul className="space-y-1">
                  {selected.map((p) => (
                    <li key={p.table.table} className="flex justify-between gap-3">
                      <span className="min-w-0 text-foreground">{p.table.label}</span>
                      <span className="shrink-0 font-semibold tabular-nums text-foreground">{rowsToWrite(p, mode).length}</span>
                    </li>
                  ))}
                </ul>
                <ol className="list-decimal space-y-1 rounded-xl border border-border bg-muted/30 py-2 pl-7 pr-3">
                  <li>Primeiro baixo uma cópia de agora — guarde até conferir que está tudo certo.</li>
                  <li>Depois gravo os registros. Nada é apagado.</li>
                </ol>
                {mode === "overwrite" && (
                  <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-medium text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    Os registros alterados voltam a ficar como no backup — o que foi mudado neles depois se perde (fica só na cópia).
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-600 text-white hover:bg-amber-700" onClick={() => void run()}>
              Baixar cópia e restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}

function RestoreResultView({
  result,
  safetyFile,
  onCompareAgain,
  onClose,
}: {
  result: RestoreResult;
  safetyFile: string;
  onCompareAgain: () => void;
  onClose: () => void;
}) {
  const failed = result.tables.reduce((s, t) => s + t.failed, 0) + result.files.failed;
  const written = result.tables.reduce((s, t) => s + t.written, 0);
  const ok = failed === 0;
  const { restored, existing } = result.files;
  return (
    <div className="space-y-3">
      <div className={cn("flex items-start gap-3 rounded-xl border p-3", ok ? TONES.emerald.card : TONES.amber.card)}>
        <IconChip icon={ok ? CheckCircle2 : AlertTriangle} tone={ok ? "emerald" : "amber"} />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">
            {ok ? "Restauração concluída" : "Restaurado com avisos"} — {plural(written, "registro gravado", "registros gravados")}
          </p>
          <p className="break-all text-sm text-muted-foreground">
            Cópia de antes da restauração baixada: <span className="font-medium text-foreground">{safetyFile}</span>
          </p>
        </div>
      </div>

      <ul className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border text-sm">
        {result.tables.map((t) => (
          <li key={t.table.table} className="px-3 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium text-foreground">{t.table.label}</span>
              <span className="flex flex-wrap gap-2 text-xs font-semibold">
                {t.written > 0 && <span className="text-emerald-700">{plural(t.written, "gravado", "gravados")}</span>}
                {t.failed > 0 && <span className="text-rose-700">{plural(t.failed, "falhou", "falharam")}</span>}
              </span>
            </div>
            {t.errors.slice(0, 2).map((msg) => (
              <p key={msg} className="mt-0.5 text-xs text-rose-700" title={msg}>
                {friendlyRestoreError(msg)}
              </p>
            ))}
            {t.droppedColumns.length > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Campos que não existem mais no sistema ficaram de fora: {t.droppedColumns.join(", ")}.
              </p>
            )}
          </li>
        ))}
        <li className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
          <span className="font-medium text-foreground">Assinaturas e anexos</span>
          <span className="flex flex-wrap gap-2 text-xs font-semibold">
            {restored > 0 && <span className="text-emerald-700">{plural(restored, "reenviado", "reenviados")}</span>}
            {existing > 0 && <span className="text-muted-foreground">{plural(existing, "já estava lá", "já estavam lá")}</span>}
            {result.files.failed > 0 && <span className="text-rose-700">{plural(result.files.failed, "falhou", "falharam")}</span>}
            {restored + existing + result.files.failed === 0 && <span className="text-muted-foreground">nenhum no backup</span>}
          </span>
        </li>
      </ul>

      {result.needsSequenceFix && (
        <div className={cn("space-y-2 rounded-xl border p-3 text-sm", TONES.amber.card)}>
          <p className="font-semibold text-amber-900">Banco novo: acerte a numeração automática</p>
          <p className="text-amber-900/80">
            Rode este comando no SQL Editor do Supabase para que o próximo prontuário e o próximo documento não repitam números já usados.
          </p>
          <pre className="overflow-x-auto rounded-lg bg-white/80 p-2 text-[11px] leading-relaxed text-foreground ring-1 ring-amber-200">{SEQUENCE_FIX_SQL}</pre>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Sem HTTPS (acesso pelo IP da rede) o navegador não libera a área de transferência.
              if (!navigator.clipboard) {
                toast.error("Não deu para copiar aqui — selecione o texto e copie.");
                return;
              }
              void navigator.clipboard
                .writeText(SEQUENCE_FIX_SQL)
                .then(() => toast.success("Comando copiado."))
                .catch(() => toast.error("Não deu para copiar — selecione o texto."));
            }}
          >
            <Copy className="mr-2 h-3.5 w-3.5" aria-hidden />
            Copiar comando
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCompareAgain}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Comparar de novo
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Concluir
        </Button>
      </div>
    </div>
  );
}
