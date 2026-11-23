import React from "react";
import { KeyRound, Loader2, Lock, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import { IconChip } from "@/components/finance/FinanceUI";
import { ReminderForm } from "@/components/agenda-particular/ReminderForm";
import { ReminderList } from "@/components/agenda-particular/ReminderList";
import { PrivateSettings } from "@/components/agenda-particular/PrivateSettings";
import { getSession } from "@/lib/authApi";
import type { PrivateData, PrivateReminder } from "@/lib/agendaParticular";
import {
  PrivateAgendaError,
  deleteReminder,
  loadPrivateAgenda,
  sendTest,
  setReminderActive,
  type Creds,
} from "@/lib/agendaParticularApi";
import { getTodayLocalISO } from "@/lib/utils";

/**
 * Agenda particular (/agenda-particular): lembretes pessoais pelo Pushover.
 * A primeira coisa é o login com usuário e senha do VetFlow — conferidos no
 * banco a cada ação; a senha fica só na memória desta aba (recarregou, pede de
 * novo). Só o dono da agenda (o primeiro que entrou) consegue abrir.
 */
const PrivateAgendaPage: React.FC = () => {
  const [username, setUsername] = React.useState(() => getSession()?.username ?? "");
  const [password, setPassword] = React.useState("");
  const [creds, setCreds] = React.useState<Creds | null>(null);
  const [data, setData] = React.useState<PrivateData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<PrivateReminder | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [toDelete, setToDelete] = React.useState<PrivateReminder | null>(null);
  const formRef = React.useRef<HTMLElement>(null);
  const todayISO = getTodayLocalISO();

  React.useEffect(() => {
    const prev = document.title;
    document.title = "Agenda particular";
    return () => {
      document.title = prev;
    };
  }, []);

  const signOut = React.useCallback(() => {
    setCreds(null);
    setData(null);
    setPassword("");
    setEditing(null);
  }, []);

  const load = React.useCallback(
    async (c: Creds) => {
      setLoading(true);
      setError(null);
      try {
        setData(await loadPrivateAgenda(c));
        setCreds(c);
        setPassword("");
      } catch (e) {
        if (e instanceof PrivateAgendaError && (e.kind === "auth" || e.kind === "owner")) signOut();
        setError(e instanceof Error ? e.message : "Não deu para abrir a agenda.");
      } finally {
        setLoading(false);
      }
    },
    [signOut]
  );

  const refresh = React.useCallback(() => (creds ? load(creds) : Promise.resolve()), [creds, load]);

  const act = async (r: PrivateReminder, fn: () => Promise<unknown>, ok: string, reload = true) => {
    setBusyId(r.id);
    try {
      await fn();
      toast.success(ok);
      if (reload) await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Algo deu errado.");
    } finally {
      setBusyId(null);
    }
  };

  // ------------------------------------------------------------------ login
  if (!creds || !data) {
    return (
      <div className="flex vf-viewport-min-h items-center justify-center bg-muted/40 p-3 sm:p-4">
        <Card className="w-full max-w-sm rounded-2xl border-border/80">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Lock className="h-6 w-6 text-slate-700" />
            </div>
            <CardTitle className="text-lg">Agenda particular</CardTitle>
            <p className="text-sm text-muted-foreground">Entre com o seu usuário e senha do VetFlow.</p>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!username.trim() || !password) {
                  setError("Informe usuário e senha.");
                  return;
                }
                void load({ username: username.trim(), password });
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="pa-user">Usuário</Label>
                <Input
                  id="pa-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoFocus={!username}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pa-pass">Senha</Label>
                <Input
                  id="pa-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  autoFocus={!!username}
                />
              </div>
              {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p> : null}
              <Button type="submit" className="w-full bg-slate-800 text-white hover:bg-slate-900" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ----------------------------------------------------------------- agenda
  return (
    <div className="vf-viewport-min-h bg-muted/40 px-3 pb-24 pt-3 sm:p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-sm">
          <div className="flex min-w-0 items-center gap-3">
            <IconChip icon={Lock} tone="slate" />
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight">Agenda particular</h1>
              <p className="truncate text-xs text-muted-foreground">
                de <span className="font-semibold text-foreground">{data.dono}</span> · lembretes pelo Pushover
                {data.config.tokenParticular ? " (pasta PARTICULAR)" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading} title="Atualizar">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              <span className="ml-1.5 hidden sm:inline">Atualizar</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground" title="Sair">
              <LogOut className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:inline">Sair</span>
            </Button>
          </div>
        </header>

        {!data.config.pushoverOk ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            O Pushover ainda não está configurado no banco — os lembretes ficam salvos, mas não chegam até ele ser ligado.
          </p>
        ) : null}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <ReminderList
            reminders={data.lembretes}
            todayISO={todayISO}
            busyId={busyId}
            onNew={() => {
              setEditing(null);
              formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onEdit={(r) => {
              setEditing(r);
              formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onToggle={(r, ativo) =>
              void act(r, () => setReminderActive(creds, r.id, ativo), ativo ? "Lembrete ligado." : "Lembrete desligado.")
            }
            onTest={(r) => void act(r, () => sendTest(creds, r.id), "Teste enviado. Confira no celular.", false)}
            onDelete={(r) => setToDelete(r)}
          />
          <div className="space-y-4">
            <ReminderForm
              sectionRef={formRef}
              creds={creds}
              defaultHour={data.config.horaPadrao}
              editing={editing}
              onSaved={() => {
                setEditing(null);
                void refresh();
              }}
              onCancelEdit={() => setEditing(null)}
            />
            <PrivateSettings creds={creds} config={data.config} onChanged={() => void refresh()} />
          </div>
        </div>
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar este lembrete?</AlertDialogTitle>
            <AlertDialogDescription>
              “{toDelete?.texto}” deixa de avisar e some da lista. Para só parar por um tempo, use o botão de desligar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => {
                const r = toDelete;
                setToDelete(null);
                if (r) void act(r, () => deleteReminder(creds, r.id), "Lembrete apagado.");
                if (r && editing?.id === r.id) setEditing(null);
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PrivateAgendaPage;
